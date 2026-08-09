/**
 * Backfill the Evidence spine from existing activity across every wired type.
 *
 * The spine is written going forward by the activity endpoints, but learners
 * already have history that predates it. This replays that history into
 * Evidence so a derived profile is not empty for anyone active before the spine
 * existed. Each source mirrors the award its endpoint gives live, so the
 * numbers reconcile.
 *
 * Idempotent: recordEvidence upserts on (userId, activity, sourceId), so
 * re-running updates rather than duplicates. Each source is guarded on its own
 * so one failing block cannot abort the rest.
 *
 * Usage: npx tsx --env-file-if-exists=.env scripts/backfill-evidence.ts
 */

import { PrismaClient } from "@prisma/client";
import { recordEvidence, labTacticsAndTechniques } from "../src/lib/evidence";

const db = new PrismaClient();

async function section(name: string, fn: () => Promise<number>) {
  try {
    const n = await fn();
    console.log(`  ${name.padEnd(22)} ${n}`);
  } catch (err) {
    console.log(`  ${name.padEnd(22)} FAILED — ${(err as Error).message}`);
  }
}

async function main() {
  console.log("\nBackfilling Evidence across all wired activities\n");

  await section("labs", async () => {
    const solved = await db.attempt.findMany({
      where: { status: "SOLVED" },
      include: { lab: { select: { slug: true, title: true, difficulty: true } } },
    });
    for (const a of solved) {
      const { tactics, techniques } = labTacticsAndTechniques(a.lab.slug);
      await recordEvidence({
        userId: a.userId, activity: "LAB", sourceId: a.id, result: "SOLVED",
        skillPoints: a.score, slug: a.lab.slug, title: a.lab.title,
        difficulty: a.lab.difficulty, score: a.score,
        attempts: a.wrongAttempts + 1, timeSec: a.timeTakenSec, tactics, techniques,
      });
    }
    return solved.length;
  });

  await section("incident tasks", async () => {
    const rows = await db.incidentSimProgress.findMany({
      include: { task: { select: { points: true, title: true } }, simulation: { select: { slug: true } } },
    });
    for (const p of rows) {
      await recordEvidence({
        userId: p.userId, activity: "INCIDENT", sourceId: p.id, result: "SOLVED",
        skillPoints: p.task.points, slug: p.simulation.slug, title: p.task.title,
        score: p.task.points, maxScore: p.task.points,
      });
    }
    return rows.length;
  });

  await section("incident reports", async () => {
    const rows = await db.incidentSimReport.findMany({ where: { submittedAt: { not: null } } });
    for (const r of rows) {
      await recordEvidence({
        userId: r.userId, activity: "INCIDENT", sourceId: r.id, result: "SOLVED",
        skillPoints: 250, title: "Incident report", score: 250, maxScore: 250,
      });
    }
    return rows.length;
  });

  await section("evidence boards", async () => {
    const rows = await db.incidentSimEvidenceBoard.findMany({ where: { completedAt: { not: null } } });
    for (const b of rows) {
      const boardScore = b.score ?? 0;
      await recordEvidence({
        userId: b.userId, activity: "INCIDENT", sourceId: b.id,
        result: (b.accuracyPct ?? 0) >= 50 ? "SOLVED" : "PARTIAL",
        skillPoints: Math.round(boardScore / 4), title: "Evidence board", score: boardScore, attempts: 1,
      });
    }
    return rows.length;
  });

  await section("detection (first pass)", async () => {
    const passed = await db.detectionSubmission.findMany({
      where: { passed: true },
      orderBy: { submittedAt: "asc" },
      include: { challenge: { select: { slug: true, title: true, difficulty: true, points: true } } },
    });
    // Only the first passing submission per (user, challenge) was ever awarded.
    const seen = new Set<string>();
    let n = 0;
    for (const s of passed) {
      const key = `${s.userId}:${s.challengeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      await recordEvidence({
        userId: s.userId, activity: "DETECTION", sourceId: s.id, result: "SOLVED",
        skillPoints: s.score, slug: s.challenge.slug, title: s.challenge.title,
        difficulty: s.challenge.difficulty, score: s.score, maxScore: s.challenge.points,
      });
      n++;
    }
    return n;
  });

  await section("purple team", async () => {
    const rows = await db.purpleTeamReplaySession.findMany({
      where: { completedAt: { not: null } },
      include: { replay: { select: { slug: true, title: true, points: true } } },
    });
    for (const s of rows) {
      await recordEvidence({
        userId: s.userId, activity: "PURPLE_TEAM", sourceId: s.id, result: "SOLVED",
        skillPoints: Math.round(s.bestF1 * s.replay.points), slug: s.replay.slug,
        title: s.replay.title, score: Math.round(s.bestF1 * s.replay.points), maxScore: s.replay.points,
      });
    }
    return rows.length;
  });

  await section("soc shift", async () => {
    const rows = await db.socShiftAttempt.findMany({ where: { completedAt: { not: null } } });
    for (const a of rows) {
      const shiftScore = a.score ?? 0;
      await recordEvidence({
        userId: a.userId, activity: "SOC_SHIFT", sourceId: a.id,
        result: (a.accuracyPct ?? 0) >= 50 ? "SOLVED" : "PARTIAL",
        skillPoints: shiftScore, title: "SOC Shift", score: shiftScore, attempts: 1,
      });
    }
    return rows.length;
  });

  await section("ozh (competition)", async () => {
    const rows = await db.ozhRun.findMany({ where: { status: "SUBMITTED", preview: false } });
    for (const r of rows) {
      await recordEvidence({
        userId: r.userId, activity: "COMPETITION", sourceId: r.id, result: "SOLVED",
        skillPoints: r.score ?? 0, slug: "operation-zero-hour", title: "Operation Zero Hour",
        score: r.score ?? 0, maxScore: 1000, timeSec: r.elapsedSeconds,
      });
    }
    return rows.length;
  });

  // Verify the labs invariant still holds — derived lab points equal live lab
  // scores. Non-lab activities intentionally now add profile the old scalar
  // never had, so only labs are expected to reconcile exactly.
  const sample = await db.attempt.groupBy({
    by: ["userId"], where: { status: "SOLVED" },
    _sum: { score: true }, orderBy: { _sum: { score: "desc" } }, take: 5,
  });
  console.log("\nLab parity check (derived lab points vs live lab score):");
  let ok = true;
  for (const u of sample) {
    const agg = await db.evidence.aggregate({
      where: { userId: u.userId, activity: "LAB" }, _sum: { skillPoints: true },
    });
    const live = u._sum.score ?? 0;
    const derived = agg._sum.skillPoints ?? 0;
    if (live !== derived) ok = false;
    console.log(`  ${u.userId.slice(0, 10)}…  live ${live}  derived ${derived}  ${live === derived ? "OK" : "MISMATCH"}`);
  }

  const total = await db.evidence.count();
  console.log(`\nTotal evidence rows: ${total}`);
  console.log(ok ? "Lab parity holds.\n" : "WARNING: lab parity mismatch.\n");

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err);
  await db.$disconnect();
  process.exit(1);
});
