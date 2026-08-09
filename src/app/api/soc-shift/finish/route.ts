import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { coinsForPoints } from "@/lib/soc-league";
import { audit } from "@/lib/audit";
import { recordEvidence } from "@/lib/evidence";

const Body = z.object({ attemptId: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const attempt = await db.socShiftAttempt.findUnique({
    where: { id: parsed.data.attemptId },
    include: { triages: true, shift: { include: { alerts: true } } },
  });
  if (!attempt || attempt.userId !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (attempt.completedAt) {
    return NextResponse.json({ score: attempt.score, accuracyPct: attempt.accuracyPct, alreadyCompleted: true });
  }

  const totalAlerts = attempt.shift.alerts.length;
  const correctCount = attempt.triages.filter((t) => t.correct).length;
  const accuracyPct = totalAlerts > 0 ? Math.round((correctCount / totalAlerts) * 100) : 0;
  const score = correctCount * 50;

  await db.$transaction([
    db.socShiftAttempt.update({
      where: { id: attempt.id },
      data: { completedAt: new Date(), score, accuracyPct },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        skillScore: { increment: score },
        coins: { increment: coinsForPoints(score) },
      },
    }),
  ]);

  // Evidence spine — best-effort. SOC Shift accuracy is exactly the kind of
  // blue-team signal the skill profile should carry.
  try {
    await recordEvidence({
      userId: user.id,
      activity: "SOC_SHIFT",
      sourceId: attempt.id,
      result: accuracyPct >= 50 ? "SOLVED" : "PARTIAL",
      skillPoints: score,
      title: "SOC Shift",
      score,
      maxScore: totalAlerts * 50,
      attempts: 1,
    });
  } catch {
    // additive telemetry
  }

  audit({
    actorId: user.id,
    action: "SOC_SHIFT_COMPLETE",
    target: attempt.shiftId,
    req,
    meta: { score, accuracyPct, correctCount, totalAlerts },
  });

  return NextResponse.json({ score, accuracyPct, correctCount, totalAlerts });
}
