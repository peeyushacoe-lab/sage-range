/**
 * Mark integration-test accounts as hidden.
 *
 * Test runs leave accounts behind under @test.com and @example.com. They are
 * ordinary STUDENT rows, so every leaderboard treated them as players — six of
 * them had reached the top of the live ranked ladder.
 *
 * `hidden` is the existing mechanism for exactly this: excluded from every
 * leaderboard and the activity feed, while the account itself is untouched.
 * Reversible, unlike deleting rows other test fixtures may reference.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const suffixes = ["@test.com", "@example.com"];

  const targets = await db.user.findMany({
    where: { hidden: false, OR: suffixes.map((s) => ({ email: { endsWith: s } })) },
    select: { id: true, email: true, displayName: true },
  });

  if (targets.length === 0) {
    console.log("No visible test accounts found.");
    return;
  }

  console.log(`Hiding ${targets.length} test account(s):`);
  for (const t of targets) console.log(`  ${(t.displayName ?? "(no name)").padEnd(22)} ${t.email}`);

  await db.user.updateMany({
    where: { id: { in: targets.map((t) => t.id) } },
    data: { hidden: true },
  });

  // Their ratings would otherwise sit in the season as orphaned entries that
  // the ladder filters out but the raw table still carries.
  const removed = await db.seasonRating.deleteMany({
    where: { userId: { in: targets.map((t) => t.id) } },
  });
  console.log(`\nHidden ${targets.length}, removed ${removed.count} season rating row(s).`);
}

main().catch(console.error).finally(() => db.$disconnect());
