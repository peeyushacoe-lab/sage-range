import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { submitInterview, scoreInterviewSession } from "@/lib/career";

const PostBody = z.object({
  sessionId: z.string().min(1),
  answers: z.record(z.string()),
});

const PatchBody = z.object({
  sessionId: z.string().min(1),
  answerScores: z.record(z.number().min(0).max(100)),
  feedback: z.string().max(4000).optional(),
});

/** Submit answers. Scoring is a separate reviewer step. */
export async function POST(req: Request) {
  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await submitInterview({
    userId: user.id,
    sessionId: parsed.data.sessionId,
    answers: parsed.data.answers,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}

/**
 * Apply reviewer scores. Restricted to instructors and admins — a candidate
 * must not be able to score their own interview.
 */
export async function PATCH(req: Request) {
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await scoreInterviewSession({
    sessionId: parsed.data.sessionId,
    answerScores: parsed.data.answerScores,
    feedback: parsed.data.feedback,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
