import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { coinsForPoints } from "@/lib/soc-league";
import { evaluateRule, isPassing, type DatasetEvent, type Rule } from "@/lib/detection-engine";

const Body = z.object({
  challengeId: z.string().min(1),
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
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (parsed.data.rule.conditions.length === 0) {
    return NextResponse.json({ error: "empty_rule" }, { status: 400 });
  }

  const rl = await rateLimit(`detection-submit:${user.id}:${parsed.data.challengeId}`, { max: 30, windowSec: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const challenge = await db.detectionChallenge.findUnique({ where: { id: parsed.data.challengeId } });
  if (!challenge || !challenge.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const events = challenge.events as unknown as DatasetEvent[];
  const rule = parsed.data.rule as Rule;
  const evalResult = evaluateRule(rule, events);
  const passed = isPassing(evalResult);
  const score = passed ? Math.round(evalResult.f1 * challenge.points) : 0;

  const alreadyPassed = await db.detectionSubmission.findFirst({
    where: { userId: user.id, challengeId: challenge.id, passed: true },
  });

  await db.detectionSubmission.create({
    data: {
      userId: user.id,
      challengeId: challenge.id,
      rule: rule as object,
      truePositives: evalResult.truePositives,
      falsePositives: evalResult.falsePositives,
      falseNegatives: evalResult.falseNegatives,
      trueNegatives: evalResult.trueNegatives,
      precision: evalResult.precision,
      recall: evalResult.recall,
      f1: evalResult.f1,
      score,
      passed,
    },
  });

  // Only award points the first time a student reaches the passing threshold
  // for this challenge — resubmitting to try for a higher F1 doesn't
  // double-award.
  if (passed && !alreadyPassed && user.role === "STUDENT") {
    await db.user.update({
      where: { id: user.id },
      data: {
        skillScore: { increment: score },
        xp: { increment: score },
        coins: { increment: coinsForPoints(score) },
      },
    });
    audit({ actorId: user.id, action: "DETECTION_CHALLENGE_SUBMIT", target: challenge.id, req, meta: { passed, score } });

    // Award competition points for any active competition that lists this
    // challenge's slug — same pattern as /api/labs/submit/route.ts, just
    // extended to cover DetectionChallenge slugs alongside Lab slugs so a
    // "Purple Team Cup"-style competition can require both.
    try {
      const now = new Date();
      const activeEntries = await db.competitionEntry.findMany({
        where: { userId: user.id, competition: { published: true, startDate: { lte: now }, endDate: { gte: now } } },
        include: { competition: true },
      });
      for (const entry of activeEntries) {
        const slugs = entry.competition.labSlugs as string[];
        if (slugs.includes(challenge.slug)) {
          await db.competitionEntry.update({ where: { id: entry.id }, data: { score: { increment: score } } });
        }
      }
    } catch {
      // Never fail the submission due to competition scoring errors
    }
  }

  const matched = events
    .filter((e) => evalResult.matchedEventIds.includes(e.id))
    .map((e) => ({ id: e.id, isMalicious: e.isMalicious }));

  return NextResponse.json({
    truePositives: evalResult.truePositives,
    falsePositives: evalResult.falsePositives,
    falseNegatives: evalResult.falseNegatives,
    trueNegatives: evalResult.trueNegatives,
    precision: evalResult.precision,
    recall: evalResult.recall,
    f1: evalResult.f1,
    passed,
    score: passed ? score : 0,
    matched,
  });
}
