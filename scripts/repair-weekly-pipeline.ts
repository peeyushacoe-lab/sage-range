/**
 * Repair and extend the weekly incident pipeline.
 *
 * Fixes two problems found in production:
 *
 * 1. Stale cases. releaseWeeklyIncident() picks the oldest unpublished case
 *    whose releaseTime has passed. A batch seeded for January 2026 was still
 *    sitting unpublished, so the next cron firing would have released a case
 *    from eight months ago instead of the current week's.
 *
 * 2. Orphaned test fixtures. Integration tests briefly ran against production
 *    and left published "Test Incident" rows visible to users.
 *
 * It then extends the schedule so the cron does not run dry.
 *
 * Read-only by default. Pass --apply to make changes.
 *
 * Usage: npm run repair:weekly -- --apply
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** Monday 00:00 UTC of the week containing `date`. */
function mondayOfWeekUTC(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay();
  // Sunday is day 0; stepping back six days keeps it in the week just ending
  // rather than jumping forward into the next one.
  const delta = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + delta);
  return d;
}

function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** Difficulty ramps within each 8-week block so a season has a shape. */
const DIFFICULTY_CYCLE = ["EASY", "MEDIUM", "MEDIUM", "HARD", "HARD", "HARD", "INSANE", "INSANE"] as const;

const WEEKS_AHEAD = 26;

async function main() {
  console.log(`\nWeekly pipeline repair — ${APPLY ? "APPLYING" : "dry run"}\n`);
  const now = new Date();
  const thisMonday = mondayOfWeekUTC(now);

  // ── 1. Orphaned test fixtures ────────────────────────────────────────────
  // Narrow deliberately: the timestamp slug, the exact test title, and no
  // dependent rows. Anything with real tasks or player progress is left alone.
  const debris = await db.incidentSimulation.findMany({
    where: { slug: { startsWith: "incident-17" }, title: "Test Incident" },
    select: { id: true, slug: true, _count: { select: { tasks: true, progress: true } } },
  });
  const deletable = debris.filter((d) => d._count.tasks === 0 && d._count.progress === 0);
  const referenced = await db.weeklyIncidentCase.count({
    where: { incidentSlug: { in: deletable.map((d) => d.slug) } },
  });

  console.log(`Test fixtures found:    ${debris.length}`);
  console.log(`  safe to delete:       ${deletable.length} (no tasks, no progress)`);
  console.log(`  weekly refs:          ${referenced}`);

  if (APPLY && deletable.length > 0 && referenced === 0) {
    await db.incidentSimulation.deleteMany({ where: { id: { in: deletable.map((d) => d.id) } } });
    console.log(`  deleted:              ${deletable.length}`);
  }

  // ── 2. Stale unpublished cases ───────────────────────────────────────────
  // Anything unpublished whose release time is before this week would jump the
  // queue ahead of the current week's case.
  const stale = await db.weeklyIncidentCase.findMany({
    where: { published: false, releaseTime: { lt: thisMonday } },
    select: { id: true, season: true, weekNumber: true, incidentSlug: true },
    orderBy: { releaseTime: "asc" },
  });

  console.log(`\nStale unpublished cases: ${stale.length}`);
  for (const s of stale) console.log(`  ${s.season} W${s.weekNumber} ${s.incidentSlug}`);

  if (APPLY && stale.length > 0) {
    // Archive rather than delete: they are a record of what was scheduled.
    await db.weeklyIncidentCase.updateMany({
      where: { id: { in: stale.map((s) => s.id) } },
      data: { archivedAt: new Date(), published: true },
    });
    console.log(`  archived:             ${stale.length}`);
  }

  // ── 3. Extend the schedule ───────────────────────────────────────────────
  const incidents = await db.incidentSimulation.findMany({
    where: {
      published: true,
      // Never schedule a fixture or an incident with no tasks — a case with
      // nothing to do is worse than no case at all.
      NOT: { title: "Test Incident" },
      tasks: { some: {} },
    },
    select: { slug: true },
    orderBy: { slug: "asc" },
  });

  console.log(`\nUsable incidents:       ${incidents.length}`);
  if (incidents.length === 0) {
    console.log("  nothing to schedule with — seed incidents first.");
    await db.$disconnect();
    return;
  }

  let created = 0;
  let existing = 0;

  for (let i = 0; i < WEEKS_AHEAD; i++) {
    const weekStart = new Date(thisMonday);
    weekStart.setUTCDate(weekStart.getUTCDate() + i * 7);

    const season = weekStart.getUTCFullYear();
    const weekNumber = isoWeekNumber(weekStart);

    const found = await db.weeklyIncidentCase.findUnique({
      where: { season_weekNumber: { season, weekNumber } },
      select: { id: true },
    });
    if (found) {
      existing++;
      continue;
    }

    const deadline = new Date(weekStart);
    deadline.setUTCDate(deadline.getUTCDate() + 6);
    deadline.setUTCHours(23, 59, 0, 0);

    const difficulty = DIFFICULTY_CYCLE[i % DIFFICULTY_CYCLE.length];

    if (APPLY) {
      await db.weeklyIncidentCase.create({
        data: {
          weekStartUTC: weekStart,
          weekNumber,
          season,
          incidentSlug: incidents[i % incidents.length].slug,
          difficulty,
          points: 1000,
          releaseTime: weekStart,
          deadlineTime: deadline,
          // Only the current week goes live now; the cron publishes the rest.
          published: i === 0,
        },
      });
    }
    created++;
  }

  console.log(`Schedule:               ${existing} already present, ${created} ${APPLY ? "created" : "would be created"}`);

  if (APPLY) {
    const next = await db.weeklyIncidentCase.findFirst({
      where: { published: false, archivedAt: null },
      orderBy: { releaseTime: "asc" },
      select: { season: true, weekNumber: true, incidentSlug: true, releaseTime: true },
    });
    console.log(
      `\nNext release:           ${next ? `${next.season} W${next.weekNumber} (${next.incidentSlug}) on ${next.releaseTime.toISOString().slice(0, 10)}` : "none"}`,
    );
  }

  console.log(APPLY ? "\nDone.\n" : "\nDry run — pass --apply to make these changes.\n");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Weekly pipeline repair failed:", err);
  await db.$disconnect();
  process.exit(1);
});
