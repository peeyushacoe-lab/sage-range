/**
 * Seed the expanded incident catalogue.
 *
 * Builds every (company, attack chain) pairing from src/content/, so the
 * catalogue grows by editing content rather than this script.
 *
 * Idempotent on slug. Tasks and artifacts are replaced wholesale on an update
 * rather than diffed: they are authored content with no user data attached,
 * and a partial diff risks leaving orphaned tasks behind. Player progress
 * references tasks by id, so existing incidents are left alone by default —
 * pass --refresh to rewrite them.
 *
 * Also clears "Test Company" fixtures left in production by an integration
 * test run.
 *
 * Usage: npm run seed:incidents-full [-- --refresh]
 */

import { PrismaClient } from "@prisma/client";
import { buildIncidentCatalogue } from "../src/content/incident-catalogue";

const db = new PrismaClient();
const REFRESH = process.argv.includes("--refresh");

async function cleanTestFixtures() {
  const debris = await db.companyEnvironment.findMany({
    where: { name: "Test Company", slug: { startsWith: "company-17" } },
    select: { id: true, slug: true, _count: { select: { incidentSimulations: true } } },
  });
  const orphaned = debris.filter((d) => d._count.incidentSimulations === 0);

  if (orphaned.length > 0) {
    await db.companyEnvironment.deleteMany({
      where: { id: { in: orphaned.map((d) => d.id) } },
    });
    console.log(`Removed ${orphaned.length} orphaned test company fixtures.`);
  }
}

async function main() {
  console.log("\nSeeding incident catalogue\n");

  await cleanTestFixtures();

  const catalogue = buildIncidentCatalogue();
  const companies = await db.companyEnvironment.findMany({
    select: { id: true, slug: true },
  });
  const companyBySlug = new Map(companies.map((c) => [c.slug, c.id]));

  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  const missingCompanies = new Set<string>();

  for (const entry of catalogue) {
    const companyId = companyBySlug.get(entry.companySlug);
    if (!companyId) {
      missingCompanies.add(entry.companySlug);
      continue;
    }

    const existing = await db.incidentSimulation.findUnique({
      where: { slug: entry.slug },
      select: { id: true },
    });

    if (existing && !REFRESH) {
      skipped++;
      continue;
    }

    const { chain, context } = entry;
    const artifacts = chain.artifacts(context);
    const tasks = chain.tasks(context);

    if (existing) {
      // Replace authored content wholesale, leaving the simulation row — and
      // therefore any player progress pointing at it — in place.
      await db.$transaction([
        db.incidentSimArtifact.deleteMany({ where: { simulationId: existing.id } }),
        db.incidentSimulation.update({
          where: { id: existing.id },
          data: {
            codename: entry.codename,
            title: entry.title,
            briefing: chain.briefing(context),
            difficulty: chain.difficulty,
            estimatedMinutes: chain.minutes,
            points: chain.points,
            published: true,
          },
        }),
      ]);
      await db.incidentSimArtifact.createMany({
        data: artifacts.map((a, i) => ({
          simulationId: existing.id,
          type: a.type,
          title: a.title,
          content: a.content,
          order: i + 1,
          tactic: a.tactic ?? null,
        })),
      });
      refreshed++;
      continue;
    }

    const simulation = await db.incidentSimulation.create({
      data: {
        slug: entry.slug,
        codename: entry.codename,
        title: entry.title,
        companyId,
        briefing: chain.briefing(context),
        difficulty: chain.difficulty,
        estimatedMinutes: chain.minutes,
        points: chain.points,
        published: true,
        artifacts: {
          create: artifacts.map((a, i) => ({
            type: a.type,
            title: a.title,
            content: a.content,
            order: i + 1,
            tactic: a.tactic ?? null,
          })),
        },
        tasks: {
          create: tasks.map((t, i) => ({
            order: i + 1,
            title: t.title,
            prompt: t.prompt,
            answerType: t.answerType,
            correctAnswer: t.correctAnswer,
            options: t.options ?? [],
            points: t.points,
          })),
        },
      },
      select: { id: true },
    });

    if (simulation) created++;
  }

  if (missingCompanies.size > 0) {
    console.log(
      `\nSkipped — no matching company environment: ${[...missingCompanies].join(", ")}`,
    );
  }

  const total = await db.incidentSimulation.count({ where: { published: true } });
  const withTasks = await db.incidentSimulation.count({
    where: { published: true, tasks: { some: {} } },
  });

  console.log(
    `\n${created} created, ${refreshed} refreshed, ${skipped} already present` +
      (REFRESH ? "" : " (pass --refresh to rewrite)"),
  );
  console.log(`${total} published incidents, ${withTasks} with tasks.\n`);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Incident catalogue seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
