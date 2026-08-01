/**
 * Seed the expanded career library.
 *
 * Additive to scripts/seed-phase4.ts, which seeded the first small set. Kept
 * separate so the original stays a working minimal seed and this can grow
 * without either file passing 500 lines.
 *
 * Idempotent: everything upserts on slug, so re-running adds nothing.
 *
 * Usage: npm run seed:career
 */

import { PrismaClient } from "@prisma/client";
import { CAREER_ASSESSMENTS } from "../src/content/career-assessments";
import {
  CAREER_ROLES,
  CAREER_INTERVIEW_KITS,
  CAREER_JOBS,
} from "../src/content/career-library";

const db = new PrismaClient();

async function main() {
  console.log("\nSeeding career library\n");

  // ── Role profiles ────────────────────────────────────────────────────────
  for (const role of CAREER_ROLES) {
    await db.roleProfile.upsert({
      where: { slug: role.slug },
      create: { ...role, published: true },
      update: {
        title: role.title,
        description: role.description,
        seniority: role.seniority,
        requiredTactics: role.requiredTactics,
        recommendedPathSlugs: role.recommendedPathSlugs,
        published: true,
      },
    });
  }
  console.log(`Role profiles:      ${CAREER_ROLES.length}`);

  // ── Assessments ──────────────────────────────────────────────────────────
  for (const a of CAREER_ASSESSMENTS) {
    await db.skillAssessment.upsert({
      where: { slug: a.slug },
      create: { ...a, published: true },
      update: {
        title: a.title,
        description: a.description,
        domain: a.domain,
        difficulty: a.difficulty,
        timeLimitSec: a.timeLimitSec,
        passingScore: a.passingScore,
        validityDays: a.validityDays,
        questions: a.questions,
        published: true,
      },
    });
  }
  console.log(`Assessments:        ${CAREER_ASSESSMENTS.length}`);

  // ── Interview kits ───────────────────────────────────────────────────────
  for (const k of CAREER_INTERVIEW_KITS) {
    await db.interviewKit.upsert({
      where: { slug: k.slug },
      create: { ...k, published: true },
      update: {
        title: k.title,
        description: k.description,
        seniority: k.seniority,
        difficulty: k.difficulty,
        timeLimitSec: k.timeLimitSec,
        questions: k.questions,
        published: true,
      },
    });
  }
  console.log(`Interview kits:     ${CAREER_INTERVIEW_KITS.length}`);

  // ── Job postings ─────────────────────────────────────────────────────────
  // Postings need an owning recruiter; prefer a real one, fall back to the
  // first user so the seed still works on a fresh database.
  const recruiter =
    (await db.user.findFirst({ where: { role: "RECRUITER" } })) ??
    (await db.user.findFirst());

  if (!recruiter) {
    console.log("Job postings:       skipped (no users yet)");
  } else {
    let posted = 0;
    for (const job of CAREER_JOBS) {
      const existing = await db.jobPosting.findFirst({ where: { slug: job.slug } });
      if (existing) continue;

      const closesAt = new Date();
      closesAt.setUTCDate(closesAt.getUTCDate() + 45);

      await db.jobPosting.create({
        data: {
          recruiterId: recruiter.id,
          slug: job.slug,
          title: job.title,
          company: job.company,
          description: job.description,
          // The board stores requirements as JSON; the seed's tags are the
          // shortlist a candidate scans before reading the description.
          requirements: job.tags,
          location: job.location,
          remote: job.remote,
          employmentType: job.employmentType,
          seniority: job.seniority,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          salaryCurrency: "GBP",
          closesAt,
          active: true,
        },
      });
      posted++;
    }
    console.log(`Job postings:       ${posted} new (${CAREER_JOBS.length} defined)`);
  }

  const totals = {
    roles: await db.roleProfile.count({ where: { published: true } }),
    assessments: await db.skillAssessment.count({ where: { published: true } }),
    kits: await db.interviewKit.count({ where: { published: true } }),
    jobs: await db.jobPosting.count({ where: { active: true } }),
  };
  console.log(`\nNow live — roles ${totals.roles}, assessments ${totals.assessments}, kits ${totals.kits}, jobs ${totals.jobs}\n`);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Career library seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
