import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import {
  getRecommendedHint,
  checkHintFrequencyLimit,
  logHintShown,
} from "@/lib/ai-mentor";

const Body = z.object({
  labId: z.string(),
  stage: z.string(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]),
  attemptCount: z.number().optional(),
});

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as unknown;
    const parsed = Body.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }

    const { labId, stage, difficulty, attemptCount } = parsed.data;

    // Validate lab exists
    const lab = await db.lab.findUnique({ where: { id: labId } });
    if (!lab) {
      return NextResponse.json({ error: "lab_not_found" }, { status: 404 });
    }

    // Validate stage format (must be non-empty string)
    if (!stage || stage.trim().length === 0) {
      return NextResponse.json({ error: "invalid_stage" }, { status: 400 });
    }

    // Check frequency limit
    const frequencyCheck = await checkHintFrequencyLimit(user.id, labId, stage);
    if (!frequencyCheck.allowed) {
      return NextResponse.json(
        {
          error: "rate_limited",
          nextHintEligibleAt: frequencyCheck.nextEligibleAt,
        },
        { status: 429 }
      );
    }

    // Get recommended hint
    const hint = await getRecommendedHint(labId, stage, difficulty, attemptCount);
    if (!hint) {
      return NextResponse.json({ error: "no_hints_available" }, { status: 404 });
    }

    // Get quality stats
    const quality = await db.mentorHintQuality.findUnique({
      where: { hintId: hint.id },
    });

    // Log the hint shown
    await logHintShown(user.id, labId, stage, hint.id);

    // Record UsedHint entry
    const usedHint = await db.usedHint.upsert({
      where: { userId_hintId: { userId: user.id, hintId: hint.id } },
      create: {
        userId: user.id,
        hintId: hint.id,
        contextDifficulty: difficulty,
      },
      update: {
        contextDifficulty: difficulty,
      },
    });

    // Calculate next eligible time
    const nextHintEligibleAt = new Date(Date.now() + 5 * 60 * 1000);

    return NextResponse.json({
      hintId: hint.id,
      text: hint.text,
      quality: {
        avgScore: quality?.avgScore ?? 5.0,
        helpfulCount: quality?.helpfulCount ?? 0,
        submissionRate: quality?.submissionRate ?? 0,
      },
      nextHintEligibleAt,
    });
  } catch (error) {
    console.error("[AI Mentor] Error in GET /api/mentor/hint:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
