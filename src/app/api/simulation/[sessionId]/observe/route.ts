import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { buildWorldState } from "@/lib/simulation/engine";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "INSTRUCTOR" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      template: { select: { name: true, slug: true, industry: true } },
      events: { orderBy: { createdAt: "asc" } },
      user: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Verify this student is enrolled in one of the instructor's classrooms
  if (me.role !== "ADMIN") {
    const enrollment = await db.classroomEnrollment.findFirst({
      where: {
        userId: session.userId,
        classroom: { instructorId: me.id },
      },
    });
    if (!enrollment) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const worldState = buildWorldState(session.events);

  // Current stage from last STAGE_ADVANCE event
  const lastStageEvent = [...session.events].reverse().find((e) => e.type === "STAGE_ADVANCE");
  const currentStage = lastStageEvent
    ? (lastStageEvent.payload as Record<string, unknown>).to as string
    : "NORMAL";

  // Recent decisions (last 10)
  const recentDecisions = session.events
    .filter((e) => e.type === "STUDENT_ACTION")
    .slice(-10)
    .map((e) => {
      const p = e.payload as Record<string, unknown>;
      return {
        label: p.label as string,
        scoreChange: p.scoreChange as number,
        stageBlocker: p.stageBlocker as boolean,
        takenAt: e.createdAt.toISOString(),
      };
    });

  // Recent telemetry alerts (last 5)
  const recentAlerts = session.events
    .filter((e) => e.type === "TELEMETRY_ALERT")
    .slice(-5)
    .map((e) => {
      const p = e.payload as Record<string, unknown>;
      return {
        severity: p.severity as string,
        source: p.source as string,
        narrative: e.narrative,
        createdAt: e.createdAt.toISOString(),
      };
    });

  const durationSec = Math.floor(
    (Date.now() - session.startedAt.getTime()) / 1000
  );

  return NextResponse.json({
    sessionId,
    student: { id: session.user.id, name: session.user.displayName, email: session.user.email },
    scenario: session.template.name,
    industry: session.template.industry,
    status: session.status,
    currentStage,
    score: worldState.score,
    durationSec,
    decisionsCount: recentDecisions.length,
    recentDecisions,
    recentAlerts,
    systemStatuses: worldState.systemStatuses,
    dataExfiltrated: worldState.dataExfiltrated,
    ransomwareDeployed: worldState.ransomwareDeployed,
    updatedAt: new Date().toISOString(),
  });
}
