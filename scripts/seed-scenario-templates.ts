/**
 * Derive ScenarioTemplate rows from the simulation manifests.
 *
 * A manifest without a matching template row cannot start a session, and a
 * template row without a manifest is a dead entry in the picker. Deriving one
 * from the other means they cannot drift.
 *
 * Idempotent on slug.
 *
 * Usage: npm run seed:templates
 */

import { PrismaClient } from "@prisma/client";
import { listScenarios } from "../src/lib/simulation/runtime/scenarios/manifest";

const db = new PrismaClient();

/** ScenarioTemplate.industry is free text; derive it from the archetype. */
const INDUSTRY_LABEL: Record<string, string> = {
  FINANCIAL_SERVICES: "Financial Services",
  HEALTHCARE: "Healthcare",
  STARTUP: "Technology Startup",
  GOVERNMENT: "Government",
  RETAIL: "Retail",
  TECHNOLOGY: "Technology",
};

async function main() {
  console.log("\nSeeding scenario templates from manifests\n");

  const manifests = listScenarios();

  // Several manifests may legitimately share a template; keep the first and
  // report the rest so an accidental collision is visible.
  const byTemplate = new Map<string, typeof manifests>();
  for (const m of manifests) {
    const list = byTemplate.get(m.templateSlug) ?? [];
    list.push(m);
    byTemplate.set(m.templateSlug, list);
  }

  let created = 0;
  let updated = 0;

  for (const [slug, entries] of byTemplate) {
    const primary = entries[0];
    const existing = await db.scenarioTemplate.findUnique({
      where: { slug },
      select: { id: true },
    });

    await db.scenarioTemplate.upsert({
      where: { slug },
      create: {
        slug,
        name: primary.title,
        description: primary.subtitle,
        industry: INDUSTRY_LABEL[primary.archetypeId] ?? primary.archetypeId,
        difficulty: primary.difficulty,
        published: true,
      },
      update: {
        name: primary.title,
        description: primary.subtitle,
        industry: INDUSTRY_LABEL[primary.archetypeId] ?? primary.archetypeId,
        difficulty: primary.difficulty,
        published: true,
      },
    });

    if (existing) updated++;
    else created++;
  }

  const shared = [...byTemplate.entries()].filter(([, e]) => e.length > 1);
  if (shared.length > 0) {
    console.log("Templates backing more than one scenario:");
    for (const [slug, entries] of shared) {
      console.log(`  ${slug}: ${entries.map((e) => e.id).join(", ")}`);
    }
    console.log("");
  }

  const total = await db.scenarioTemplate.count({ where: { published: true } });
  console.log(`Templates: ${created} created, ${updated} updated`);
  console.log(`Scenarios: ${manifests.length} manifests`);
  console.log(`\nNow live — ${total} published templates\n`);

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Scenario template seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
