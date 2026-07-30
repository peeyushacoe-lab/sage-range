import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { audit } from "@/lib/audit";
import { reportMatchResult } from "@/lib/tournaments";

const Body = z.object({
  matchId: z.string().min(1),
  winnerId: z.string().min(1),
  scoreA: z.number().int().min(0).optional(),
  scoreB: z.number().int().min(0).optional(),
});

/**
 * Report a match result. Admin-only: results decide the bracket, so they are
 * not self-reported by entrants.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await reportMatchResult(parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  await audit({
    actorId: user.id,
    action: "TOURNAMENT_MATCH_REPORT",
    target: parsed.data.matchId,
    meta: { winnerId: parsed.data.winnerId },
    req,
  });

  return NextResponse.json(result.data);
}
