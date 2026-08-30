import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { coinsForPoints } from "@/lib/soc-league";
import { recordEvidence } from "@/lib/evidence";
import { audit } from "@/lib/audit";

/**
 * Ends a Hunt Investigation session.
 *
 * Nothing in this feature previously wrote status: "COMPLETED", endedAt, or
 * score anywhere — a session just stayed ACTIVE forever, no matter how many
 * artifacts were found. The leaderboard route already filtered on COMPLETED;
 * it was simply never reachable. This is that missing endpoint.
 *
 * Voluntary, like Operation Zero Hour's submit: a hunt is graded on whatever
 * was found by the time the analyst calls it done, not gated behind finding
 * every artifact — real investigations end with partial findings too.
 */

const BASE_POINTS: Record<string, number> = { EASY: 150, MEDIUM: 250, HARD: 400 };
// A rough par time per difficulty — under it earns the speed bonus, well
// over it costs a small penalty. Deliberately coarse (three buckets) rather
// than a continuous curve, so the reason for a score is legible at a glance.
const PAR_SECONDS: Record<string, number> = { EASY: 600, MEDIUM: 1200, HARD: 1800 };

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const session = await db.huntInvestigationSession.findUnique({
    where: { id: sessionId },
    include: { dataset: true },
  });
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.userId !== user.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (session.status !== "ACTIVE") {
    // Idempotent — a double-click or a retried request returns the same
    // result rather than erroring, matching the finish semantics used
    // elsewhere (SOC Shift, Operation Zero Hour).
    return NextResponse.json({
      score: session.score,
      status: session.status,
      alreadyCompleted: true,
    });
  }

  const expectedCount = session.dataset.expectedArtifacts.length;
  // report-artifact/route.ts rejects anything not in expectedArtifacts before
  // a row is ever created, so every HuntArtifact row here is a correct find —
  // no separate correctness check is needed at finish time.
  const foundCount = await db.huntArtifact.count({ where: { sessionId } });
  const accuracyPct = expectedCount > 0 ? Math.round((foundCount / expectedCount) * 100) : 0;

  const endedAt = new Date();
  const duration = Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000);

  const parSeconds = PAR_SECONDS[session.dataset.difficulty] ?? 1200;
  const speedFactor = duration <= parSeconds ? 1.15 : duration <= parSeconds * 2 ? 1.0 : 0.85;
  const score = Math.min(100, Math.round(accuracyPct * speedFactor));

  const basePoints = BASE_POINTS[session.dataset.difficulty] ?? 250;
  const skillPoints = Math.round(basePoints * (accuracyPct / 100));

  await db.huntInvestigationSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", endedAt, duration, score },
  });

  if (skillPoints > 0 && user.role === "STUDENT") {
    await db.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: skillPoints },
        skillScore: { increment: skillPoints },
        coins: { increment: coinsForPoints(skillPoints) },
      },
    });
  }

  // Evidence spine. No MITRE tag: HuntDataset carries no technique map yet,
  // and claiming tactics we never verified would be dishonest — it still
  // contributes to overall skill points and activity mix, just not the
  // tactic matrix, same as an untagged lab.
  try {
    await recordEvidence({
      userId: user.id,
      activity: "HUNT",
      sourceId: session.id,
      result: accuracyPct >= 80 ? "SOLVED" : accuracyPct > 0 ? "PARTIAL" : "FAILED",
      skillPoints,
      slug: session.dataset.slug,
      title: session.dataset.name,
      difficulty: session.dataset.difficulty,
      score,
      maxScore: 100,
      attempts: session.queriesCount,
      timeSec: duration,
    });
  } catch {
    // additive telemetry
  }

  audit({
    actorId: user.id,
    action: "HUNT_COMPLETE",
    target: session.id,
    req,
    meta: { score, accuracyPct, foundCount, expectedCount, duration },
  });

  return NextResponse.json({
    score,
    accuracyPct,
    foundCount,
    expectedCount,
    skillPoints,
    duration,
    status: "COMPLETED",
  });
}
