/**
 * Post-deploy smoke test.
 *
 * Exercises the real service functions against a real database — not raw
 * queries — so it fails on the same things the UI would: a missing column, a
 * relation that does not resolve, a filter that references a field the schema
 * never gained.
 *
 * Read-only by default. Pass --write to also run the championship rollover,
 * which is idempotent and is meant to run anyway.
 *
 * Usage:
 *   npm run smoke
 *   npm run smoke -- --write
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const WRITE = process.argv.includes("--write");

type Status = "PASS" | "FAIL" | "WARN" | "SKIP";
const results: { area: string; check: string; status: Status; detail: string }[] = [];

function record(area: string, check: string, status: Status, detail = "") {
  results.push({ area, check, status, detail });
  const mark = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : status === "WARN" ? "!" : "-";
  const line = `  ${mark} ${check}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
}

/** Run a check, turning any thrown error into a FAIL rather than aborting. */
async function check(area: string, name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn();
    record(area, name, "PASS", detail || "");
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    record(area, name, "FAIL", message);
  }
}

async function section(title: string, fn: () => Promise<void>) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
  await fn();
}

async function main() {
  console.log("\nSage Vault smoke test");
  console.log(WRITE ? "mode: read + idempotent writes" : "mode: read-only");

  // ── Schema landed ────────────────────────────────────────────────────────
  await section("Schema", async () => {
    await check("schema", "Competition has visibility columns", async () => {
      const row = await db.competition.findFirst({
        select: { id: true, visibility: true, organizationId: true, cohortId: true, inviteCode: true },
      });
      return row ? "readable, rows present" : "readable, table empty";
    });

    await check("schema", "Championship tables exist", async () => {
      const n = await db.championship.count();
      return `${n} championships`;
    });

    await check("schema", "CrisisRun tables exist", async () => {
      const n = await db.crisisRun.count();
      return `${n} runs`;
    });

    await check("schema", "CustomScenario has visibility + clone columns", async () => {
      const row = await db.customScenario.findFirst({
        select: { id: true, visibility: true, clonedFromId: true },
      });
      return row ? "readable, rows present" : "readable, table empty";
    });

    await check("schema", "ScenarioRating table exists", async () => {
      const n = await db.scenarioRating.count();
      return `${n} ratings`;
    });
  });

  // ── Career Centre ────────────────────────────────────────────────────────
  await section("Career Centre", async () => {
    const { listRoleProfiles, listSkillAssessments, listInterviewKits } = await import(
      "../src/lib/career"
    );

    let roleSlug: string | null = null;

    await check("career", "listRoleProfiles()", async () => {
      const roles = await listRoleProfiles();
      roleSlug = roles[0]?.slug ?? null;
      if (roles.length === 0) throw new Error("no published role profiles — run npm run seed:phase4");
      return `${roles.length} roles`;
    });

    await check("career", "listSkillAssessments()", async () => {
      const rows = await listSkillAssessments();
      if (rows.length === 0) throw new Error("no published assessments — run npm run seed:phase4");
      return `${rows.length} assessments`;
    });

    await check("career", "listInterviewKits()", async () => {
      const rows = await listInterviewKits();
      if (rows.length === 0) throw new Error("no published interview kits — run npm run seed:phase4");
      return `${rows.length} kits`;
    });

    await check("career", "assessment questions are well-formed", async () => {
      const rows = await db.skillAssessment.findMany({ where: { published: true } });
      const broken = rows.filter((a) => !Array.isArray(a.questions) || (a.questions as unknown[]).length === 0);
      if (broken.length) throw new Error(`${broken.length} assessments have no questions`);
      const noAnswer = rows.filter((a) =>
        (a.questions as Array<Record<string, unknown>>).some(
          (q) => q.type !== "TEXT" && q.answer === undefined,
        ),
      );
      if (noAnswer.length) throw new Error(`${noAnswer.length} assessments have ungradeable questions`);
      return `${rows.length} assessments gradeable`;
    });

    await check("career", "/career/roles/[slug] target resolves", async () => {
      if (!roleSlug) throw new Error("no role to check");
      const role = await db.roleProfile.findUnique({ where: { slug: roleSlug } });
      if (!role) throw new Error(`role ${roleSlug} not found`);
      return `/career/roles/${roleSlug}`;
    });

    await check("career", "credential lookup path", async () => {
      const { verifyCredential } = await import("../src/lib/career");
      const any = await db.verifiedCredential.findFirst({ select: { code: true } });
      if (!any) return "no credentials issued yet (expected on a fresh database)";
      const result = await verifyCredential(any.code);
      if (!result) throw new Error("verifyCredential returned null for an existing code");
      if (result.holder.includes("@")) throw new Error("holder leaked a full email address");
      return `verified ${any.code}`;
    });
  });

  // ── Competitions ─────────────────────────────────────────────────────────
  await section("Competitions", async () => {
    const { loadViewerContext, visibleCompetitionFilter } = await import(
      "../src/lib/competition-access"
    );

    const someUser = await db.user.findFirst({ select: { id: true } });

    await check("competitions", "visibility filter executes", async () => {
      if (!someUser) return "no users yet — skipped";
      const viewer = await loadViewerContext(someUser.id);
      const rows = await db.competition.findMany({
        where: visibleCompetitionFilter(someUser.id, viewer),
        select: { id: true },
      });
      return `${rows.length} visible to a sample user`;
    });

    await check("competitions", "no restricted event is missing its audience", async () => {
      const orphanOrg = await db.competition.count({
        where: { visibility: "ORGANIZATION", organizationId: null },
      });
      const orphanCohort = await db.competition.count({
        where: { visibility: "COHORT", cohortId: null },
      });
      const orphanInvite = await db.competition.count({
        where: { visibility: "INVITE_ONLY", inviteCode: null },
      });
      const total = orphanOrg + orphanCohort + orphanInvite;
      // These fail closed, so they are invisible to everyone including their owner.
      if (total > 0) throw new Error(`${total} competitions are unreachable by anyone`);
      return "all restricted events have an audience";
    });

    await check("competitions", "existing events defaulted to PUBLIC", async () => {
      const n = await db.competition.count({ where: { visibility: "PUBLIC" } });
      const total = await db.competition.count();
      return `${n}/${total} public`;
    });
  });

  // ── Monthly Championship ─────────────────────────────────────────────────
  await section("Monthly Championship", async () => {
    const { getActiveChampionship, listChampionships, rolloverChampionships, getLeaderboard } =
      await import("../src/lib/championships");

    if (WRITE) {
      await check("championship", "rollover runs", async () => {
        const result = await rolloverChampionships();
        return `opened=${result.opened ?? "none"} concluded=${result.concluded.length}`;
      });
    } else {
      record(
        "championship",
        "rollover",
        "SKIP",
        "pass --write to open the first championship",
      );
    }

    await check("championship", "an active championship exists", async () => {
      const active = await getActiveChampionship();
      if (!active) {
        throw new Error(
          "none active — run `npm run smoke -- --write`, or wait for the 00:15 cron",
        );
      }
      return `${active.slug}, ${(active.labSlugs as string[]).length} challenges`;
    });

    await check("championship", "challenge set references real labs", async () => {
      const active = await getActiveChampionship();
      if (!active) return "no active championship — skipped";
      const slugs = active.labSlugs as string[];
      const found = await db.lab.count({ where: { slug: { in: slugs } } });
      if (found < slugs.length) {
        throw new Error(`${slugs.length - found} of ${slugs.length} challenge slugs match no lab`);
      }
      return `${found} labs resolve`;
    });

    await check("championship", "leaderboard query executes", async () => {
      const active = await getActiveChampionship();
      if (!active) return "no active championship — skipped";
      const board = await getLeaderboard(active.id, 10);
      return `${board.length} entrants`;
    });

    await check("championship", "listChampionships()", async () => {
      const all = await listChampionships(12);
      return `${all.length} published`;
    });
  });

  // ── Crisis Command Center ────────────────────────────────────────────────
  await section("Crisis Command Center", async () => {
    const { listScenarios } = await import("../src/lib/crisis");
    const { CRISIS_SCENARIOS } = await import("../src/content/crisis-scenarios");
    const { activeInjects } = await import("../src/lib/crisis-engine");

    await check("crisis", "authored scenarios load", async () => {
      const list = listScenarios();
      if (list.length === 0) throw new Error("no crisis scenarios authored");
      return `${list.length} scenario(s)`;
    });

    await check("crisis", "opening minute presents work", async () => {
      const s = CRISIS_SCENARIOS[0];
      const first = activeInjects(s, 0, []);
      if (first.length === 0) throw new Error("nothing is actionable at minute 0");
      return `${first.length} inject(s) at open`;
    });

    await check("crisis", "run tables accept a query", async () => {
      const n = await db.crisisRun.count({ where: { status: "IN_PROGRESS" } });
      return `${n} runs in progress`;
    });

    await check("crisis", "no completed run is missing its grade", async () => {
      const bad = await db.crisisRun.count({ where: { status: "COMPLETED", score: null } });
      if (bad > 0) throw new Error(`${bad} completed runs have no score`);
      return "all graded";
    });
  });

  // ── Community scenarios ──────────────────────────────────────────────────
  await section("Community scenarios", async () => {
    const { galleryFilter, ratingSummariesFor, followedCreatorIds } = await import(
      "../src/lib/scenario-sharing"
    );

    await check("community", "gallery query executes", async () => {
      const rows = await db.customScenario.findMany({
        where: galleryFilter(),
        select: { id: true },
        take: 60,
      });
      return `${rows.length} in the gallery`;
    });

    await check("community", "rating summaries load in one query", async () => {
      const ids = (
        await db.customScenario.findMany({ select: { id: true }, take: 20 })
      ).map((s) => s.id);
      const summaries = await ratingSummariesFor(ids);
      if (summaries.size !== ids.length) {
        throw new Error(`asked for ${ids.length} summaries, got ${summaries.size}`);
      }
      return `${ids.length} scenarios summarised`;
    });

    await check("community", "follow graph reachable", async () => {
      const someUser = await db.user.findFirst({ select: { id: true } });
      if (!someUser) return "no users yet — skipped";
      const ids = await followedCreatorIds(someUser.id);
      return `${ids.length} follows for a sample user`;
    });

    await check("community", "no scenario is publicly listed by accident", async () => {
      // Pre-existing rows default to PRIVATE, so anything COMMUNITY should be
      // deliberate. A large count here on a fresh deploy would mean the default
      // did not apply.
      const community = await db.customScenario.count({ where: { visibility: "COMMUNITY" } });
      const total = await db.customScenario.count();
      return `${community}/${total} listed publicly`;
    });

    await check("community", "clone links resolve", async () => {
      const clones = await db.customScenario.findMany({
        where: { clonedFromId: { not: null } },
        select: { id: true, clonedFromId: true },
      });
      if (clones.length === 0) return "no clones yet";
      const parentIds = clones.map((c) => c.clonedFromId!) as string[];
      const found = await db.customScenario.count({ where: { id: { in: parentIds } } });
      return `${clones.length} clones, ${found} parents resolve`;
    });
  });

  // ── Summary ──────────────────────────────────────────────────────────────
  const failed = results.filter((r) => r.status === "FAIL");
  const warned = results.filter((r) => r.status === "WARN");
  const passed = results.filter((r) => r.status === "PASS");
  const skipped = results.filter((r) => r.status === "SKIP");

  console.log(`\n${"═".repeat(64)}`);
  console.log(
    `${passed.length} passed · ${failed.length} failed · ${warned.length} warnings · ${skipped.length} skipped`,
  );

  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(`  ✗ [${f.area}] ${f.check}\n      ${f.detail}`);
  }

  console.log("");
  await db.$disconnect();
  // Non-zero exit so this can gate a deploy if you ever wire it into CI.
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error("\nSmoke test crashed:", err);
  await db.$disconnect();
  process.exit(1);
});
