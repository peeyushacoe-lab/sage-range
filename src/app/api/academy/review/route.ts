import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { getSession, gradeCard } from "@/lib/academy-review";
import { isGrade } from "@/lib/spaced-repetition";

export const dynamic = "force-dynamic";

/** The cards due now, plus deck counters for the header. */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { cards, stats, nextDueAt } = await getSession(user.id);
  return NextResponse.json({
    cards: cards.map((c) => ({
      id: c.id,
      front: c.front,
      back: c.back,
      lessonId: c.lessonId,
      lessonTitle: c.lessonTitle,
      courseSlug: c.courseSlug,
      courseTitle: c.courseTitle,
      state: {
        repetitions: c.state.repetitions,
        intervalDays: c.state.intervalDays,
        easeFactor: c.state.easeFactor,
        dueAt: c.state.dueAt.toISOString(),
        lapses: c.state.lapses,
        reviews: c.state.reviews,
      },
    })),
    stats,
    nextDueAt: nextDueAt?.toISOString() ?? null,
  });
}

/** Record one graded card. */
export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // A review session is a burst of quick answers, so the ceiling is generous —
  // it exists to stop a script farming the endpoint, not to pace a learner.
  const limit = await rateLimit(`academy-review:${user.id}`, { max: 600, windowSec: 3600 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { flashcardId, grade } = (body ?? {}) as Record<string, unknown>;
  if (typeof flashcardId !== "string" || !flashcardId) {
    return NextResponse.json({ error: "flashcardId required" }, { status: 400 });
  }
  if (!isGrade(grade)) {
    return NextResponse.json({ error: "grade must be again|hard|good|easy" }, { status: 400 });
  }

  const outcome = await gradeCard(user.id, flashcardId, grade);
  if (!outcome) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ...outcome,
    dueAt: outcome.dueAt.toISOString(),
  });
}
