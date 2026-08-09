import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { coinsForPoints } from "@/lib/soc-league";
import { evaluateRule, isPassing, type DatasetEvent, type Rule } from "@/lib/detection-engine";
import { recordEvidence } from "@/lib/evidence";

const Body = z.object({
  replayId: z.string().min(1),
  step: z.number().int().min(1),
  rule: z.object({
    logic: z.enum(["AND", "OR"]),
    conditions: z
      .array(
        z.object({
          field: z.string().min(1).max(64),
          operator: z.enum(["equals", "contains", "not_contains", "starts_with"]),
          value: z.string().min(1).max(256),
        })
      )
      .max(10),
  }),
  finalize: z.boolean().optional(),
});

type StoredStep = { step: number; narrative: string; events: DatasetEvent[] };

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (parsed.data.rule.conditions.length === 0) {
    return NextResponse.json({ error: "empty_rule" }, { status: 400 });
  }

  const rl = await rateLimit(`purple-team-eval:${user.id}:${parsed.data.replayId}`, { max: 60, windowSec: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const replay = await db.purpleTeamReplay.findUnique({ where: { id: parsed.data.replayId } });
  if (!replay || !replay.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const steps = replay.steps as unknown as StoredStep[];
  const clampedStep = Math.min(parsed.data.step, steps.length);
  const cumulativeEvents = steps.filter((s) => s.step <= clampedStep).flatMap((s) => s.events);

  const rule = parsed.data.rule as Rule;
  const evalResult = evaluateRule(rule, cumulativeEvents);
  const passed = isPassing(evalResult);
  const isLastStep = clampedStep === steps.length;

  const existing = await db.purpleTeamReplaySession.findUnique({
    where: { userId_replayId: { userId: user.id, replayId: replay.id } },
  });
  const alreadyCompleted = !!existing?.completedAt;

  const session = await db.purpleTeamReplaySession.upsert({
    where: { userId_replayId: { userId: user.id, replayId: replay.id } },
    update: {
      currentStep: Math.max(existing?.currentStep ?? 1, clampedStep),
      bestF1: Math.max(existing?.bestF1 ?? 0, evalResult.f1),
      completedAt: !alreadyCompleted && parsed.data.finalize && isLastStep && passed ? new Date() : existing?.completedAt,
    },
    create: {
      userId: user.id,
      replayId: replay.id,
      currentStep: clampedStep,
      bestF1: evalResult.f1,
      completedAt: parsed.data.finalize && isLastStep && passed ? new Date() : null,
    },
  });

  let awardedPoints = 0;
  const justCompleted = !alreadyCompleted && !!session.completedAt;
  if (justCompleted && user.role === "STUDENT") {
    awardedPoints = Math.round(evalResult.f1 * replay.points);
    await db.user.update({
      where: { id: user.id },
      data: {
        skillScore: { increment: awardedPoints },
        xp: { increment: awardedPoints },
        coins: { increment: coinsForPoints(awardedPoints) },
      },
    });
    audit({ actorId: user.id, action: "PURPLE_TEAM_REPLAY_COMPLETE", target: replay.id, req, meta: { f1: evalResult.f1, awardedPoints } });

    // Evidence spine — best-effort. Purple-team work fed the skill profile by
    // zero before; now a completed replay is evidence like anything else.
    try {
      await recordEvidence({
        userId: user.id,
        activity: "PURPLE_TEAM",
        sourceId: session.id,
        result: "SOLVED",
        skillPoints: awardedPoints,
        slug: replay.slug,
        title: replay.title,
        score: awardedPoints,
        maxScore: replay.points,
      });
    } catch {
      // additive telemetry
    }
  }

  const matched = cumulativeEvents
    .filter((e) => evalResult.matchedEventIds.includes(e.id))
    .map((e) => ({ id: e.id, isMalicious: e.isMalicious }));

  return NextResponse.json({
    precision: evalResult.precision,
    recall: evalResult.recall,
    f1: evalResult.f1,
    truePositives: evalResult.truePositives,
    falsePositives: evalResult.falsePositives,
    falseNegatives: evalResult.falseNegatives,
    trueNegatives: evalResult.trueNegatives,
    passed,
    isLastStep,
    completed: !!session.completedAt,
    awardedPoints,
    matched,
  });
}
