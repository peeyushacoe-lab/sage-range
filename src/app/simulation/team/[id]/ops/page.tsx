import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { OpsRoom } from "./_components/ops-room";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operations Room · Sage Vault" };

export default async function OpsRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const teamSession = await db.teamSession.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      notes:    { include: { author: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" }, take: 50 },
      evidence: { include: { pinnedBy: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" } },
      tasks:    { include: { createdBy: { select: { displayName: true, email: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!teamSession) notFound();

  const myMembership = teamSession.members.find((m) => m.userId === user.id);
  if (!myMembership) redirect("/simulation/team");

  // Fetch simulation events if session is running
  let simEvents: { type: string; actor: string; narrative: string | null; createdAt: Date }[] = [];
  if (teamSession.sessionId) {
    simEvents = await db.simulationEvent.findMany({
      where: { sessionId: teamSession.sessionId },
      select: { type: true, actor: true, narrative: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  }

  const initialData = {
    id: teamSession.id,
    code: teamSession.code,
    templateSlug: teamSession.templateSlug,
    status: teamSession.status as string,
    sessionId: teamSession.sessionId,
    leadId: teamSession.leadId,
    members: teamSession.members.map((m) => ({
      userId: m.userId,
      role: m.role as string | null,
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
      assignedRole: t.assignedRole as string | null,
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
  };

  return (
    <OpsRoom
      teamId={id}
      currentUserId={user.id}
      currentRole={myMembership.role as string | null}
      initialData={initialData}
    />
  );
}
