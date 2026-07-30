import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { voteOnWriteup, getWriteupScore } from "@/lib/social";

const Body = z.object({ value: z.union([z.literal(1), z.literal(-1)]) });

/** Current net score for a writeup. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ writeupId: string }> },
) {
  const { writeupId } = await params;
  const score = await getWriteupScore(writeupId);
  return NextResponse.json({ writeupId, score });
}

/** Cast a vote. Sending the same value again clears it. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ writeupId: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Vote must be +1 or -1" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`writeup-vote:${user.id}`, { max: 200, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { writeupId } = await params;
  const result = await voteOnWriteup({
    userId: user.id,
    writeupId,
    value: parsed.data.value,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
