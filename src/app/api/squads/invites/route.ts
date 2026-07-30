import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { getMembership, inviteToSquad } from "@/lib/squads";

const Body = z.object({ inviteeId: z.string().min(1) });

/** Pending invites addressed to the caller. */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invites = await db.squadInvite.findMany({
    where: { inviteeId: user.id, status: "PENDING", expiresAt: { gt: new Date() } },
    include: {
      squad: { select: { id: true, slug: true, name: true, tag: true } },
      invitedBy: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    invites: invites.map((i) => ({
      id: i.id,
      squad: i.squad,
      invitedBy: i.invitedBy.displayName || i.invitedBy.email,
      expiresAt: i.expiresAt,
    })),
  });
}

/** Invite someone to the caller's squad. Officers and owner only. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`squad-invite:${user.id}`, { max: 30, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const membership = await getMembership(user.id);
  if (!membership) {
    return NextResponse.json({ error: "You are not in a squad" }, { status: 403 });
  }

  const result = await inviteToSquad({
    inviterId: user.id,
    inviteeId: parsed.data.inviteeId,
    squadId: membership.squadId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}
