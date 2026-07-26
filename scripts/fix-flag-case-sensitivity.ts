// Every seeded Flag row was created with the old schema default
// caseSensitive: true, even though no seed script ever intended that —
// flags are formatted SAGE{lowercase_leetspeak}, so a user typing
// "sage{...}" instead of "SAGE{...}" (very natural) got silently rejected
// on an objectively correct answer. This is the "right answer flagged
// wrong" bug reported across multiple labs.
//
// The schema default is now false (see prisma/schema.prisma), but that
// only affects rows created from now on — this backfills every existing
// row. Idempotent: re-running just re-applies the same update.
//
// Run: npx tsx scripts/fix-flag-case-sensitivity.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const before = await db.flag.count({ where: { caseSensitive: true } });
  console.log(`Flags currently case-sensitive: ${before}`);

  const result = await db.flag.updateMany({
    where: { caseSensitive: true },
    data: { caseSensitive: false },
  });

  console.log(`Updated ${result.count} flag(s) to case-insensitive.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
