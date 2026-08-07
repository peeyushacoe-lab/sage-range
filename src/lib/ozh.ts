/**
 * Operation Zero Hour service.
 *
 * All rules live in src/lib/ozh-engine.ts and all content in
 * src/content/ozh-*.ts; this file loads, grades and persists. The separation
 * matters for one reason above all: grading happens here, server-side, against
 * a key derived from the user id. Nothing the client sends is trusted beyond
 * the selections themselves.
 *
 * Three invariants this file exists to hold:
 *
 *   1. One attempt. Enforced by a unique constraint on (userId, slug), so a
 *      concurrent double-start fails at the database rather than racing.
 *   2. Phases lock on submission. Enforced by a unique constraint on
 *      (runId, phase).
 *   3. Time is checked server-side on every write. A client with a frozen
 *      clock cannot submit after the deadline.
 */

import { db } from "@/lib/db";
import { buildAnswerKey, buildPhasePayload, OZH_SLUG } from "@/content/ozh-scenario";
import {
  PHASE_ORDER,
  PHASE_POINTS,
  MAX_SCORE,
  OZH_OPENS_AT,
  OZH_CLOSES_AT,
  effectiveDeadline,
  secondsRemaining,
  windowStateAt,
  gradeTriage,
  gradeFindings,
  gradeHunt,
  gradeReconstruction,
  gradeResponse,
  gradeReport,
  totalRun,
  rankRuns,
  decideAwards,
  ozhCertCode,
  type OzhPhase,
  type PhaseScore,
  type TriageAnswer,
  type FindingAnswer,
  type HuntAnswer,
  type ReconAnswer,
  type ReportAnswer,
} from "@/lib/ozh-engine";

export type OzhResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): OzhResult<never> => ({
  success: false,
  error,
  statusCode,
});

/** Anything a phase route might receive. Narrowed per phase before grading. */
export type PhaseAnswer =
  | { phase: "TRIAGE"; answers: TriageAnswer[] }
  | { phase: "INVESTIGATION"; answers: FindingAnswer[] }
  | { phase: "HUNT"; answers: HuntAnswer[] }
  | { phase: "RECONSTRUCTION"; answer: ReconAnswer }
  | { phase: "RESPONSE"; selected: string[] }
  | { phase: "REPORT"; answer: ReportAnswer };

// ── Run lifecycle ───────────────────────────────────────────────────────────

/**
 * Start the operation.
 *
 * Refuses outside the competition window, and refuses a second attempt. A run
 * that already exists is returned rather than recreated, so a refreshed
 * browser resumes instead of burning the single attempt.
 */
export async function startRun(userId: string, now: Date = new Date()) {
  const state = windowStateAt(now);
  if (state === "BEFORE") {
    return fail("Operation Zero Hour has not opened yet", 409);
  }
  if (state === "CLOSED") {
    return fail("Operation Zero Hour has closed", 409);
  }

  const existing = await db.ozhRun.findUnique({
    where: { userId_slug: { userId, slug: OZH_SLUG } },
    select: { id: true, status: true },
  });
  if (existing) {
    return {
      success: true as const,
      data: { runId: existing.id, resumed: true, status: existing.status },
    };
  }

  try {
    const run = await db.ozhRun.create({
      data: { userId, slug: OZH_SLUG, startedAt: now },
      select: { id: true, status: true },
    });
    await log(run.id, "RUN_STARTED", null, null);
    return { success: true as const, data: { runId: run.id, resumed: false, status: run.status } };
  } catch {
    // Lost a race against a concurrent start; the other one won, so use it.
    const raced = await db.ozhRun.findUnique({
      where: { userId_slug: { userId, slug: OZH_SLUG } },
      select: { id: true, status: true },
    });
    if (raced) {
      return {
        success: true as const,
        data: { runId: raced.id, resumed: true, status: raced.status },
      };
    }
    return fail("Could not start the operation", 500);
  }
}

/** Append to the audit trail. Rule 5: every action is logged. */
async function log(runId: string, action: string, phase: OzhPhase | null, detail: unknown) {
  await db.ozhActionLog.create({
    data: {
      runId,
      action,
      phase: phase ?? undefined,
      detail: (detail ?? undefined) as never,
    },
  });
}

export async function logEvidenceView(
  runId: string,
  userId: string,
  phase: OzhPhase,
  recordId: string,
) {
  const run = await db.ozhRun.findFirst({ where: { id: runId, userId }, select: { id: true } });
  if (!run) return;
  await log(runId, "EVIDENCE_VIEWED", phase, { recordId });
}

/**
 * Load a run with everything the console needs to render.
 *
 * Returns the phase the intern is on, how long they have, and which phases are
 * already locked — but never a score for a phase still in progress.
 */
export async function getRunState(userId: string, now: Date = new Date()) {
  const run = await db.ozhRun.findUnique({
    where: { userId_slug: { userId, slug: OZH_SLUG } },
    include: {
      submissions: {
        select: { phase: true, points: true, maxPoints: true, submittedAt: true },
        orderBy: { submittedAt: "asc" },
      },
    },
  });
  if (!run) return null;

  const submitted = new Set(run.submissions.map((s) => s.phase as OzhPhase));
  const currentPhase = PHASE_ORDER.find((p) => !submitted.has(p)) ?? null;
  const remaining = secondsRemaining(run.startedAt, now);

  return {
    runId: run.id,
    status: run.status,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    deadline: effectiveDeadline(run.startedAt),
    secondsRemaining: remaining,
    expired: remaining === 0 && run.status === "IN_PROGRESS",
    currentPhase,
    // Points per submitted phase only. A phase not yet submitted has no score
    // to leak.
    completedPhases: run.submissions.map((s) => ({
      phase: s.phase as OzhPhase,
      points: s.points,
      maxPoints: s.maxPoints,
    })),
    runningScore: run.submissions.reduce((sum, s) => sum + s.points, 0),
    score: run.score,
    accuracy: run.accuracy,
  };
}

/** Phase content, gated on the run being live and the phase being reachable. */
export async function getPhase(
  userId: string,
  phase: OzhPhase,
  now: Date = new Date(),
): Promise<OzhResult<ReturnType<typeof buildPhasePayload>>> {
  const state = await getRunState(userId, now);
  if (!state) return fail("No run in progress", 404);
  if (state.status !== "IN_PROGRESS") return fail("This operation has been submitted", 409);
  if (state.secondsRemaining === 0) return fail("Time has expired", 409);

  const index = PHASE_ORDER.indexOf(phase);
  const currentIndex = state.currentPhase ? PHASE_ORDER.indexOf(state.currentPhase) : PHASE_ORDER.length;
  if (index > currentIndex) return fail("That phase has not unlocked yet", 403);
  if (index < currentIndex) return fail("That phase is already submitted and locked", 409);

  await log(state.runId, "PHASE_OPENED", phase, null);
  return { success: true, data: buildPhasePayload(userId, phase) };
}

// ── Grading ─────────────────────────────────────────────────────────────────

/** Dispatch one phase's answer to its grader. Pure apart from the key lookup. */
function gradePhase(userId: string, submission: PhaseAnswer): PhaseScore {
  const key = buildAnswerKey(userId);
  switch (submission.phase) {
    case "TRIAGE":
      return gradeTriage(submission.answers, key.TRIAGE);
    case "INVESTIGATION":
      return gradeFindings(submission.answers, key.INVESTIGATION, "INVESTIGATION");
    case "HUNT":
      return gradeHunt(submission.answers, key.HUNT);
    case "RECONSTRUCTION":
      return gradeReconstruction(submission.answer, key.RECONSTRUCTION);
    case "RESPONSE":
      return gradeResponse(submission.selected, key.RESPONSE);
    case "REPORT":
      return gradeReport(submission.answer, key.REPORT);
  }
}

/**
 * Submit and lock a phase.
 *
 * The score is computed here and stored, but nothing about it is returned
 * while the run is live — see the return value. Handing back a per-phase score
 * mid-run would let an intern infer the key by resubmitting, which the phase
 * lock prevents anyway, but the weaker signal is worth closing too.
 */
export async function submitPhase(
  userId: string,
  submission: PhaseAnswer,
  now: Date = new Date(),
): Promise<OzhResult<{ nextPhase: OzhPhase | null; phasesRemaining: number }>> {
  const state = await getRunState(userId, now);
  if (!state) return fail("No run in progress", 404);
  if (state.status !== "IN_PROGRESS") return fail("This operation has been submitted", 409);

  if (state.secondsRemaining === 0) {
    await expireRun(state.runId, now);
    return fail("Time has expired — the operation has been closed and graded", 409);
  }
  if (state.currentPhase !== submission.phase) {
    return fail(
      state.currentPhase
        ? `Phase out of order — you are on ${state.currentPhase}`
        : "All phases are already submitted",
      409,
    );
  }

  const score = gradePhase(userId, submission);

  try {
    await db.ozhPhaseSubmission.create({
      data: {
        runId: state.runId,
        phase: submission.phase,
        answer: submission as never,
        points: score.points,
        maxPoints: score.maxPoints,
        correct: score.correct,
        total: score.total,
        submittedAt: now,
      },
    });
  } catch {
    return fail("That phase has already been submitted", 409);
  }

  await log(state.runId, "PHASE_SUBMITTED", submission.phase, null);

  const index = PHASE_ORDER.indexOf(submission.phase);
  const nextPhase = PHASE_ORDER[index + 1] ?? null;

  // The report is the last phase; submitting it finishes the operation.
  if (!nextPhase) await finishRun(userId, now);

  return {
    success: true,
    data: { nextPhase, phasesRemaining: PHASE_ORDER.length - index - 1 },
  };
}

/** Assemble the stored phase scores into a final result and freeze the run. */
async function concludeRun(runId: string, status: "SUBMITTED" | "EXPIRED", now: Date) {
  const run = await db.ozhRun.findUnique({
    where: { id: runId },
    include: { submissions: true },
  });
  if (!run || run.status !== "IN_PROGRESS") return null;

  const breakdown: PhaseScore[] = PHASE_ORDER.map((phase) => {
    const s = run.submissions.find((x) => x.phase === phase);
    return {
      phase,
      points: s?.points ?? 0,
      maxPoints: PHASE_POINTS[phase],
      correct: s?.correct ?? 0,
      // A phase never attempted contributes no denominator: accuracy measures
      // the quality of the decisions made, not the number skipped. Skipping is
      // punished by the score, which is the right place for it.
      total: s?.total ?? 0,
      missed: [],
    };
  });

  const totals = totalRun(breakdown);
  const phaseScores = Object.fromEntries(breakdown.map((b) => [b.phase, b.points]));

  // Cap elapsed at the effective deadline so an expired run cannot report a
  // completion time longer than the competition allowed.
  const end = now < effectiveDeadline(run.startedAt) ? now : effectiveDeadline(run.startedAt);
  const elapsedSeconds = Math.max(
    0,
    Math.round((end.getTime() - run.startedAt.getTime()) / 1000),
  );

  await db.ozhRun.update({
    where: { id: runId },
    data: {
      status,
      endedAt: end,
      elapsedSeconds,
      score: totals.score,
      accuracy: totals.accuracy,
      phaseScores: phaseScores as never,
    },
  });

  await log(runId, status === "SUBMITTED" ? "RUN_SUBMITTED" : "RUN_EXPIRED", null, {
    score: totals.score,
  });
  return totals;
}

export async function finishRun(userId: string, now: Date = new Date()) {
  const run = await db.ozhRun.findUnique({
    where: { userId_slug: { userId, slug: OZH_SLUG } },
    select: { id: true },
  });
  if (!run) return fail("No run in progress", 404);
  const totals = await concludeRun(run.id, "SUBMITTED", now);
  if (!totals) return fail("This operation has already been submitted", 409);
  return { success: true as const, data: { score: totals.score, accuracy: totals.accuracy } };
}

export async function expireRun(runId: string, now: Date = new Date()) {
  return concludeRun(runId, "EXPIRED", now);
}

/**
 * Close every run still open past its deadline.
 *
 * Called by the leaderboard and by the cron. Without it, a run abandoned in
 * Phase 2 would sit IN_PROGRESS forever and never appear on the board.
 */
export async function sweepExpiredRuns(now: Date = new Date()) {
  const open = await db.ozhRun.findMany({
    where: { slug: OZH_SLUG, status: "IN_PROGRESS" },
    select: { id: true, startedAt: true },
  });
  let closed = 0;
  for (const run of open) {
    if (now >= effectiveDeadline(run.startedAt)) {
      await expireRun(run.id, now);
      closed++;
    }
  }
  return closed;
}

// ── Results, leaderboard and awards ─────────────────────────────────────────

/**
 * The debrief.
 *
 * Only ever built for a finished run — the missed lists are derived from the
 * answer key, so returning this early would hand over the solutions.
 *
 * The `finished` discriminant is a separate boolean rather than a check on
 * `status`, because "IN_PROGRESS" is also a member of the finished branch's
 * status type and a caller narrowing on it would not have the fields it
 * expects.
 */
export async function getResult(userId: string) {
  const run = await db.ozhRun.findUnique({
    where: { userId_slug: { userId, slug: OZH_SLUG } },
    include: { submissions: true, awards: true },
  });
  if (!run) return null;
  if (run.status === "IN_PROGRESS") return { finished: false as const };

  const key = buildAnswerKey(userId);
  const breakdown: PhaseScore[] = PHASE_ORDER.map((phase) => {
    const s = run.submissions.find((x) => x.phase === phase);
    if (!s) {
      return {
        phase,
        points: 0,
        maxPoints: PHASE_POINTS[phase],
        correct: 0,
        total: 0,
        missed: ["Phase not attempted"],
      };
    }
    // Re-grade from the stored answer to recover the `missed` narrative, which
    // is too bulky to store and trivial to recompute.
    const regraded = gradePhase(userId, s.answer as unknown as PhaseAnswer);
    return { ...regraded, points: s.points };
  });

  const ranked = await getLeaderboard();
  const mine = ranked.find((r) => r.userId === userId);

  return {
    finished: true as const,
    status: run.status,
    score: run.score ?? 0,
    maxScore: MAX_SCORE,
    accuracy: run.accuracy ?? 0,
    elapsedSeconds: run.elapsedSeconds ?? 0,
    rank: mine?.rank ?? null,
    fieldSize: ranked.length,
    breakdown,
    awards: run.awards.map((a) => ({ kind: a.kind, certCode: a.certCode })),
    // Named so the debrief can say "the C2 was X" without the reader having to
    // cross-reference their own evidence set.
    evidence: key.evidence,
  };
}

export async function getLeaderboard(limit = 100, now: Date = new Date()) {
  await sweepExpiredRuns(now);

  const runs = await db.ozhRun.findMany({
    where: { slug: OZH_SLUG, status: { in: ["SUBMITTED", "EXPIRED"] }, user: { hidden: false } },
    include: { user: { select: { id: true, displayName: true, email: true, university: true } } },
  });

  const ranked = rankRuns(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
    })),
  );

  const byUser = new Map(runs.map((r) => [r.userId, r]));
  return ranked.slice(0, limit).map((r) => {
    const run = byUser.get(r.userId)!;
    return {
      ...r,
      // Never publish a full email address on a board an unauthenticated
      // visitor might reach.
      displayName: run.user.displayName || run.user.email.split("@")[0],
      university: run.user.university,
    };
  });
}

/**
 * Freeze ranks and issue the seven awards.
 *
 * Safe to run twice: awards are unique per (run, kind), and ranks are simply
 * rewritten. Intended to run once after the deadline passes.
 */
export async function concludeCompetition(now: Date = new Date()) {
  if (now < OZH_CLOSES_AT) {
    return fail("The competition has not closed yet", 409);
  }
  await sweepExpiredRuns(now);

  const runs = await db.ozhRun.findMany({
    where: { slug: OZH_SLUG, status: { in: ["SUBMITTED", "EXPIRED"] }, user: { hidden: false } },
    select: { id: true, userId: true, score: true, accuracy: true, elapsedSeconds: true, phaseScores: true },
  });
  if (runs.length === 0) return { success: true as const, data: { ranked: 0, awarded: 0 } };

  const ranked = rankRuns(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
    })),
  );
  const rankByUser = new Map(ranked.map((r) => [r.userId, r.rank]));

  for (const run of runs) {
    await db.ozhRun.update({
      where: { id: run.id },
      data: { rank: rankByUser.get(run.userId) ?? null },
    });
  }

  const zeroPhases = Object.fromEntries(PHASE_ORDER.map((p) => [p, 0])) as Record<OzhPhase, number>;
  const awards = decideAwards(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
      phaseScores: { ...zeroPhases, ...((r.phaseScores ?? {}) as Record<OzhPhase, number>) },
    })),
  );

  const runByUser = new Map(runs.map((r) => [r.userId, r]));
  let awarded = 0;
  for (const award of awards) {
    const run = runByUser.get(award.userId);
    if (!run) continue;
    const existing = await db.ozhAward.findUnique({
      where: { runId_kind: { runId: run.id, kind: award.kind } },
      select: { id: true },
    });
    if (existing) continue;
    await db.ozhAward.create({
      data: {
        runId: run.id,
        userId: award.userId,
        kind: award.kind,
        certCode: ozhCertCode(rankByUser.get(award.userId) ?? 1),
      },
    });
    awarded++;
  }

  return { success: true as const, data: { ranked: ranked.length, awarded } };
}

/** Public award lookup for the certificate page. */
export async function verifyOzhAward(certCode: string) {
  const award = await db.ozhAward.findUnique({
    where: { certCode },
    include: {
      user: { select: { displayName: true, email: true } },
      run: { select: { score: true, accuracy: true, rank: true } },
    },
  });
  if (!award) return null;
  return {
    certCode: award.certCode,
    holder: award.user.displayName || award.user.email.split("@")[0],
    kind: award.kind,
    score: award.run.score,
    accuracy: award.run.accuracy,
    rank: award.run.rank,
    issuedAt: award.issuedAt,
  };
}

export { OZH_SLUG, OZH_OPENS_AT, OZH_CLOSES_AT };
