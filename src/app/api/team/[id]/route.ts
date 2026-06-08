import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const teamSession = await db.teamSession.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!teamSession) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Verify requester is a member
  const isMember = teamSession.members.some((m) => m.userId === user.id);
  if (!isMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({
    id: teamSession.id,
    code: teamSession.code,
    templateSlug: teamSession.templateSlug,
    status: teamSession.status,
    sessionId: teamSession.sessionId,
    leadId: teamSession.leadId,
    members: teamSession.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      name: m.user.displayName ?? m.user.email,
      email: m.user.email,
    })),
  });
}
