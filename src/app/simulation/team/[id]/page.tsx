import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { TeamLobbyClient } from "./_components/team-lobby-client";

export const dynamic = "force-dynamic";

export default async function TeamLobbyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const teamSession = await db.teamSession.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!teamSession) notFound();

  const isMember = teamSession.members.some((m) => m.userId === user.id);
  if (!isMember) redirect("/simulation/team");

  const initialData = {
    id: teamSession.id,
    code: teamSession.code,
    templateSlug: teamSession.templateSlug,
    status: teamSession.status as string,
    sessionId: teamSession.sessionId,
    leadId: teamSession.leadId,
    members: teamSession.members.map((m) => ({
      id: m.id,
      userId: m.userId,
      role: m.role as string | null,
      joinedAt: m.joinedAt.toISOString(),
      name: m.user.displayName ?? m.user.email,
      email: m.user.email,
    })),
  };

  return (
    <TeamLobbyClient
      teamId={id}
      currentUserId={user.id}
      initialData={initialData}
    />
  );
}
