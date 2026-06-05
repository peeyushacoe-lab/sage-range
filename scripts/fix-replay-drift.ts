/**
 * Replay Drift Fixer
 *
 * For any completed session where the stored score diverges from the
 * recomputed score (event replay), patches the DB to match the replay.
 *
 * Safe to run multiple times — idempotent.
 *
 * Usage:
 *   npx tsx scripts/fix-replay-drift.ts
 */

import { PrismaClient } from "@prisma/client";
import { buildWorldState } from "@/lib/simulation/engine";

const db = new PrismaClient();

async function main() {
  const sessions = await db.simulationSession.findMany({
    where: { status: { in: ["CONTAINED", "BREACHED"] } },
    include: {
      template: { select: { slug: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  console.log(`\nDrift Fixer — scanning ${sessions.length} completed sessions\n`);

  let fixed = 0;
  let clean = 0;

  for (const session of sessions) {
    const worldState = buildWorldState(session.events);
    if (session.score === worldState.score) {
      clean++;
      continue;
    }

    await db.simulationSession.update({
      where: { id: session.id },
      data: { score: worldState.score },
    });

    console.log(`Fixed ${session.id.slice(0, 16).toUpperCase()} — ${session.score} → ${worldState.score}`);
    fixed++;
  }

  console.log(`\nDone: ${fixed} patched, ${clean} already correct.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
