import { db } from "@/lib/db";
import {
  analyseSkillGap,
  recommendPaths,
  type TacticRequirement,
  type TacticCoverage,
} from "@/lib/skill-gap";
import {
  gradeAssessment,
  isExpired,
  credentialCode,
  credentialExpiry,
  scoreInterview,
  type AssessmentQuestion,
} from "@/lib/assessment-grading";

export type CareerResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): CareerResult<never> => ({
  success: false,
  error,
  statusCode,
});

// ── Skill gap ──────────────────────────────────────────────────────────────

/**
 * Recompute a user's readiness for a role and persist the snapshot.
 *
 * Coverage is read from the portfolio's MITRE heatmap, which the Phase 2
 * aggregation job already maintains, so this stays a cheap read rather than
 * re-walking every solved item.
 */
export async function computeSkillGap(
  userId: string,
  roleSlug: string,
): Promise<CareerResult<{ readiness: number; gaps: string[]; recommended: string[] }>> {
  const role = await db.roleProfile.findUnique({ where: { slug: roleSlug } });
  if (!role || !role.published) return fail("Role profile not found", 404);

  const portfolio = await db.careerPortfolio.findUnique({
    where: { userId },
    include: { mitreCoverage: true },
  });

  const heatmap = (portfolio?.mitreCoverage?.heatmap ?? {}) as TacticCoverage;
  const required = (role.requiredTactics ?? {}) as TacticRequirement;

  const analysis = analyseSkillGap(required, heatmap);
  const recommended = recommendPaths(analysis, role.recommendedPathSlugs);

  await db.skillGapSnapshot.upsert({
    where: { userId_roleProfileId: { userId, roleProfileId: role.id } },
    create: {
      userId,
      roleProfileId: role.id,
      readiness: analysis.readiness,
      coverage: Object.fromEntries(
        analysis.coverage.map((c) => [c.tactic, { have: c.have, need: c.need }]),
      ),
      gaps: analysis.gaps.map((g) => g.tactic),
    },
    update: {
      readiness: analysis.readiness,
      coverage: Object.fromEntries(
        analysis.coverage.map((c) => [c.tactic, { have: c.have, need: c.need }]),
      ),
      gaps: analysis.gaps.map((g) => g.tactic),
      generatedAt: new Date(),
    },
  });

  return {
    success: true,
    data: {
      readiness: analysis.readiness,
      gaps: analysis.gaps.map((g) => g.tactic),
      recommended,
    },
  };
}

export async function listRoleProfiles() {
  return db.roleProfile.findMany({
    where: { published: true },
    orderBy: [{ seniority: "asc" }, { title: "asc" }],
  });
}

// ── Verified skill assessments ─────────────────────────────────────────────

export async function listSkillAssessments() {
  return db.skillAssessment.findMany({
    where: { published: true },
    orderBy: [{ domain: "asc" }, { difficulty: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      domain: true,
      difficulty: true,
      timeLimitSec: true,
      passingScore: true,
    },
  });
}

/**
 * Begin an attempt.
 *
 * Question answers are never returned to the client — only prompts and
 * options — so the correct answers cannot be read out of the network tab.
 */
export async function startAssessment(
  userId: string,
  slug: string,
): Promise<CareerResult<{ attemptId: string; questions: unknown[]; endsAt: Date }>> {
  const assessment = await db.skillAssessment.findUnique({ where: { slug } });
  if (!assessment || !assessment.published) return fail("Assessment not found", 404);

  const open = await db.skillAssessmentAttempt.findFirst({
    where: { userId, assessmentId: assessment.id, submittedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (open && !isExpired(open.startedAt, assessment.timeLimitSec)) {
    return fail("You already have an attempt in progress", 409);
  }

  const attempt = await db.skillAssessmentAttempt.create({
    data: { userId, assessmentId: assessment.id },
  });

  const raw = (assessment.questions ?? []) as Array<Record<string, unknown>>;
  const sanitised = raw.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    type: q.type,
    options: q.options,
  }));

  const endsAt = new Date(attempt.startedAt.getTime() + assessment.timeLimitSec * 1000);
  return { success: true, data: { attemptId: attempt.id, questions: sanitised, endsAt } };
}

/**
 * Submit and grade an attempt, issuing or refreshing a credential on a pass.
 *
 * An attempt submitted past its time limit is graded as zero rather than
 * rejected, so the record still shows what happened.
 */
export async function submitAssessment(params: {
  userId: string;
  attemptId: string;
  responses: Record<string, unknown>;
  proctorFlags?: Record<string, unknown>;
}): Promise<CareerResult<{ score: number; passed: boolean; credentialCode?: string }>> {
  const attempt = await db.skillAssessmentAttempt.findUnique({
    where: { id: params.attemptId },
    include: { assessment: true },
  });

  if (!attempt || attempt.userId !== params.userId) return fail("Attempt not found", 404);
  if (attempt.submittedAt) return fail("Attempt already submitted", 409);

  const { assessment } = attempt;
  const expired = isExpired(attempt.startedAt, assessment.timeLimitSec);

  const graded = expired
    ? { score: 0, passed: false }
    : gradeAssessment(
        (assessment.questions ?? []) as AssessmentQuestion[],
        params.responses,
        assessment.passingScore,
      );

  await db.skillAssessmentAttempt.update({
    where: { id: attempt.id },
    data: {
      submittedAt: new Date(),
      score: graded.score,
      passed: graded.passed,
      responses: params.responses as object,
      proctorFlags: (params.proctorFlags ?? {}) as object,
    },
  });

  if (!graded.passed) {
    return { success: true, data: { score: graded.score, passed: false } };
  }

  const issuedAt = new Date();
  const code = credentialCode(assessment.domain, issuedAt);

  const credential = await db.verifiedCredential.upsert({
    where: {
      userId_assessmentId: { userId: params.userId, assessmentId: assessment.id },
    },
    create: {
      userId: params.userId,
      assessmentId: assessment.id,
      code,
      score: graded.score,
      issuedAt,
      expiresAt: credentialExpiry(assessment.validityDays, issuedAt),
    },
    // Re-passing refreshes the existing credential and keeps its public code
    // stable, so a link already shared to a recruiter keeps working.
    update: {
      score: graded.score,
      status: "ACTIVE",
      issuedAt,
      expiresAt: credentialExpiry(assessment.validityDays, issuedAt),
      revokedAt: null,
      revokedReason: null,
    },
  });

  return {
    success: true,
    data: { score: graded.score, passed: true, credentialCode: credential.code },
  };
}

/** Public credential lookup for the verify page. */
export async function verifyCredential(code: string) {
  const credential = await db.verifiedCredential.findUnique({
    where: { code },
    include: {
      user: { select: { displayName: true, email: true } },
      assessment: { select: { title: true, domain: true, difficulty: true } },
    },
  });
  if (!credential) return null;

  const expired =
    credential.expiresAt !== null && credential.expiresAt <= new Date();

  return {
    code: credential.code,
    holder: credential.user.displayName || credential.user.email,
    assessment: credential.assessment.title,
    domain: credential.assessment.domain,
    difficulty: credential.assessment.difficulty,
    score: credential.score,
    issuedAt: credential.issuedAt,
    expiresAt: credential.expiresAt,
    // A stored REVOKED beats an expiry check; otherwise expiry decides.
    status:
      credential.status === "REVOKED" ? "REVOKED" : expired ? "EXPIRED" : "ACTIVE",
  };
}

// ── Mock interviews ────────────────────────────────────────────────────────

export async function listInterviewKits() {
  return db.interviewKit.findMany({
    where: { published: true },
    orderBy: [{ seniority: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      seniority: true,
      difficulty: true,
      timeLimitSec: true,
    },
  });
}

/** Start a mock interview. Ideal answers stay server-side. */
export async function startInterview(
  userId: string,
  slug: string,
): Promise<CareerResult<{ sessionId: string; questions: unknown[]; endsAt: Date }>> {
  const kit = await db.interviewKit.findUnique({ where: { slug } });
  if (!kit || !kit.published) return fail("Interview kit not found", 404);

  const session = await db.interviewSession.create({
    data: { userId, kitId: kit.id },
  });

  const raw = (kit.questions ?? []) as Array<Record<string, unknown>>;
  const prompts = raw.map((q) => ({ id: q.id, prompt: q.prompt, weight: q.weight }));

  const endsAt = new Date(session.startedAt.getTime() + kit.timeLimitSec * 1000);
  return { success: true, data: { sessionId: session.id, questions: prompts, endsAt } };
}

/**
 * Submit interview answers.
 *
 * Answers are stored unscored: free-text responses need a reviewer, so the
 * session lands in SUBMITTED rather than claiming a score it cannot justify.
 */
export async function submitInterview(params: {
  userId: string;
  sessionId: string;
  answers: Record<string, string>;
}): Promise<CareerResult<{ status: string; answered: number }>> {
  const session = await db.interviewSession.findUnique({
    where: { id: params.sessionId },
    include: { kit: true },
  });

  if (!session || session.userId !== params.userId) return fail("Session not found", 404);
  if (session.status !== "IN_PROGRESS") return fail("Session already submitted", 409);

  const entries = Object.entries(params.answers).filter(([, v]) => v?.trim());

  await db.$transaction([
    ...entries.map(([questionId, answer]) =>
      db.interviewAnswer.upsert({
        where: { sessionId_questionId: { sessionId: session.id, questionId } },
        create: { sessionId: session.id, questionId, answer: answer.trim() },
        update: { answer: answer.trim() },
      }),
    ),
    db.interviewSession.update({
      where: { id: session.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    }),
  ]);

  return { success: true, data: { status: "SUBMITTED", answered: entries.length } };
}

/** Apply reviewer scores and finalise the session score. */
export async function scoreInterviewSession(params: {
  sessionId: string;
  answerScores: Record<string, number>;
  feedback?: string;
}): Promise<CareerResult<{ score: number }>> {
  const session = await db.interviewSession.findUnique({
    where: { id: params.sessionId },
    include: { kit: true },
  });
  if (!session) return fail("Session not found", 404);

  const questions = ((session.kit.questions ?? []) as Array<{ id: string; weight?: number }>);
  const total = scoreInterview(questions, params.answerScores);

  await db.$transaction([
    ...Object.entries(params.answerScores).map(([questionId, score]) =>
      db.interviewAnswer.updateMany({
        where: { sessionId: session.id, questionId },
        data: { score },
      }),
    ),
    db.interviewSession.update({
      where: { id: session.id },
      data: { status: "SCORED", score: total, feedback: params.feedback?.trim() || null },
    }),
  ]);

  return { success: true, data: { score: total } };
}
