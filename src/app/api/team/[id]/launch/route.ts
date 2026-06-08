import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getTemplate } from "@/lib/simulation/engine";
import { generateCompanyProfile } from "@/lib/simulation/narrator";
import { getExecutivesForTemplate } from "@/lib/simulation/runtime/executives";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const teamSession = await db.teamSession.findUnique({
    where: { id },
    include: { members: true },
  });

  if (!teamSession) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Only IR_LEAD (creator) can launch
  if (teamSession.leadId !== user.id) {
    return NextResponse.json({ error: "not_lead" }, { status: 403 });
  }

  if (teamSession.status !== "LOBBY") {
    return NextResponse.json({ error: "already_launched" }, { status: 409 });
  }

  const { members } = teamSession;
  if (members.length < 2) {
    return NextResponse.json({ error: "need_at_least_2_members" }, { status: 409 });
  }

  const allHaveRoles = members.every((m) => m.role !== null);
  if (!allHaveRoles) {
    return NextResponse.json({ error: "not_all_roles_assigned" }, { status: 409 });
  }

  const template = getTemplate(teamSession.templateSlug);
  if (!template) return NextResponse.json({ error: "template_not_found" }, { status: 404 });

  // Upsert ScenarioTemplate record
  const dbTemplate = await db.scenarioTemplate.upsert({
    where: { slug: teamSession.templateSlug },
    update: {},
    create: {
      slug: template.slug,
      name: template.name,
      description: template.description,
      industry: template.industry,
      difficulty: template.difficulty,
    },
  });

  const companyData = await generateCompanyProfile(template.industry);
  companyData.executives = getExecutivesForTemplate(teamSession.templateSlug);

  const simSession = await db.simulationSession.create({
    data: {
      userId: user.id,
      templateId: dbTemplate.id,
      companyData,
      currentStage: "NORMAL",
      status: "ACTIVE",
      events: {
        create: {
          type: "SESSION_STARTED",
          actor: "SYSTEM",
          payload: { templateSlug: teamSession.templateSlug, initialStage: "NORMAL", teamMode: true },
          narrative: `Team simulation initialized for ${companyData.name}. All analysts online. Threat intelligence active.`,
        },
      },
    },
  });

  await db.teamSession.update({
    where: { id },
    data: {
      sessionId: simSession.id,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({ sessionId: simSession.id });
}
