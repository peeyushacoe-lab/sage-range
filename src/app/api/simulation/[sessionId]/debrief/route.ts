import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import type { CompanyProfile } from "@/lib/simulation/types";
import { generateDebrief } from "@/lib/simulation/runtime/scoring/debrief";
import { generateCandidateAssessment } from "@/lib/simulation/runtime/scoring/assessment";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  if (!raw || raw.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (raw.status === "ACTIVE") {
    return NextResponse.json({ error: "session_still_active" }, { status: 409 });
  }

  const company = raw.companyData as CompanyProfile;
  const events = raw.events.map((e) => ({
    type: e.type,
    actor: e.actor,
    payload: e.payload,
    narrative: e.narrative,
  }));

  const endTime = raw.endedAt ?? new Date();
  const durationSeconds = Math.floor(
    (endTime.getTime() - raw.startedAt.getTime()) / 1000
  );

  const debrief = generateDebrief(events, company);
  const assessment = generateCandidateAssessment(debrief, durationSeconds);

  return NextResponse.json({
    sessionId: raw.id,
    status: raw.status,
    durationSeconds,
    scenarioId: raw.scenarioId ?? null,
    personaId: raw.personaId ?? null,
    company: { name: company.name, industry: company.industry },
    debrief,
    assessment,
  });
}
