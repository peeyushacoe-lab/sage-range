import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { submitPeerReview, getWriteupReviews } from "@/lib/social";

const Body = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(20).max(4000),
});

/** All reviews for a writeup, with the average rating. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ writeupId: string }> },
) {
  const { writeupId } = await params;
  const { reviews, average, count } = await getWriteupReviews(writeupId);

  return NextResponse.json({
    writeupId,
    average,
    count,
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      status: r.status,
      helpful: r.helpful,
      createdAt: r.createdAt,
      reviewer: {
        id: r.reviewer.id,
        displayName: r.reviewer.displayName || r.reviewer.email,
        avatarUrl: r.reviewer.avatarUrl,
      },
    })),
  });
}

/** Submit or update the caller's review of this writeup. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ writeupId: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Rating must be 1-5 and the comment at least 20 characters" },
      { status: 400 },
    );
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`peer-review:${user.id}`, { max: 50, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { writeupId } = await params;
  const result = await submitPeerReview({
    reviewerId: user.id,
    writeupId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}
