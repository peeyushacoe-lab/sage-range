import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { submitHintFeedback, expandHintExpiryAfterFeedback } from "@/lib/ai-mentor";

const Body = z.object({
  usedHintId: z.string(),
  score: z.number().min(0).max(10).int(),
  wasHelpful: z.boolean(),
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

    const { usedHintId, score, wasHelpful } = parsed.data;

    // Verify UsedHint belongs to user
    const usedHint = await db.usedHint.findUnique({
      where: { id: usedHintId },
      include: { hint: true },
    });

    if (!usedHint) {
      return NextResponse.json({ error: "hint_not_found" }, { status: 404 });
    }

    if (usedHint.userId !== user.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    // Submit feedback
    const updated = await submitHintFeedback(usedHintId, score, wasHelpful);

    // Get updated quality stats
    const quality = await db.mentorHintQuality.findUnique({
      where: { hintId: usedHint.hint.id },
    });

    // Expand expiry after feedback
    const sequence = await db.mentorHintSequence.findFirst({
      where: {
        userId: user.id,
        labId: usedHint.hint.labId,
      },
    });

    if (sequence) {
      await expandHintExpiryAfterFeedback(
        user.id,
        usedHint.hint.labId,
        sequence.stage
      );
    }

    return NextResponse.json({
      newAvgScore: quality?.avgScore ?? 5.0,
      feedbackLogged: true,
      totalRatings: quality?.totalRatings ?? 1,
    });
  } catch (error) {
    console.error("[AI Mentor] Error in POST /api/mentor/feedback:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
