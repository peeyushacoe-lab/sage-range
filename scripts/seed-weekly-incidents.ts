/**
 * Seed script for Weekly Incident Cases
 * Creates 8 cases starting from the current week with progressive difficulty
 * (EASY -> INSANE), linked to whichever incident simulations exist.
 *
 * Usage: npm run seed:weekly-incidents
 */

import { PrismaClient } from "@prisma/client";
import type { Difficulty } from "@prisma/client";
import {
  mondayOfWeekUTC,
  deadlineForWeek,
  isoWeekNumber,
  isoWeekYear,
} from "../src/lib/week-dates";

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

async function seedWeeklyIncidents() {
  console.log(`\n📅 Seeding Weekly Incident Cases for Season ${SEASON}...\n`);

  // Use whatever incidents the database actually has. An earlier version of
  // this script hardcoded slugs that belong to Lab rows (seed-batch-*.ts), not
  // IncidentSimulation, so it could never match anything.
  const incidents = await db.incidentSimulation.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    select: { slug: true, title: true },
  });

  if (incidents.length === 0) {
    console.error(
      "❌ No published incident simulations found.\n" +
        "   Weekly cases reference IncidentSimulation.slug, so seed incidents first:\n" +
        "     npm run seed:incidents\n",
    );
    process.exit(1);
  }

  console.log(`✓ Found ${incidents.length} incident simulations\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Anchor the run on the CURRENT week, not the first week of the year.
  // Anchoring on January meant every seeded case had a deadline months in the
  // past, so releaseWeeklyIncident() would publish an already-expired case and
  // no certificate could ever be issued.
  const thisMonday = mondayOfWeekUTC();

  for (let offset = 0; offset < 8; offset++) {
    const monday = new Date(thisMonday);
    monday.setUTCDate(monday.getUTCDate() + offset * 7);

    const sunday = deadlineForWeek(monday);

    // Slot 1..8 drives the difficulty ramp; weekNumber is the real ISO week so
    // the [season, weekNumber] unique key stays meaningful across runs.
    const slot = offset + 1;
    const season = isoWeekYear(monday);
    const week = isoWeekNumber(monday);
    const difficulty = DIFFICULTY_MAP[slot];
    const points = POINTS_MAP[slot];

    // Cycle through incidents
    const incident = incidents[offset % incidents.length];

    try {
      const existing = await db.weeklyIncidentCase.findFirst({
        where: {
          season,
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
          season,
          weekNumber: week,
          weekStartUTC: monday,
          incidentSlug: incident.slug,
          difficulty,
          points,
          releaseTime: monday,
          deadlineTime: sunday,
          // Publish the current week so the feature is live straight after
          // seeding; later weeks wait for the Monday release job.
          published: offset === 0,
        },
      });

      console.log(
        `✓ W${week} (${difficulty}) ${monday.toISOString().slice(0, 10)} → ${sunday
          .toISOString()
          .slice(0, 10)}${offset === 0 ? "  [LIVE]" : ""}: ${incident.title} [${points} pts]`
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
