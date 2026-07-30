/**
 * Seed script for Weekly Incident Cases
 * Creates W1-W8 test cases with progressive difficulty (EASY -> INSANE)
 * and links them to sample incident simulations.
 *
 * Usage: npx ts-node scripts/seed-weekly-incidents.ts
 */

import { PrismaClient } from "@prisma/client";
import type { Difficulty } from "@prisma/client";

const db = new PrismaClient();

const SEASON = new Date().getUTCFullYear();

// Difficulty progression: W1-2 EASY, W3-4 MEDIUM, W5-6 HARD, W7-8 INSANE
const DIFFICULTY_MAP: Record<number, Difficulty> = {
  1: "EASY",
  2: "EASY",
  3: "MEDIUM",
  4: "MEDIUM",
  5: "HARD",
  6: "HARD",
  7: "INSANE",
  8: "INSANE",
};

const POINTS_MAP: Record<number, number> = {
  1: 1000,
  2: 1000,
  3: 1200,
  4: 1200,
  5: 1500,
  6: 1500,
  7: 2000,
  8: 2000,
};

// Reference incident slugs (must exist in IncidentSimulation table)
// These are the existing incidents in the codebase
const INCIDENT_SLUGS = [
  "phishing-click-incident",
  "ddos-attack-incident",
  "cloud-incident-response",
  "ransomware-incident",
  "incident-severity-classification",
  // Fallback if not enough incidents
  "phishing-click-incident",
  "ddos-attack-incident",
  "cloud-incident-response",
];

async function seedWeeklyIncidents() {
  console.log(`\n📅 Seeding Weekly Incident Cases for Season ${SEASON}...\n`);

  // Verify incident simulations exist
  const incidents = await db.incidentSimulation.findMany({
    where: {
      slug: { in: INCIDENT_SLUGS },
    },
  });

  if (incidents.length === 0) {
    console.error("❌ No incident simulations found. Please seed incidents first.");
    process.exit(1);
  }

  console.log(`✓ Found ${incidents.length} incident simulations\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let week = 1; week <= 8; week++) {
    // Calculate Monday 00:00 UTC for the given week
    // Week 1 = first Monday of the year
    const jan1 = new Date(Date.UTC(SEASON, 0, 1));
    const dayOfWeek = jan1.getUTCDay();
    const firstMonday = new Date(jan1);
    firstMonday.setUTCDate(firstMonday.getUTCDate() + (dayOfWeek <= 1 ? 1 - dayOfWeek : 8 - dayOfWeek));
    firstMonday.setUTCHours(0, 0, 0, 0);

    const monday = new Date(firstMonday);
    monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);

    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 0, 0);

    const difficulty = DIFFICULTY_MAP[week];
    const points = POINTS_MAP[week];

    // Cycle through incidents
    const incident = incidents[(week - 1) % incidents.length];

    try {
      const existing = await db.weeklyIncidentCase.findFirst({
        where: {
          season: SEASON,
          weekNumber: week,
        },
      });

      if (existing) {
        console.log(
          `⏭️  W${week} already exists (ID: ${existing.id}). Skipping...`
        );
        skipped++;
        continue;
      }

      const case_ = await db.weeklyIncidentCase.create({
        data: {
          season: SEASON,
          weekNumber: week,
          weekStartUTC: monday,
          incidentSlug: incident.slug,
          difficulty,
          points,
          releaseTime: monday,
          deadlineTime: sunday,
          published: false, // Start unpublished; release via background job
        },
      });

      console.log(
        `✓ W${week} (${difficulty}): ${incident.title} [${points} pts] - ID: ${case_.id}`
      );
      created++;
    } catch (err: any) {
      // Check if it's a unique constraint error
      if (err.code === "P2002") {
        console.log(`⏭️  W${week} already exists (unique constraint). Skipping...`);
        skipped++;
      } else {
        console.error(`❌ W${week} failed:`, err.message);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${created + skipped}/8\n`);

  if (created > 0) {
    console.log(
      "ℹ️  Cases created in UNPUBLISHED state.\n" +
        "   To release: use admin UI or trigger releaseWeeklyIncident() background job.\n"
    );
  }

  await db.$disconnect();
}

seedWeeklyIncidents().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
