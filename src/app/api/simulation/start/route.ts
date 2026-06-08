import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { track } from "@/lib/analytics";
import { getTemplate } from "@/lib/simulation/engine";
import { generateCompanyProfile } from "@/lib/simulation/narrator";
import { getExecutivesForTemplate } from "@/lib/simulation/runtime/executives";
import { getScenario } from "@/lib/simulation/runtime/scenarios/manifest";
import { generateOrganization } from "@/lib/simulation/runtime/company/generator";
import type { IndustryArchetypeId } from "@/lib/simulation/runtime/company/generator";

const Body = z.object({
  templateSlug: z.string().min(1),
  scenarioId: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { templateSlug, scenarioId } = parsed.data;
  const template = getTemplate(templateSlug);
  if (!template) return NextResponse.json({ error: "template_not_found" }, { status: 404 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Generate company data BEFORE the transaction — may involve an async AI call
  // and long-running operations must not hold a DB transaction open.
  const scenario = scenarioId ? getScenario(scenarioId) : null;

  let companyData;
  if (scenario) {
    companyData = generateOrganization(scenario.archetypeId as IndustryArchetypeId);
  } else {
    companyData = await generateCompanyProfile(template.industry);
    companyData.executives = getExecutivesForTemplate(templateSlug);
  }

  if (!companyData.executives || companyData.executives.length === 0) {
    companyData.executives = getExecutivesForTemplate(templateSlug);
  }

  const jp = <T>(v: T) => JSON.parse(JSON.stringify(v)) as object;

  const startingEvents = [
    {
      type: "SESSION_STARTED",
      actor: "SYSTEM",
      payload: jp({ templateSlug, scenarioId: scenarioId ?? null, personaId: scenario?.personaId ?? null, initialStage: "NORMAL" }),
      narrative: `Simulation initialized for ${companyData.name}. Threat intelligence active. Begin your assessment.`,
    },
    ...(scenario?.startingConditions?.activeControls ?? []).map((controlId) => ({
      type: "STUDENT_ACTION",
      actor: "SYSTEM",
      payload: jp({ actionId: controlId, label: `Pre-configured: ${controlId.replace(/_/g, " ")}`, scoreChange: 0, stealthChange: 0, stageBlocker: false }),
      narrative: `[PRE-CONFIGURED] ${controlId.replace(/_/g, " ")} was active at scenario start.`,
    })),
  ];

  // Atomic: upsert ScenarioTemplate FK record + create SimulationSession together.
  // If either write fails, neither persists — no orphaned template records.
  const session = await db.$transaction(async (tx) => {
    const dbTemplate = await tx.scenarioTemplate.upsert({
      where: { slug: templateSlug },
      update: {},
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        industry: template.industry,
        difficulty: template.difficulty,
      },
    });

    return tx.simulationSession.create({
      data: {
        userId: user.id,
        templateId: dbTemplate.id,
        companyData,
        currentStage: "NORMAL",
        status: "ACTIVE",
        scenarioId: scenarioId ?? null,
        personaId: scenario?.personaId ?? null,
        events: { create: startingEvents },
      },
    });
  });

  track("simulation.started", user.id, {
    sessionId: session.id,
    templateSlug,
    scenarioId: scenarioId ?? null,
  });

  return NextResponse.json({
    sessionId: session.id,
    scenario: scenario
      ? {
          id: scenario.id,
          title: scenario.title,
          personaId: scenario.personaId,
          difficulty: scenario.difficulty,
          estimatedMinutes: scenario.estimatedMinutes,
        }
      : null,
    company: { name: companyData.name, industry: companyData.industry },
  });
}
