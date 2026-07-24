// Operational hardening: "validate seeded data before deployment."
//
// Runs a battery of structural sanity checks against everything already in
// the DB after seeding — catches the class of bug this project hit twice
// during authoring (FIN-2026-004's artifact order contradicting its own
// timeline text; near-duplicate Learning Paths) automatically instead of by
// manual review. Exits with a non-zero code if anything fails, so it can
// gate a deploy: `npx tsx scripts/validate-content.ts && npm run build`.
//
// Read-only — never writes to the DB. Safe to run anytime, as often as you like.

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

let errors = 0;
let warnings = 0;

function fail(msg: string) {
  console.error(`✗ ${msg}`);
  errors++;
}
function warn(msg: string) {
  console.warn(`⚠ ${msg}`);
  warnings++;
}
function ok(msg: string) {
  console.log(`✓ ${msg}`);
}

async function checkIncidentSimulations() {
  const sims = await db.incidentSimulation.findMany({
    include: { artifacts: true, tasks: { include: { hints: true } }, company: true },
  });
  ok(`${sims.length} incident simulations found`);

  for (const sim of sims) {
    const label = `${sim.slug} (${sim.codename})`;

    if (!sim.company) fail(`${label}: company relation missing (dangling companyId)`);

    // Artifact order must be dense, 1..N, no duplicates/gaps — Evidence
    // Board's timeline exercise uses `order` as ground truth.
    if (sim.artifacts.length > 0) {
      const orders = sim.artifacts.map((a) => a.order).sort((a, b) => a - b);
      const expected = orders.map((_, i) => i + 1);
      if (JSON.stringify(orders) !== JSON.stringify(expected)) {
        fail(`${label}: artifact order is not a dense 1..${orders.length} sequence — got [${orders.join(",")}]. Evidence Board timeline scoring will be wrong.`);
      }
    } else {
      warn(`${label}: has no artifacts`);
    }

    // Task order same requirement, plus every task needs a non-empty
    // correctAnswer and (for MULTIPLE_CHOICE) options that actually contain it.
    if (sim.tasks.length > 0) {
      const torders = sim.tasks.map((t) => t.order).sort((a, b) => a - b);
      const texpected = torders.map((_, i) => i + 1);
      if (JSON.stringify(torders) !== JSON.stringify(texpected)) {
        fail(`${label}: task order is not a dense 1..${torders.length} sequence — got [${torders.join(",")}]`);
      }
      for (const task of sim.tasks) {
        if (!task.correctAnswer || !task.correctAnswer.trim()) {
          fail(`${label} / task "${task.title}": empty correctAnswer`);
        }
        if (task.answerType === "RADIO") {
          if (task.options.length < 2) {
            fail(`${label} / task "${task.title}": RADIO answer type with fewer than 2 options`);
          } else if (!task.options.includes(task.correctAnswer)) {
            fail(`${label} / task "${task.title}": correctAnswer is not one of the listed options`);
          }
        }
        if (task.hints.length === 0) {
          warn(`${label} / task "${task.title}": no hints authored`);
        }
      }
    } else {
      fail(`${label}: has no tasks — unplayable`);
    }

    // Randomized sims must actually use at least one {{TOKEN}} somewhere,
    // otherwise the "randomized" flag is a no-op that misleads students.
    if (sim.randomized) {
      const hasToken = (s: string) => /\{\{[A-Z_]+\}\}/.test(s);
      const anyTokenUsed =
        sim.artifacts.some((a) => hasToken(a.content)) ||
        sim.tasks.some((t) => hasToken(t.prompt) || hasToken(t.correctAnswer));
      if (!anyTokenUsed) {
        warn(`${label}: marked randomized:true but no {{TOKEN}} placeholders found in artifacts/tasks`);
      }
    }
  }

  // Duplicate slugs (shouldn't be possible given @unique, but codenames /
  // titles can still collide and confuse instructors).
  const codenames = new Map<string, string[]>();
  for (const sim of sims) {
    if (!codenames.has(sim.codename)) codenames.set(sim.codename, []);
    codenames.get(sim.codename)!.push(sim.slug);
  }
  for (const [codename, slugs] of codenames) {
    if (slugs.length > 1) warn(`Codename "${codename}" reused across sims: ${slugs.join(", ")}`);
  }
}

async function checkLearningPaths() {
  // labs is a hard FK (PathLab.labId -> Lab.id), so referential integrity is
  // already guaranteed by Postgres — no dangling-slug check needed here.
  const paths = await db.learningPath.findMany({ include: { labs: true, modules: true } });
  ok(`${paths.length} learning paths found`);

  for (const path of paths) {
    if (path.labs.length === 0 && path.modules.length === 0) {
      fail(`Learning path "${path.slug}": has neither labs nor modules — empty path`);
    }
    // capstoneSimulationSlug is a soft (string) reference, not an FK, since
    // it points across content models — this one IS worth checking.
    if (path.capstoneSimulationSlug) {
      const capstone = await db.incidentSimulation.findUnique({ where: { slug: path.capstoneSimulationSlug } });
      if (!capstone) fail(`Learning path "${path.slug}": capstoneSimulationSlug "${path.capstoneSimulationSlug}" does not exist`);
    }
  }
}

async function checkCompetitions() {
  const now = new Date();
  const comps = await db.competition.findMany();
  ok(`${comps.length} competitions found`);
  for (const c of comps) {
    const slugs = c.labSlugs as string[];
    if (!Array.isArray(slugs) || slugs.length === 0) {
      warn(`Competition "${c.slug}": empty labSlugs — nothing will ever score`);
      continue;
    }
    const labSlugs = new Set((await db.lab.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((l) => l.slug));
    const simSlugs = new Set((await db.incidentSimulation.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((s) => s.slug));
    const detSlugs = new Set((await db.detectionChallenge.findMany({ where: { slug: { in: slugs } }, select: { slug: true } })).map((d) => d.slug));
    for (const slug of slugs) {
      if (!labSlugs.has(slug) && !simSlugs.has(slug) && !detSlugs.has(slug)) {
        fail(`Competition "${c.slug}": labSlugs entry "${slug}" doesn't match any Lab, IncidentSimulation, or DetectionChallenge — will never score`);
      }
    }
    if (c.published && c.endDate < now) {
      warn(`Competition "${c.slug}": published but endDate already passed (${c.endDate.toISOString().slice(0, 10)})`);
    }
  }
}

async function checkDetectionContent() {
  const challenges = await db.detectionChallenge.findMany();
  for (const c of challenges) {
    const events = c.events as unknown[];
    if (!Array.isArray(events) || events.length === 0) {
      fail(`Detection challenge "${c.slug}": no events`);
      continue;
    }
    const malicious = events.filter((e) => (e as { isMalicious?: boolean }).isMalicious).length;
    if (malicious === 0) fail(`Detection challenge "${c.slug}": no isMalicious events — impossible to pass`);
    if (malicious === events.length) warn(`Detection challenge "${c.slug}": every event is malicious — no false-positive traps, trivial to pass`);
  }
  ok(`${challenges.length} detection challenges checked`);
}

async function main() {
  console.log("── Validating seeded content ──\n");
  await checkIncidentSimulations();
  await checkLearningPaths();
  await checkCompetitions();
  await checkDetectionContent();

  console.log(`\n${errors === 0 ? "✓" : "✗"} Done — ${errors} error(s), ${warnings} warning(s).`);
  if (errors > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
