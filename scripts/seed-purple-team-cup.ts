// Seeds "Purple Team Cup" — a lightweight Competitive Mode that pairs red
// and blue work in one leaderboard, reusing the existing Competition /
// CompetitionEntry model rather than building new multiplayer
// infrastructure. Competition scoring already sums Lab flag-submission
// points for any slug in `labSlugs` (see src/app/api/labs/submit/route.ts);
// this session extended the same pattern into
// src/app/api/detection-lab/submit/route.ts, so a DetectionChallenge slug
// can sit in that same array and count toward the same competition.
//
// NOTE: this is deliberately NOT the same thing as a true multiplayer
// "Capture the Company" mode (concurrent team defense of one shared,
// escalating environment over several hours). That would require reworking
// the existing single-player-locked dynamic simulation engine
// (src/app/api/simulation/[sessionId]/action/route.ts enforces
// session.userId === user.id) and was judged too large/risky to attempt as
// a bolt-on in this session — see the final summary for details.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-purple-team-cup.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const now = new Date();
const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

const COMPETITION = {
  name: "Purple Team Cup",
  slug: "purple-team-cup-2026",
  description:
    "Half red, half blue, one leaderboard. Complete the red-team labs (privilege escalation and Active Directory " +
    "attacks) AND pass the Detection Lab's PowerShell download-cradle challenge — the exact technique those labs " +
    "practice — to rack up your full Purple Team Cup score. Points combine across both sides.",
  startDate: now,
  endDate,
  freezeAt: null,
  prizeDesc: "Top 3 earn a Purple Team Cup certificate and a Skills Radar badge.",
  published: true,
  labSlugs: ["privilege-escalation", "active-directory-101", "kerberoasting", "phishing-powershell-cradle"],
};

async function main() {
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

  console.log(`✓ Purple Team Cup seeded (active ${now.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
