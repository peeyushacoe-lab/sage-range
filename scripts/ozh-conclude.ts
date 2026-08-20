/**
 * Conclude Operation Zero Hour by hand.
 *
 * The scheduled job that should have done this never ran: Vercel Cron invokes
 * schedules with GET, and /api/cron/ozh-conclude exported POST alone, so every
 * firing since the deadline returned 405. Ranks were never frozen, no awards or
 * Knight badges were minted, and nobody was told the results existed.
 *
 * The route is fixed, but a deploy is not the fastest way to make eight days of
 * silence right — and it would send the whole field their results with nobody
 * watching. This script does the same work under supervision.
 *
 *   npm run ozh:conclude          # dry run: prints what would happen, writes nothing
 *   npm run ozh:conclude -- --go  # for real
 *
 * Safe to run more than once. Awards are unique per (run, kind) and the
 * notification step keys off OzhRun.notifiedAt, so a second run is a no-op
 * rather than a second email to everyone.
 */
import { PrismaClient } from "@prisma/client";
import {
  MAX_SCORE,
  OZH_CLOSES_AT,
  PHASE_ORDER,
  rankRuns,
  decideAwards,
  decideKnightBadges,
  knightTier,
  AWARD_LABEL,
  KNIGHT_TIER_LABEL,
  type OzhPhase,
} from "../src/lib/ozh-engine";

const db = new PrismaClient();
const OZH_SLUG = "operation-zero-hour";

const live = process.argv.includes("--go");

function heading(text: string) {
  console.log(`\n${text}\n${"─".repeat(text.length)}`);
}

async function main() {
  const now = new Date();
  if (now < OZH_CLOSES_AT) {
    console.error(
      `The operation has not closed yet (closes ${OZH_CLOSES_AT.toISOString()}). Refusing to conclude.`,
    );
    process.exitCode = 1;
    return;
  }

  // Anything still open past its deadline is graded on what it submitted, the
  // same as the sweep in the service would have done at the time.
  const stale = await db.ozhRun.findMany({
    where: { slug: OZH_SLUG, status: "IN_PROGRESS" },
    select: { id: true, userId: true, startedAt: true },
  });
  if (stale.length > 0) {
    heading(`${stale.length} run(s) still marked IN_PROGRESS`);
    for (const r of stale) console.log(`  ${r.userId}  started ${r.startedAt.toISOString()}`);
    console.log("  → will be closed as EXPIRED and graded on submitted phases");
  }

  const runs = await db.ozhRun.findMany({
    where: {
      slug: OZH_SLUG,
      status: { in: ["SUBMITTED", "EXPIRED", "IN_PROGRESS"] },
      preview: false,
      user: { hidden: false },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      score: true,
      accuracy: true,
      elapsedSeconds: true,
      phaseScores: true,
      rank: true,
      notifiedAt: true,
      user: { select: { email: true, displayName: true } },
      awards: { select: { kind: true } },
    },
  });

  if (runs.length === 0) {
    console.log("No real runs found. Nothing to conclude.");
    return;
  }

  const ranked = rankRuns(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
    })),
  );
  const rankByUser = new Map(ranked.map((r) => [r.userId, r.rank]));
  const byUser = new Map(runs.map((r) => [r.userId, r]));

  heading(`Final board — ${runs.length} analyst(s)`);
  for (const r of ranked) {
    const run = byUser.get(r.userId)!;
    const tier = knightTier(r.score);
    const name = run.user.displayName || run.user.email.split("@")[0];
    console.log(
      `  #${String(r.rank).padStart(2)}  ${name.padEnd(24).slice(0, 24)}  ` +
        `${String(r.score).padStart(4)}/${MAX_SCORE}  ${String(r.accuracy).padStart(3)}%  ` +
        `${tier ? KNIGHT_TIER_LABEL[tier] : "no badge (scored 0)"}`,
    );
  }

  const zeroPhases = Object.fromEntries(PHASE_ORDER.map((p) => [p, 0])) as Record<OzhPhase, number>;
  const awards = decideAwards(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
      phaseScores: { ...zeroPhases, ...((r.phaseScores ?? {}) as Record<OzhPhase, number>) },
    })),
  );
  const knights = decideKnightBadges(runs.map((r) => ({ userId: r.userId, score: r.score ?? 0 })));

  heading("Competitive awards");
  if (awards.length === 0) {
    console.log("  none — no run scored");
  } else {
    for (const a of awards) {
      const run = byUser.get(a.userId)!;
      const held = run.awards.some((x) => x.kind === a.kind);
      console.log(
        `  ${AWARD_LABEL[a.kind].padEnd(34)} ${(run.user.displayName || run.user.email).padEnd(28).slice(0, 28)}` +
          (held ? "  (already issued)" : ""),
      );
    }
  }

  const newKnights = knights.filter(
    (k) => !byUser.get(k.userId)!.awards.some((x) => x.kind === "KNIGHT"),
  );
  heading("Knight badges");
  console.log(`  ${knights.length} earned, ${newKnights.length} not yet issued`);

  const toNotify = runs.filter((r) => r.notifiedAt === null);
  heading("Notifications");
  console.log(`  ${toNotify.length} analyst(s) have not been told the results are out`);
  console.log("  in-app notification + one site-wide announcement; email is not wired up");

  if (!live) {
    heading("Dry run");
    console.log("  Nothing was written. Re-run with --go to apply.");
    return;
  }

  // The service owns the writes so the manual path and the cron path cannot
  // diverge — this script decides only whether to pull the trigger.
  heading("Applying");
  const { concludeCompetition } = await import("../src/lib/ozh");
  const result = await concludeCompetition(now);
  if (!result.success) {
    console.error(`  Failed: ${result.error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ranked:     ${result.data.ranked}`);
  console.log(`  awards:     ${result.data.awarded} newly issued`);
  console.log(`  knights:    ${result.data.knighted} newly issued`);
  console.log(`  notified:   ${result.data.notified}`);
  console.log(`  announced:  ${result.data.announced ? "yes" : "already present"}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
