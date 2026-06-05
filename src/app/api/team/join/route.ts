import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ code: z.string().min(1) });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = parsed.data;

  const teamSession = await db.teamSession.findUnique({
    where: { code: code.toUpperCase() },
    include: { members: true },
  });

  if (!teamSession) {
    return NextResponse.json({ error: "invalid_code" }, { status: 404 });
  }

  if (teamSession.status !== "LOBBY") {
    return NextResponse.json({ error: "session_not_in_lobby" }, { status: 409 });
  }

  if (teamSession.members.length >= 4) {
    return NextResponse.json({ error: "team_full" }, { status: 409 });
  }

  const alreadyMember = teamSession.members.find((m) => m.userId === user.id);
  if (alreadyMember) {
    return NextResponse.json({ id: alreadyMember.id, teamSessionId: teamSession.id });
  }

  const member = await db.teamMember.create({
    data: {
      teamSessionId: teamSession.id,
      userId: user.id,
    },
  });

  return NextResponse.json({ id: member.id, teamSessionId: teamSession.id });
}
