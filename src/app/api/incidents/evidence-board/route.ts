import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { coinsForPoints } from "@/lib/soc-league";
import { recordEvidence } from "@/lib/evidence";
import { getCurrentWeeklyCase, updateWeeklyLeaderboardEntry } from "@/lib/weekly-incidents";

const TACTICS = [
  "INITIAL_ACCESS",
  "PERSISTENCE",
  "PRIVILEGE_ESCALATION",
  "LATERAL_MOVEMENT",
  "COMMAND_AND_CONTROL",
  "EXFILTRATION",
  "IMPACT",
] as const;

const Body = z.object({
  simulationId: z.string().min(1),
  categorization: z.record(z.string(), z.enum(TACTICS)),
  timelineOrder: z.array(z.string()),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { simulationId, categorization, timelineOrder } = parsed.data;

  const [artifacts, sim] = await Promise.all([
    db.incidentSimArtifact.findMany({ where: { simulationId }, orderBy: { order: "asc" } }),
    db.incidentSimulation.findUnique({ where: { id: simulationId }, select: { slug: true } }),
  ]);
  if (artifacts.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const taggedArtifacts = artifacts.filter((a) => a.tactic !== null);

  // Categorization scoring
  let categorizationCorrect = 0;
  const perItem: Record<string, { correct: boolean; correctTactic: string }> = {};
  for (const a of taggedArtifacts) {
    const studentTactic = categorization[a.id];
    const isCorrect = studentTactic === a.tactic;
    if (isCorrect) categorizationCorrect++;
    perItem[a.id] = { correct: isCorrect, correctTactic: a.tactic as string };
  }
  const categorizationAccuracy = taggedArtifacts.length > 0 ? categorizationCorrect / taggedArtifacts.length : 0;

  // Timeline scoring — canonical order is the authored artifact.order among
  // the same tactic-tagged subset; exact-position matches count as correct.
  const canonicalOrder = taggedArtifacts.map((a) => a.id);
  const studentOrderFiltered = timelineOrder.filter((id) => canonicalOrder.includes(id));
  let timelineCorrect = 0;
  for (let i = 0; i < canonicalOrder.length; i++) {
    if (studentOrderFiltered[i] === canonicalOrder[i]) timelineCorrect++;
  }
  const timelineAccuracy = canonicalOrder.length > 0 ? timelineCorrect / canonicalOrder.length : 0;

  const accuracyPct = Math.round(((categorizationAccuracy + timelineAccuracy) / 2) * 100);
  const score = categorizationCorrect * 60 + timelineCorrect * 20;

  const [board] = await db.$transaction([
    db.incidentSimEvidenceBoard.upsert({
      where: { userId_simulationId: { userId: user.id, simulationId } },
      update: { categorization, timelineOrder, score, accuracyPct, completedAt: new Date() },
      create: { userId: user.id, simulationId, categorization, timelineOrder, score, accuracyPct, completedAt: new Date() },
    }),
    db.user.update({
      where: { id: user.id },
      data: { skillScore: { increment: Math.round(score / 4) }, coins: { increment: coinsForPoints(score) } },
    }),
  ]);

  // Evidence spine — skillPoints mirrors the score/4 that hit skillScore, so
  // labs and this activity stay at parity with the live number.
  try {
    await recordEvidence({
      userId: user.id,
      activity: "INCIDENT",
      sourceId: board.id,
      result: accuracyPct >= 50 ? "SOLVED" : "PARTIAL",
      skillPoints: Math.round(score / 4),
      title: "Evidence board",
      score,
      attempts: 1,
    });
  } catch {
    // additive telemetry
  }

  // If this incident is this week's featured case, feed its evidence-board
  // score into WeeklyIncidentLeaderboard — nothing did before, so the
  // leaderboard/certificate cron (which does run correctly every Monday)
  // never had anything to rank. Not a completion by itself: the report is
  // what marks completedAt.
  if (sim) {
    try {
      const weeklyCase = await getCurrentWeeklyCase();
      if (weeklyCase && weeklyCase.incidentSlug === sim.slug) {
        await updateWeeklyLeaderboardEntry(user.id, weeklyCase.id, { evidenceBoardScore: score });
      }
    } catch {
      // additive — never blocks the evidence-board score itself
    }
  }

  return NextResponse.json({ score, accuracyPct, categorizationCorrect, taggedTotal: taggedArtifacts.length, timelineCorrect, perItem });
}
