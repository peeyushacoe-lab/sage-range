// Disqualifies pooja.p's Operation Zero Hour run for an integrity issue: her
// run has zero EVIDENCE_VIEWED entries in OzhActionLog (every other real
// participant has 12-72) yet scored a perfect INVESTIGATION phase (200/200).
// Marks the run disqualified (kept, not deleted, so the ruling is auditable),
// revokes her 3 awards, and recomputes rank + awards for the remaining
// legitimate cohort using the exact same rankRuns/decideAwards production
// uses, so the result matches what concludeCompetition would have produced
// had she never been eligible.
//
// Idempotent: re-running after disqualified=true is already set finds her
// run already excluded by the query, so it just recomputes the same result.
import { PrismaClient } from "@prisma/client";
import { rankRuns, decideAwards, ozhCertCode, type OzhPhase } from "../src/lib/ozh-engine";

const db = new PrismaClient();
const OZH_SLUG = "operation-zero-hour";
const POOJA_ID = "cmrx6mk8u0024v0wvkq1mm8dm";
const REASON =
  "Zero EVIDENCE_VIEWED entries across the whole run (every other real " +
  "participant had 12-72), yet a perfect 200/200 INVESTIGATION score. " +
  "Disqualified for Operation Zero Hour per admin review.";

async function main() {
  const run = await db.ozhRun.findUnique({
    where: { userId_slug: { userId: POOJA_ID, slug: OZH_SLUG } },
    include: { awards: true },
  });
  if (!run) throw new Error("Pooja has no OZH run");
  console.log(`Found run ${run.id}, current rank=${run.rank}, awards=${run.awards.map(a=>a.kind).join(",")}`);

  await db.$transaction([
    db.ozhRun.update({
      where: { id: run.id },
      data: { disqualified: true, disqualifiedReason: REASON, rank: null },
    }),
    db.ozhAward.deleteMany({ where: { runId: run.id } }),
  ]);
  console.log("Marked disqualified, cleared rank, deleted her awards.");

  // Recompute the legitimate cohort exactly as concludeCompetition does.
  const runs = await db.ozhRun.findMany({
    where: {
      slug: OZH_SLUG,
      status: { in: ["SUBMITTED", "EXPIRED"] },
      user: { hidden: false },
      preview: false,
      disqualified: false,
    },
    select: { id: true, userId: true, score: true, accuracy: true, elapsedSeconds: true, phaseScores: true },
  });
  console.log(`\nRecomputing over ${runs.length} legitimate runs...`);

  const ranked = rankRuns(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
    })),
  );
  const rankByUser = new Map(ranked.map((r) => [r.userId, r.rank]));

  for (const r of runs) {
    const newRank = rankByUser.get(r.userId) ?? null;
    await db.ozhRun.update({ where: { id: r.id }, data: { rank: newRank } });
    console.log(`  ${r.userId}: rank -> ${newRank}`);
  }

  const zeroPhases = { TRIAGE: 0, INVESTIGATION: 0, HUNT: 0, RECONSTRUCTION: 0, RESPONSE: 0, REPORT: 0 } as Record<OzhPhase, number>;
  const awards = decideAwards(
    runs.map((r) => ({
      userId: r.userId,
      score: r.score ?? 0,
      accuracy: r.accuracy ?? 0,
      elapsedSeconds: r.elapsedSeconds ?? Number.MAX_SAFE_INTEGER,
      phaseScores: { ...zeroPhases, ...((r.phaseScores ?? {}) as Record<OzhPhase, number>) },
    })),
  );
  console.log(`\nRecomputed awards (${awards.length}):`, awards);

  const runByUser = new Map(runs.map((r) => [r.userId, r]));
  let created = 0;
  for (const award of awards) {
    const targetRun = runByUser.get(award.userId);
    if (!targetRun) continue;
    const existing = await db.ozhAward.findUnique({
      where: { runId_kind: { runId: targetRun.id, kind: award.kind } },
      select: { id: true },
    });
    if (existing) continue; // already held it before, nothing changes
    await db.ozhAward.create({
      data: {
        runId: targetRun.id,
        userId: award.userId,
        kind: award.kind,
        certCode: ozhCertCode(rankByUser.get(award.userId) ?? 1),
      },
    });
    created++;
    console.log(`  NEW award: ${award.kind} -> ${award.userId}`);
  }
  console.log(`\n${created} new award(s) issued to backfill what shifted to legitimate runners-up.`);

  process.exit(0);
}
main();
