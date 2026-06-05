import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildWorldState, getAvailableActions, getStageDefinition } from "@/lib/simulation/engine";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { buildInfluenceGraph } from "@/lib/simulation/runtime/social/graph";
import { applyContagion } from "@/lib/simulation/runtime/social/contagion";
import { computeOrganizationHealth } from "@/lib/simulation/runtime/social/sentiment";
import { getExecutivesForTemplate } from "@/lib/simulation/runtime/executives";
import type { AttackStage, CompanyProfile, Executive } from "@/lib/simulation/types";
import { WarRoomClient } from "./_components/war-room-client";

export const dynamic = "force-dynamic";

export default async function WarRoom({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ teamId?: string }>;
}) {
  const { sessionId } = await params;
  const { teamId } = await searchParams;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
  });

  // Allow access if user owns the session OR is a team member for it
  if (!session) notFound();

  let teamRole: string | undefined;
  let teamMembers: Array<{ name: string; role: string }> | undefined;

  if (teamId) {
    const teamSession = await db.teamSession.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: { select: { displayName: true, email: true } } },
        },
      },
    });
    if (teamSession && teamSession.sessionId === sessionId) {
      const myMember = teamSession.members.find((m) => m.userId === user.id);
      if (myMember?.role) {
        teamRole = myMember.role;
        teamMembers = teamSession.members
          .filter((m) => m.role)
          .map((m) => ({
            name: m.user.displayName ?? m.user.email,
            role: m.role as string,
          }));
      }
    }
  }

  // For solo sessions, enforce ownership. For team sessions, session.userId is the lead.
  if (!teamRole && session.userId !== user.id) notFound();

  const worldState = buildWorldState(session.events);
  const availableActions =
    worldState.status === "ACTIVE"
      ? getAvailableActions(session.template.slug, worldState)
      : [];
  const stageDef = getStageDefinition(session.template.slug, worldState.stage as AttackStage);
  const company = session.companyData as CompanyProfile;
  const rawStates = buildEmployeeStates(company.employees, session.events);
  const graph = buildInfluenceGraph(company.employees);
  const employeeStates = applyContagion(rawStates, company.employees, graph);
  const offlineCount = Object.values(worldState.systemStatuses).filter((s) => s === "OFFLINE").length;
  const organizationHealth = computeOrganizationHealth(employeeStates, offlineCount);

  const baseExecs = (company.executives && company.executives.length > 0)
    ? company.executives
    : getExecutivesForTemplate(session.template.slug);
  const latestDemands: Record<string, string> = {};
  for (const ev of session.events) {
    if (ev.type === "EXEC_PRESSURE") {
      const p = ev.payload as Record<string, unknown>;
      const role = p.role as string;
      const demand = p.demand as string;
      if (role && demand) latestDemands[role] = demand;
    }
  }
  const executives: Executive[] = baseExecs.map((exec) => ({
    ...exec,
    satisfaction: worldState.executiveSatisfaction[exec.role] ?? exec.satisfaction,
    demand: latestDemands[exec.role] ?? exec.demand,
  }));

  const initialData = {
    session: {
      id: session.id,
      status: session.status as string,
      currentStage: session.currentStage,
      score: worldState.score,
      startedAt: session.startedAt.toISOString(),
      template: {
        slug: session.template.slug,
        name: session.template.name,
        description: session.template.description,
        difficulty: session.template.difficulty,
      },
      companyData: session.companyData as CompanyProfile,
      personaId: session.personaId ?? null,
    },
    events: session.events.map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      payload: e.payload,
      narrative: e.narrative,
      createdAt: e.createdAt.toISOString(),
    })),
    worldState,
    availableActions,
    stageDefinition: stageDef
      ? { id: stageDef.id, label: stageDef.label, brief: stageDef.brief, threat: stageDef.threat, evidence: stageDef.evidence }
      : null,
    employeeStates,
    organizationHealth,
    executives,
  };

  return (
    <WarRoomClient
      sessionId={sessionId}
      initialData={initialData}
      teamRole={teamRole}
      teamMembers={teamMembers}
      personaId={session.personaId}
    />
  );
}
