/**
 * Event Replay Validator
 *
 * Fetches every completed simulation session, replays its events through
 * buildWorldState, and compares the recomputed score/status against what
 * is stored in the database. Any divergence is replay drift — a sign that
 * the stored state and the event log have fallen out of sync.
 *
 * Usage:
 *   npx tsx scripts/validate-replay.ts
 *
 * Exit code 0 = all sessions pass. Exit code 1 = drift detected.
 */

import { PrismaClient } from "@prisma/client";
import { buildWorldState } from "@/lib/simulation/engine";

const db = new PrismaClient();

type DriftReport = {
  sessionId: string;
  userId: string;
  templateSlug: string;
  completedAt: Date | null;
  stored: { score: number; status: string };
  recomputed: { score: number; status: string };
};

async function main() {
  const sessions = await db.simulationSession.findMany({
    where: { status: { in: ["CONTAINED", "BREACHED"] } },
    include: {
      template: { select: { slug: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { startedAt: "desc" },
  });

  console.log(`\nReplay Validator — ${sessions.length} completed sessions\n`);

  if (sessions.length === 0) {
    console.log("No completed sessions found. Run some simulations first.");
    await db.$disconnect();
    return;
  }

  const drift: DriftReport[] = [];
  let passed = 0;

  for (const session of sessions) {
    const worldState = buildWorldState(session.events);

    const scoreDrift = session.score !== worldState.score;
    // worldState.status values: "ACTIVE" | "CONTAINED" | "BREACHED"
    // session.status is the Prisma enum — compare as strings
    const statusDrift = session.status !== (worldState.status as string);

    if (scoreDrift || statusDrift) {
      drift.push({
        sessionId: session.id,
        userId: session.userId,
        templateSlug: session.template.slug,
        completedAt: session.endedAt,
        stored: { score: session.score, status: session.status },
        recomputed: { score: worldState.score, status: worldState.status },
      });
    } else {
      passed++;
    }
  }

  console.log(`Results: ${passed} passed, ${drift.length} drifted\n`);

  if (drift.length === 0) {
    console.log("✓ All sessions consistent. No replay drift detected.");
    await db.$disconnect();
    return;
  }

  console.log("DRIFT DETECTED\n" + "─".repeat(60));
  for (const d of drift) {
    console.log(`Session: ${d.sessionId.slice(0, 16).toUpperCase()}`);
    console.log(`  Template:  ${d.templateSlug}`);
    console.log(`  Completed: ${d.completedAt?.toISOString().slice(0, 10) ?? "unknown"}`);
    if (d.stored.score !== d.recomputed.score) {
      console.log(`  Score:  stored=${d.stored.score}  recomputed=${d.recomputed.score}  Δ=${d.recomputed.score - d.stored.score}`);
    }
    if (d.stored.status !== d.recomputed.status) {
      console.log(`  Status: stored=${d.stored.status}  recomputed=${d.recomputed.status}`);
    }
    console.log();
  }

  console.log(`${drift.length} session(s) have replay drift.`);
  console.log("These are likely sessions completed before the terminal score fix (Sprint 1 Fix #4).");
  console.log("Run scripts/fix-replay-drift.ts to patch stored scores from event replay.");

  await db.$disconnect();
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
