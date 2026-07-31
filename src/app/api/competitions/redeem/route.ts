import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { inviteCodeMatches } from "@/lib/competition-access";

const Body = z.object({ inviteCode: z.string().min(1).max(64) });

/**
 * Redeem an invite code for a private competition.
 *
 * Rate limited because this endpoint accepts a guessable secret: without a
 * limit it is an oracle for brute-forcing invite codes. Every failure returns
 * the same message so a valid-but-wrong-state code cannot be distinguished
 * from a nonexistent one.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(`competition-redeem:${user.id}`, {
    max: 20,
    windowSec: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const code = parsed.data.inviteCode.trim().toUpperCase();
  const notFound = NextResponse.json(
    { error: "That code did not match an open competition" },
    { status: 404 },
  );

  const competition = await db.competition.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      slug: true,
      published: true,
      visibility: true,
      inviteCode: true,
      startDate: true,
      endDate: true,
    },
  });

  if (!competition || !competition.published) return notFound;
  // A code only opens the event it belongs to, and only while that event is
  // actually invite-gated.
  if (competition.visibility !== "INVITE_ONLY") return notFound;
  if (!inviteCodeMatches(competition.inviteCode, code)) return notFound;

  const now = new Date();
  if (now > competition.endDate) return notFound;

  // Entering before the start is allowed — the entry simply scores nothing
  // until the competition opens — so an invitee can register in advance.
  await db.competitionEntry.upsert({
    where: {
      competitionId_userId: { competitionId: competition.id, userId: user.id },
    },
    create: { competitionId: competition.id, userId: user.id, score: 0 },
    update: {},
    select: { id: true },
  });

  return NextResponse.json({ slug: competition.slug });
}
