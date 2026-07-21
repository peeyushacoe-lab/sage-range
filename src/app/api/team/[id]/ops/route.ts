import { NextResponse } from "next/server";
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
        include: { user: { select: { id: true, displayName: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      notes: {
        include: { author: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: "asc" },
        take: 50,
      },
      evidence: {
        include: { pinnedBy: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
      tasks: {
        include: { createdBy: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!teamSession) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isMember = teamSession.members.some((m) => m.userId === user.id);
  if (!isMember) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Fetch last 30 simulation events if session is active
  let simEvents: { type: string; actor: string; narrative: string | null; createdAt: Date }[] = [];
  if (teamSession.sessionId) {
    simEvents = await db.simulationEvent.findMany({
      where: { sessionId: teamSession.sessionId },
      select: { type: true, actor: true, narrative: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  }

  return NextResponse.json({
    id: teamSession.id,
    code: teamSession.code,
    templateSlug: teamSession.templateSlug,
    status: teamSession.status,
    sessionId: teamSession.sessionId,
    leadId: teamSession.leadId,
    members: teamSession.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      name: m.user.displayName ?? m.user.email,
    })),
    notes: teamSession.notes.map((n) => ({
      id: n.id,
      content: n.content,
      authorName: n.author.displayName ?? n.author.email,
      createdAt: n.createdAt.toISOString(),
    })),
    evidence: teamSession.evidence.map((e) => ({
      id: e.id,
      title: e.title,
      content: e.content,
      tag: e.tag,
      pinnedByName: e.pinnedBy.displayName ?? e.pinnedBy.email,
      createdAt: e.createdAt.toISOString(),
    })),
    tasks: teamSession.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      assignedRole: t.assignedRole,
      done: t.done,
      createdByName: t.createdBy.displayName ?? t.createdBy.email,
      createdAt: t.createdAt.toISOString(),
    })),
    simEvents: simEvents.map((e) => ({
      type: e.type,
      actor: e.actor,
      narrative: e.narrative,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}
