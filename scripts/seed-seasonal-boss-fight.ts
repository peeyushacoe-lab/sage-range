// Seeds "Boss Fight Gauntlet" — the last unbuilt item from the original
// Phase 2 Competitive Modes list ("SOC Sprint, Threat Hunt Friday, Purple
// Team Cup, Capture the Company, Seasonal Boss Fights"). Reuses the generic
// Competition/CompetitionEntry model exactly like Purple Team Cup does —
// scoring is wired in src/app/api/incidents/submit/route.ts, which now
// increments any active competition entry whose labSlugs array contains the
// incident simulation's slug (previously incident sims never fed the
// competition system at all).
//
// "Seasonal" here means time-boxed and rotating: this seed represents the
// CURRENT season's gauntlet. To rotate to a new season, either re-run this
// script with updated SEASON_NAME/SEASON_SLUG/dates/BOSS_FIGHT_SLUGS, or
// point a scheduled task at a copy of this script on the desired cadence —
// nothing else in the app needs to change, since /competitions already
// lists whatever Competition rows are published and in-range.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-seasonal-boss-fight.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const now = new Date();
const endDate = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000); // 6-week season

// The four hardest, most narratively distinct Boss Fight incident sims —
// deliberately spread across different companies/industries/attack styles
// (OT sabotage, POS malware, BEC wire fraud, AD domain takeover) so the
// gauntlet isn't four variations on the same story.
const BOSS_FIGHT_SLUGS = [
  "mfg-2026-004-ot-compromise",
  "ret-2026-005-pos-malware",
  "bec-2026-002-wire-fraud",
  "identity-2026-001-domain-takeover",
];

const COMPETITION = {
  name: "Boss Fight Gauntlet — Summer 2026",
  slug: "boss-fight-gauntlet-2026-summer",
  description:
    "Four INSANE-difficulty Boss Fight simulations, one season, one leaderboard: an OT/PLC sabotage at Ironforge " +
    "Manufacturing, a POS memory-scraper at BrightCart Retail, a business-email-compromise wire fraud at Meridian " +
    "Finance, and a full Active Directory domain takeover at Lakeshore State University. Every correct task answer " +
    "across all four sims adds to your Gauntlet score — clear all four for the top of the board.",
  startDate: now,
  endDate,
  freezeAt: null,
  prizeDesc: "Top 3 earn the Boss Fight Gauntlet certificate and a seasonal Skills Radar badge.",
  published: true,
  labSlugs: BOSS_FIGHT_SLUGS,
};

async function main() {
  const missing: string[] = [];
  for (const slug of BOSS_FIGHT_SLUGS) {
    const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { slug: true } });
    if (!sim) missing.push(slug);
  }
  if (missing.length > 0) {
    console.warn(
      `⚠ Warning: these incident sim slugs were not found in the DB yet (seed the incident sims first): ${missing.join(", ")}`
    );
  }

  await db.competition.upsert({
    where: { slug: COMPETITION.slug },
    update: {
      name: COMPETITION.name,
      description: COMPETITION.description,
      startDate: COMPETITION.startDate,
      endDate: COMPETITION.endDate,
      freezeAt: COMPETITION.freezeAt,
      prizeDesc: COMPETITION.prizeDesc,
      published: COMPETITION.published,
      labSlugs: COMPETITION.labSlugs,
    },
    create: COMPETITION,
  });

  console.log(`✓ Boss Fight Gauntlet seeded (active ${now.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
