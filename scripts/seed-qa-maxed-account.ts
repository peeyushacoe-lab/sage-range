// Gives one QA/internal account fully-completed progress across every feature
// (all labs solved, all learning paths + certificate, all academy courses,
// all simulations, all incident boss fights, all detection-lab challenges,
// all purple-team replays, all SOC shifts) so profile/certificates/resume/
// skill-radar/MITRE/achievements/badges can be QA'd end to end.
//
// The account stays invisible on every leaderboard, scoreboard, and the
// public activity feed via User.hidden = true — see the `hidden: false`
// filters added to src/app/leaderboard, /scoreboard, /soc-league,
// /soc-shift/[slug], /detection-lab/[slug], /competitions/[slug],
// /recruiter, /analytics/recruiter, and src/lib/activity-feed.ts. Its own
// profile page and certificates are unaffected — those are direct-view
// pages, not discovery surfaces.
//
// Idempotent — safe to re-run. Discovers all published content dynamically,
// so it stays correct as new labs/paths/courses/etc. get added.
//
// Run: npx tsx scripts/seed-qa-maxed-account.ts [email]
// Defaults to peeyush@cybersage.uk if no email is given.
//
// Known gaps (documented, not silently glossed over):
// - Daily Hunt attempts are date-locked bonus content, not read by any
//   achievement/badge/skill computation, so they're intentionally skipped.
// - Per-lab LabResponse stages assume the standard ["task_1","task_2","task_3"]
//   pattern used by the overwhelming majority of labs. A handful of labs with
//   non-standard stage names may not show every checklist item ticked inside
//   a Learning Path's detail page — but UserPathProgress.completedAt is set
//   directly regardless, so the path's overall "completed" state and the
//   certificate unlock are correct either way.
// - Simulation MITRE tactic coverage depends on rich in-engine event payloads
//   (STAGE_ADVANCE/STUDENT_ACTION/CONSEQUENCE) generated during real gameplay.
//   Seeded sessions include a representative event set, but full 14-tactic
//   MITRE coverage on /mitre may not be 100% without actually playing a
//   session or two.

import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const db = new PrismaClient();

const TARGET_EMAIL = process.argv[2] ?? "peeyush@cybersage.uk";

const DAY = 24 * 60 * 60 * 1000;

// Days 0-13 are individually anchored (one distinct calendar day each) to
// guarantee a 14-day activity streak per calcStreak() in
// src/lib/insights/achievements.ts. Everything past index 13 spreads across
// a 60-day trailing window instead of stacking on today, so historical solves
// look realistic rather than having hundreds of items dated "today".
function dateForIndex(i: number): Date {
  const daysAgo = i < 14 ? i : 14 + (i % 60);
  return new Date(Date.now() - daysAgo * DAY);
}

const FAST_THRESHOLDS: Record<string, number> = {
  EASY: 1800, MEDIUM: 3600, HARD: 7200, INSANE: 14400,
};

// Comfortably under every difficulty's skill-radar "fast solve" threshold,
// and specifically under 1800s for HARD so the speed-runner achievement
// (Hard lab solved in under 30 minutes) is satisfied by every Hard solve.
function fastTime(difficulty: string): number {
  const threshold = FAST_THRESHOLDS[difficulty] ?? 1800;
  return Math.round(threshold * 0.2);
}

function randCode(len = 6): string {
  return randomBytes(len).toString("hex").slice(0, len).toUpperCase();
}

const STANDARD_STAGES = ["task_1", "task_2", "task_3"];

async function main() {
  console.log(`Seeding maxed-out QA account: ${TARGET_EMAIL}`);

  const user = await db.user.upsert({
    where: { email: TARGET_EMAIL },
    update: { role: "STUDENT", hidden: true, skillScore: 5000, xp: 10000, coins: 5000 },
    create: {
      email: TARGET_EMAIL,
      displayName: "Peeyush (QA)",
      role: "STUDENT",
      hidden: true,
      skillScore: 5000,
      xp: 10000,
      coins: 5000,
    },
  });
  console.log(`  user: ${user.id} (hidden=true, role=STUDENT)`);

  // ── Labs ────────────────────────────────────────────────────────────────
  const labs = await db.lab.findMany({ where: { published: true } });
  for (let i = 0; i < labs.length; i++) {
    const lab = labs[i];
    const solvedAt = dateForIndex(i);
    const timeTakenSec = fastTime(lab.difficulty);
    const startedAt = new Date(solvedAt.getTime() - timeTakenSec * 1000);
    await db.attempt.upsert({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
      update: { status: "SOLVED", score: lab.points, startedAt, solvedAt, timeTakenSec, labVersion: lab.version },
      create: { userId: user.id, labId: lab.id, status: "SOLVED", score: lab.points, startedAt, solvedAt, timeTakenSec, labVersion: lab.version },
    });
    for (const stage of STANDARD_STAGES) {
      await db.labResponse.upsert({
        where: { userId_labId_stage: { userId: user.id, labId: lab.id, stage } },
        update: { response: "Completed via QA seed." },
        create: { userId: user.id, labId: lab.id, stage, response: "Completed via QA seed." },
      });
    }
  }
  console.log(`  labs: ${labs.length} solved`);

  // ── Learning Paths ──────────────────────────────────────────────────────
  const paths = await db.learningPath.findMany({ where: { published: true } });
  for (const path of paths) {
    await db.userPathProgress.upsert({
      where: { userId_pathId: { userId: user.id, pathId: path.id } },
      update: { completedAt: new Date() },
      create: { userId: user.id, pathId: path.id, startedAt: dateForIndex(20), completedAt: new Date() },
    });
  }
  console.log(`  paths: ${paths.length} completed`);

  // ── Simulations ─────────────────────────────────────────────────────────
  // No unique key on (userId, templateId, n) — idempotency is handled by only
  // topping up to SESSIONS_PER_TEMPLATE per template, not by matching rows.
  const templates = await db.scenarioTemplate.findMany({ where: { published: true } });
  const SESSIONS_PER_TEMPLATE = Math.max(4, Math.ceil(10 / Math.max(1, templates.length)));
  let simIndex = 0;
  for (const template of templates) {
    const existingCount = await db.simulationSession.count({
      where: { userId: user.id, templateId: template.id, status: { in: ["CONTAINED", "BREACHED"] } },
    });
    const toCreate = Math.max(0, SESSIONS_PER_TEMPLATE - existingCount);
    simIndex += existingCount;

    for (let n = 0; n < toCreate; n++) {
      const startedAt = dateForIndex(simIndex);
      const endedAt = new Date(startedAt.getTime() + 45 * 60 * 1000);
      const status = n % 2 === 0 ? "CONTAINED" : "BREACHED";
      const score = 100;
      const companyData = { name: "Seeded QA Corp", industry: template.industry, executives: [] };

      const session = await db.simulationSession.create({
        data: {
          userId: user.id,
          templateId: template.id,
          companyData,
          status,
          score,
          currentStage: "RESOLVED",
          startedAt,
          endedAt,
        },
      });

      await db.simulationEvent.createMany({
        data: [
          {
            sessionId: session.id,
            type: "SESSION_STARTED",
            actor: "SYSTEM",
            payload: { templateSlug: template.slug, initialStage: "NORMAL" },
            narrative: `Simulation initialized for ${companyData.name}.`,
            createdAt: startedAt,
          },
          {
            sessionId: session.id,
            type: "STUDENT_ACTION",
            actor: "STUDENT",
            payload: { actionId: "isolate_host", label: "Isolated affected host", scoreChange: 20, stealthChange: 0, stageBlocker: false },
            narrative: "Analyst isolated the affected host from the network.",
            createdAt: new Date(startedAt.getTime() + 5 * 60 * 1000),
          },
          {
            sessionId: session.id,
            type: "STAGE_ADVANCE",
            actor: "SYSTEM",
            payload: { from: "NORMAL", to: "RESOLVED" },
            narrative: "Incident resolved.",
            createdAt: endedAt,
          },
          {
            sessionId: session.id,
            type: "CONSEQUENCE",
            actor: "SYSTEM",
            payload: { outcome: status, scoreChange: score },
            narrative: `Simulation ended: ${status}.`,
            createdAt: endedAt,
          },
        ],
      });
      simIndex++;
    }
  }
  console.log(`  simulations: ${simIndex} sessions across ${templates.length} templates`);

  // ── IR Certification (needs >=3 qualifying sims + >=2 completed paths) ───
  const existingCert = await db.iRCertification.findUnique({ where: { userId: user.id } });
  if (!existingCert && simIndex >= 3 && paths.length >= 2) {
    let created = false;
    for (let attempt = 0; attempt < 5 && !created; attempt++) {
      try {
        await db.iRCertification.create({
          data: { userId: user.id, certId: `SR-${new Date().getFullYear()}-${randCode(5)}` },
        });
        created = true;
      } catch {
        // certId collision — retry with a new random suffix
      }
    }
    console.log(`  IR certification: ${created ? "issued" : "FAILED after 5 attempts"}`);
  } else {
    console.log(`  IR certification: ${existingCert ? "already issued" : "skipped (insufficient qualifying content)"}`);
  }

  // ── Academy ─────────────────────────────────────────────────────────────
  const courses = await db.academyCourse.findMany({
    where: { published: true },
    include: {
      modules: {
        where: { published: true },
        include: { lessons: { where: { published: true } }, quiz: { include: { questions: true } } },
      },
    },
  });
  let academyCertCount = 0;
  for (const course of courses) {
    await db.academyEnrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      update: { completedAt: new Date() },
      create: { userId: user.id, courseId: course.id, enrolledAt: dateForIndex(25), completedAt: new Date() },
    });

    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        await db.academyLessonProgress.upsert({
          where: { userId_lessonId: { userId: user.id, lessonId: lesson.id } },
          update: { completedAt: new Date() },
          create: { userId: user.id, lessonId: lesson.id, startedAt: dateForIndex(25), completedAt: new Date() },
        });
      }
      if (mod.quiz) {
        const existingAttempt = await db.academyQuizAttempt.findFirst({
          where: { userId: user.id, quizId: mod.quiz.id },
        });
        if (!existingAttempt) {
          const attempt = await db.academyQuizAttempt.create({
            data: { userId: user.id, quizId: mod.quiz.id, score: 100, passed: true },
          });
          for (const q of mod.quiz.questions) {
            await db.academyQuizAnswer.upsert({
              where: { attemptId_questionId: { attemptId: attempt.id, questionId: q.id } },
              update: { answer: q.correctAnswer as object },
              create: { attemptId: attempt.id, questionId: q.id, answer: q.correctAnswer as object },
            });
          }
        }
      }
    }

    const existingCert = await db.academyCertificate.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (!existingCert) {
      let created = false;
      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        try {
          await db.academyCertificate.create({
            data: { userId: user.id, courseId: course.id, certCode: `AC-${new Date().getFullYear()}-${randCode(6)}` },
          });
          created = true;
          academyCertCount++;
        } catch {
          // certCode collision — retry
        }
      }
    } else {
      academyCertCount++;
    }
  }
  console.log(`  academy: ${courses.length} courses completed, ${academyCertCount} certificates`);

  // ── Incident Simulations (Boss Fights) ─────────────────────────────────
  const incidents = await db.incidentSimulation.findMany({
    where: { published: true },
    include: { tasks: true },
  });
  for (const sim of incidents) {
    for (const task of sim.tasks) {
      await db.incidentSimProgress.upsert({
        where: { userId_taskId: { userId: user.id, taskId: task.id } },
        update: {},
        create: { userId: user.id, simulationId: sim.id, taskId: task.id, completedAt: new Date() },
      });
    }
    await db.incidentSimEvidenceBoard.upsert({
      where: { userId_simulationId: { userId: user.id, simulationId: sim.id } },
      update: { score: 100, accuracyPct: 100, completedAt: new Date() },
      create: {
        userId: user.id,
        simulationId: sim.id,
        categorization: {},
        timelineOrder: [],
        score: 100,
        accuracyPct: 100,
        completedAt: new Date(),
      },
    });
    await db.incidentSimReport.upsert({
      where: { userId_simulationId: { userId: user.id, simulationId: sim.id } },
      update: { submittedAt: new Date() },
      create: {
        userId: user.id,
        simulationId: sim.id,
        executiveSummary: "Seeded QA report.",
        incidentTimeline: "Seeded QA report.",
        technicalFindings: "Seeded QA report.",
        mitreMapping: "Seeded QA report.",
        indicatorsOfCompromise: "Seeded QA report.",
        businessImpact: "Seeded QA report.",
        containmentActions: "Seeded QA report.",
        recommendations: "Seeded QA report.",
        submittedAt: new Date(),
      },
    });
  }
  console.log(`  incident simulations: ${incidents.length} completed (tasks + evidence board + report)`);

  // ── Detection Lab ───────────────────────────────────────────────────────
  const challenges = await db.detectionChallenge.findMany({ where: { published: true } });
  for (const challenge of challenges) {
    const already = await db.detectionSubmission.findFirst({ where: { userId: user.id, challengeId: challenge.id, passed: true } });
    if (!already) {
      await db.detectionSubmission.create({
        data: {
          userId: user.id,
          challengeId: challenge.id,
          rule: { logic: "AND", conditions: [{ field: "isMalicious", operator: "equals", value: "true" }] },
          truePositives: 10, falsePositives: 0, falseNegatives: 0, trueNegatives: 10,
          precision: 1, recall: 1, f1: 1,
          score: challenge.points,
          passed: true,
        },
      });
    }
  }
  console.log(`  detection lab: ${challenges.length} challenges passed`);

  // ── Purple Team Replay ──────────────────────────────────────────────────
  const replays = await db.purpleTeamReplay.findMany({ where: { published: true } });
  for (const replay of replays) {
    const steps = Array.isArray(replay.steps) ? replay.steps.length : 1;
    await db.purpleTeamReplaySession.upsert({
      where: { userId_replayId: { userId: user.id, replayId: replay.id } },
      update: { currentStep: steps, bestF1: 1, completedAt: new Date() },
      create: { userId: user.id, replayId: replay.id, currentStep: steps, bestF1: 1, startedAt: dateForIndex(20), completedAt: new Date() },
    });
  }
  console.log(`  purple team replays: ${replays.length} completed`);

  // ── SOC Shift ───────────────────────────────────────────────────────────
  // No @@unique([userId, shiftId]) on SocShiftAttempt, so find-then-update/create.
  const shifts = await db.socShift.findMany({ where: { published: true }, include: { alerts: true } });
  for (const shift of shifts) {
    const existingAttempt = await db.socShiftAttempt.findFirst({ where: { userId: user.id, shiftId: shift.id } });
    const attempt = existingAttempt
      ? await db.socShiftAttempt.update({
          where: { id: existingAttempt.id },
          data: { completedAt: new Date(), score: shift.alerts.length * 10, accuracyPct: 100 },
        })
      : await db.socShiftAttempt.create({
          data: {
            userId: user.id,
            shiftId: shift.id,
            startedAt: dateForIndex(20),
            completedAt: new Date(),
            score: shift.alerts.length * 10,
            accuracyPct: 100,
          },
        });
    for (const alert of shift.alerts) {
      await db.shiftAlertTriage.upsert({
        where: { attemptId_alertId: { attemptId: attempt.id, alertId: alert.id } },
        update: { action: alert.correctAction, correct: true },
        create: { attemptId: attempt.id, alertId: alert.id, action: alert.correctAction, correct: true },
      });
    }
  }
  console.log(`  soc shifts: ${shifts.length} completed`);

  console.log("\nDone. This account is role=STUDENT, hidden=true — invisible on every leaderboard/scoreboard/feed, fully visible on its own profile.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
