// Backfills Evidence rows for SkillAssessment attempts submitted before
// recordEvidence was wired into submitAssessment() — 5 real attempts existed
// with zero ASSESSMENT evidence. skillPoints stays 0, matching the live
// code: passing an assessment mints a credential, not skillScore/xp/coins.
// Idempotent. Run: npx tsx scripts/backfill-assessment-evidence.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const attempts = await db.skillAssessmentAttempt.findMany({
    where: { submittedAt: { not: null } },
    include: { assessment: true },
  });

  console.log(`Backfilling evidence for ${attempts.length} submitted attempts...\n`);

  for (const a of attempts) {
    await db.evidence.upsert({
      where: { userId_activity_sourceId: { userId: a.userId, activity: "ASSESSMENT", sourceId: a.id } },
      create: {
        userId: a.userId, activity: "ASSESSMENT", sourceId: a.id,
        result: a.passed ? "SOLVED" : "PARTIAL",
        skillPoints: 0,
        slug: a.assessment.slug, title: a.assessment.title, difficulty: a.assessment.difficulty,
        score: a.score, maxScore: 100,
      },
      update: {
        result: a.passed ? "SOLVED" : "PARTIAL",
        skillPoints: 0,
        slug: a.assessment.slug, title: a.assessment.title, difficulty: a.assessment.difficulty,
        score: a.score, maxScore: 100,
      },
    });
    console.log(`${a.assessment.slug}: ${a.passed ? "PASSED" : "not passed"} (${a.score}%)`);
  }
  console.log(`\nDone.`);
  process.exit(0);
}

main();
