import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { buildWorldState } from "@/lib/simulation/engine";
import { getRoleConfig, listRoles } from "@/lib/simulation/runtime/roles/permissions";
import type { SimulationRole } from "@/lib/simulation/runtime/roles/permissions";
import type { WorldState } from "@/lib/simulation/types";

const VALID_ROLES = new Set<SimulationRole>([
  "INCIDENT_COMMANDER", "SOC_ANALYST", "THREAT_HUNTER",
  "IT_OPERATIONS", "LEGAL", "PR", "EXECUTIVE",
]);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const roleParam = url.searchParams.get("role")?.toUpperCase() as SimulationRole | null;

  if (!roleParam || !VALID_ROLES.has(roleParam)) {
    return NextResponse.json(
      { error: "invalid_role", validRoles: listRoles().map((r) => r.id) },
      { status: 400 }
    );
  }

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const worldState = buildWorldState(session.events);
  const config = getRoleConfig(roleParam);

  // Filter events for role
  const filteredEvents = session.events.filter((e) => {
    if (config.visibleEventTypes !== "*" && !(config.visibleEventTypes as string[]).includes(e.type)) return false;
    if (e.type === "TELEMETRY_ALERT" && !config.includeHiddenTelemetry) {
      if ((e.payload as Record<string, unknown>).visible === false) return false;
    }
    if (e.type === "PRESSURE_EVENT" && roleParam === "LEGAL") {
      const source = (e.payload as Record<string, unknown>).source as string;
      if (!["LEGAL", "REGULATOR"].includes(source)) return false;
    }
    if (e.type === "PRESSURE_EVENT" && roleParam === "PR") {
      const source = (e.payload as Record<string, unknown>).source as string;
      if (!["CEO", "PR", "HR"].includes(source)) return false;
    }
    return true;
  });

  // Filter world state fields for role
  const filteredWorldState: Partial<WorldState> = {};
  for (const field of config.worldStateFields) {
    (filteredWorldState as Record<string, unknown>)[field] = worldState[field];
  }

  return NextResponse.json({
    role: roleParam,
    roleLabel: config.label,
    canTakeActions: config.canTakeActions,
    sessionId: session.id,
    status: session.status,
    worldState: filteredWorldState,
    events: filteredEvents.map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      payload: e.payload,
      narrative: e.narrative,
      createdAt: e.createdAt,
    })),
  });
}
