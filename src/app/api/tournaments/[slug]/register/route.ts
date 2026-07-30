import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { registerEntrant } from "@/lib/tournaments";
import { getMembership } from "@/lib/squads";

/**
 * Register the caller. Solo tournaments enter the user directly; squad
 * tournaments enter their squad, which only the owner or an officer may do.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`tournament-register:${user.id}`, {
    max: 20,
    windowSec: 3600,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { slug } = await params;
  const tournament = await db.tournament.findUnique({
    where: { slug },
    select: { id: true, entrantType: true },
  });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  if (tournament.entrantType === "SOLO") {
    const result = await registerEntrant({
      tournamentId: tournament.id,
      userId: user.id,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }
    return NextResponse.json(result.data, { status: 201 });
  }

  const membership = await getMembership(user.id);
  if (!membership) {
    return NextResponse.json(
      { error: "You need a squad to enter this tournament" },
      { status: 403 },
    );
  }
  if (membership.role === "MEMBER") {
    return NextResponse.json(
      { error: "Only the owner or an officer can enter the squad" },
      { status: 403 },
    );
  }

  const result = await registerEntrant({
    tournamentId: tournament.id,
    squadId: membership.squadId,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}
