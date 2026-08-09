/**
 * Backfill the Evidence spine from existing solved labs.
 *
 * The spine is written going forward by the activity endpoints, but existing
 * learners already have a history that predates it. This replays their solved
 * lab attempts into Evidence so the derived skill profile is not empty for
 * anyone who was active before the spine existed.
 *
 * Idempotent: recordEvidence upserts on (userId, activity, sourceId), so
 * re-running updates rows rather than duplicating them. Labs only for this
 * first cut — the other activities are backfilled as each is wired.
 *
 * After running, it verifies the headline property: for labs, the sum of
 * derived evidence points equals the score those solves contributed live.
 *
 * Usage: npx tsx --env-file-if-exists=.env scripts/backfill-evidence.ts
 */

import { PrismaClient } from "@prisma/client";
import { recordEvidence, labTacticsAndTechniques } from "../src/lib/evidence";

const db = new PrismaClient();

async function main() {
  console.log("\nBackfilling Evidence from solved lab attempts\n");

  const solved = await db.attempt.findMany({
    where: { status: "SOLVED" },
    include: { lab: { select: { slug: true, title: true, difficulty: true } } },
  });

  console.log(`Found ${solved.length} solved attempts.`);

  let written = 0;
  let tagged = 0;
  for (const a of solved) {
    const { tactics, techniques } = labTacticsAndTechniques(a.lab.slug);
    if (tactics.length > 0) tagged++;
    await recordEvidence({
      userId: a.userId,
      activity: "LAB",
      sourceId: a.id,
      result: "SOLVED",
      skillPoints: a.score,
      slug: a.lab.slug,
      title: a.lab.title,
      difficulty: a.lab.difficulty,
      score: a.score,
      attempts: a.wrongAttempts + 1,
      timeSec: a.timeTakenSec,
      tactics,
      techniques,
    });
    written++;
    if (written % 200 === 0) console.log(`  …${written}`);
  }

  console.log(`\nWrote ${written} evidence rows (${tagged} carry MITRE tactics).`);

  // Verify the headline property on a sample of active learners: the evidence
  // we derive for labs must sum to what those solves scored.
  const sampleUsers = await db.attempt.groupBy({
    by: ["userId"],
    where: { status: "SOLVED" },
    _sum: { score: true },
    orderBy: { _sum: { score: "desc" } },
    take: 5,
  });

  console.log("\nVerification — derived lab points vs live lab score, top 5 learners:");
  let allMatch = true;
  for (const u of sampleUsers) {
    const evidence = await db.evidence.aggregate({
      where: { userId: u.userId, activity: "LAB" },
      _sum: { skillPoints: true },
    });
    const live = u._sum.score ?? 0;
    const derived = evidence._sum.skillPoints ?? 0;
    const match = live === derived;
    if (!match) allMatch = false;
    console.log(`  ${u.userId.slice(0, 10)}…  live ${live}  derived ${derived}  ${match ? "OK" : "MISMATCH"}`);
  }

  console.log(
    allMatch
      ? "\nDerived lab points match live scores. Spine is consistent.\n"
      : "\nWARNING: a mismatch was found — investigate before deriving skillScore from evidence.\n",
  );

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err);
  await db.$disconnect();
  process.exit(1);
});
