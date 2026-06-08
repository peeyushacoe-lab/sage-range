import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  role: z.enum(["IR_LEAD", "FORENSICS", "LEGAL", "COMMS"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { role } = parsed.data;

  const teamSession = await db.teamSession.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!teamSession) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (teamSession.status !== "LOBBY") {
    return NextResponse.json({ error: "session_not_in_lobby" }, { status: 409 });
  }

  const myMember = teamSession.members.find((m) => m.userId === user.id);
  if (!myMember) return NextResponse.json({ error: "not_a_member" }, { status: 403 });

  // IR_LEAD role is reserved for the team lead (creator)
  if (role === "IR_LEAD") {
    return NextResponse.json({ error: "role_reserved" }, { status: 409 });
  }

  // Check if another member already has this role
  const roleTaken = teamSession.members.find(
    (m) => m.role === role && m.userId !== user.id
  );
  if (roleTaken) {
    return NextResponse.json({ error: "role_taken" }, { status: 409 });
  }

  await db.teamMember.update({
    where: { id: myMember.id },
    data: { role },
  });

  return NextResponse.json({ ok: true });
}
