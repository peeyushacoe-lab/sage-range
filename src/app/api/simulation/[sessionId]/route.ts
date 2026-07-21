import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import {
  buildWorldState,
  computeFinalScore,
  getAvailableActions,
  getStageDefinition,
  checkAutoAdvance,
} from "@/lib/simulation/engine";
import { narrateStageAdvance, generatePhishingEmail, generateEmployeeClick, narrateEmployeeReaction, narrateEmployeeStateMSG } from "@/lib/simulation/narrator";
import { buildNarrativeContext } from "@/lib/simulation/runtime/context";
import { getPendingPressures, pressureSourceToActor, formatPressureNarrative } from "@/lib/simulation/runtime/pressure";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { getTriggeredReactions } from "@/lib/simulation/runtime/humans/reactions";
import { buildInfluenceGraph } from "@/lib/simulation/runtime/social/graph";
import { applyContagion } from "@/lib/simulation/runtime/social/contagion";
import { computeOrganizationHealth } from "@/lib/simulation/runtime/social/sentiment";
import { getExecDemandsForStage, getExecutivesForTemplate } from "@/lib/simulation/runtime/executives";
import type { AttackStage, CompanyProfile, Executive } from "@/lib/simulation/types";
import { track } from "@/lib/analytics";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const worldState = buildWorldState(session.events);

  // Auto-advance check — happens lazily on poll
  if (worldState.status === "ACTIVE") {
    const lastStageChange = [...session.events]
      .reverse()
      .find((e) => e.type === "STAGE_ADVANCE" || e.type === "SESSION_STARTED");
    const lastChange = lastStageChange?.createdAt ?? session.startedAt;
    const elapsedSec = Math.floor((Date.now() - new Date(lastChange).getTime()) / 1000);

    const nextStage = checkAutoAdvance(session.template.slug, worldState.stage as AttackStage, elapsedSec);
    if (nextStage) {
      const company = session.companyData as CompanyProfile;
      const stageDef = getStageDefinition(session.template.slug, nextStage as AttackStage);
      const isTerminalBreach = stageDef?.breachOnAutoAdvance === true;

      // Build narrative context from recent events for richer AI output
      const narrativeContext = buildNarrativeContext(
        session.events.map((e) => ({ type: e.type, actor: e.actor, narrative: e.narrative })),
        company.name
      );

      const narrative = await narrateStageAdvance(worldState.stage, nextStage, company.name, narrativeContext);
      await db.simulationEvent.create({
        data: {
          sessionId: session.id,
          type: "STAGE_ADVANCE",
          actor: "ATTACKER",
          payload: { from: worldState.stage, to: nextStage, reason: "auto", breach: isTerminalBreach, threat: stageDef?.threat ?? "MEDIUM" },
          narrative,
        },
      });

      // Emit pressure events defined in the template for this stage
      const pendingPressures = getPendingPressures(session.template.slug, nextStage, worldState);
      if (pendingPressures.length > 0) {
        await db.simulationEvent.createMany({
          data: pendingPressures.map((p) => ({
            sessionId: session.id,
            type: "PRESSURE_EVENT",
            actor: pressureSourceToActor(p.source),
            payload: { id: p.id, source: p.source, message: p.message, urgency: p.urgency },
            narrative: formatPressureNarrative(p.source, p.message, company.name),
          })),
        });
      }

      // Emit exec pressure events for this stage transition
      const execDemands = getExecDemandsForStage(session.template.slug, nextStage);
      if (execDemands && !worldState.firedExecPressureStages.includes(nextStage)) {
        await db.simulationEvent.createMany({
          data: Object.entries(execDemands).map(([role, demand]) => ({
            sessionId: session.id,
            type: "EXEC_PRESSURE",
            actor: "EXEC",
            payload: { role, demand, stage: nextStage },
            narrative: `[${role}] ${demand}`,
          })),
        });
      }

      // Emit extra narrative events for specific stage transitions
      if (nextStage === "PHISHING_ACTIVE") {
        const highRisk = company.employees.find((e) => e.riskLevel === "HIGH") ?? company.employees[0];
        if (highRisk) {
          const emailNarrative = await generatePhishingEmail(company.name, highRisk.name, highRisk.title);
          await db.simulationEvent.create({
            data: {
              sessionId: session.id,
              type: "PHISHING_EMAIL",
              actor: "ATTACKER",
              payload: { target: highRisk.name },
              narrative: emailNarrative,
            },
          });
        }
      } else if (nextStage === "INITIAL_COMPROMISE") {
        const highRisk = company.employees.find((e) => e.riskLevel === "HIGH") ?? company.employees[0];
        if (highRisk) {
          const [clickNarrative, reactionNarrative] = await Promise.all([
            generateEmployeeClick(highRisk.name, company.name),
            narrateEmployeeReaction(highRisk.name, highRisk.title, nextStage, company.name),
          ]);
          await db.simulationEvent.createMany({
            data: [
              { sessionId: session.id, type: "ENDPOINT_ALERT", actor: "SYSTEM", payload: { employee: highRisk.name }, narrative: clickNarrative },
              { sessionId: session.id, type: "EMPLOYEE_MSG", actor: "SYSTEM", payload: { employee: highRisk.name }, narrative: reactionNarrative },
            ],
          });
        }
      } else if (nextStage === "LATERAL_MOVEMENT" || nextStage === "SUSPICIOUS_ACCESS") {
        // Emit an employee reaction for mid-game stages across both scenarios
        const medRisk = company.employees.find((e) => e.riskLevel === "MEDIUM") ?? company.employees[1] ?? company.employees[0];
        if (medRisk) {
          const reactionNarrative = await narrateEmployeeReaction(medRisk.name, medRisk.title, nextStage, company.name);
          await db.simulationEvent.create({
            data: {
              sessionId: session.id,
              type: "EMPLOYEE_MSG",
              actor: "SYSTEM",
              payload: { employee: medRisk.name },
              narrative: reactionNarrative,
            },
          });
        }
      }

      // Compute score with the advance event included so the stored value matches recomputed value.
      const elapsedBreachSec = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
      const breachScore = isTerminalBreach
        ? computeFinalScore(session.template.slug, buildWorldState([
            ...session.events,
            { type: "STAGE_ADVANCE", payload: { from: worldState.stage, to: nextStage, breach: true } } as unknown as typeof session.events[0],
          ]), elapsedBreachSec)
        : worldState.score;

      await db.simulationSession.update({
        where: { id: session.id },
        data: {
          currentStage: nextStage,
          status: isTerminalBreach ? "BREACHED" : "ACTIVE",
          ...(isTerminalBreach && { endedAt: new Date(), score: breachScore }),
        },
      });

      // Award participation XP on breach (no skill score — attacker won)
      if (isTerminalBreach) {
        if (user.role === "STUDENT") {
          await db.user.update({
            where: { id: user.id },
            data: { xp: { increment: breachScore } },
          });
        }
        track("simulation.completed", user.id, {
          sessionId: session.id,
          outcome: "BREACHED",
          score: breachScore,
          templateSlug: session.template.slug,
          cause: "auto_advance",
        });
      }

      // Reload with new events
      const refreshed = await db.simulationSession.findUnique({
        where: { id: session.id },
        include: { template: true, events: { orderBy: { createdAt: "asc" } } },
      });
      if (refreshed) {
        // Fire spontaneous employee reactions based on current psychological state
        if (!isTerminalBreach) {
          const empStates = buildEmployeeStates(company.employees, refreshed.events);

          // Find employees who already reacted since the last stage advance
          const lastAdvanceIdx = [...refreshed.events].reverse().findIndex((e) => e.type === "STAGE_ADVANCE");
          const eventsThisStage = lastAdvanceIdx >= 0 ? refreshed.events.slice(refreshed.events.length - lastAdvanceIdx) : refreshed.events;
          const reactedThisStage = new Set(
            eventsThisStage
              .filter((e) => e.type === "EMPLOYEE_MSG")
              .map((e) => (e.payload as Record<string, unknown>).employee as string)
              .filter(Boolean)
          );

          const reactions = getTriggeredReactions(empStates, company.employees, nextStage as AttackStage, reactedThisStage);
          if (reactions.length > 0) {
            const narratives = await Promise.all(
              reactions.map((r) => narrateEmployeeStateMSG(r.employeeName, r.employeeTitle, nextStage, r.reactionType, company.name))
            );
            await db.simulationEvent.createMany({
              data: reactions.map((r, i) => ({
                sessionId: session.id,
                type: "EMPLOYEE_MSG",
                actor: "SYSTEM",
                payload: { employee: r.employeeName, reactionType: r.reactionType },
                narrative: narratives[i],
              })),
            });
          }
        }
        return buildResponse(refreshed, buildWorldState(refreshed.events));
      }
    }
  }

  return buildResponse(session, worldState);
}

function buildExecutivesWithSatisfaction(
  templateSlug: string,
  companyData: CompanyProfile,
  worldState: ReturnType<typeof buildWorldState>,
  events: { type: string; payload: unknown }[]
): Executive[] {
  const baseExecs = (companyData.executives && companyData.executives.length > 0)
    ? companyData.executives
    : getExecutivesForTemplate(templateSlug);

  const latestDemands: Record<string, string> = {};
  for (const ev of events) {
    if (ev.type === "EXEC_PRESSURE") {
      const p = ev.payload as Record<string, unknown>;
      const role = p.role as string;
      const demand = p.demand as string;
      if (role && demand) latestDemands[role] = demand;
    }
  }

  return baseExecs.map((exec) => ({
    ...exec,
    satisfaction: worldState.executiveSatisfaction[exec.role] ?? exec.satisfaction,
    demand: latestDemands[exec.role] ?? exec.demand,
  }));
}

function buildResponse(
  session: Awaited<ReturnType<typeof db.simulationSession.findUnique>> & { template: { slug: string; name: string; description: string; difficulty: string }; events: { id: string; type: string; actor: string; payload: unknown; narrative: string | null; createdAt: Date }[] },
  worldState: ReturnType<typeof buildWorldState>
) {
  const templateSlug = session!.template.slug;
  const stageDef = getStageDefinition(templateSlug, worldState.stage as AttackStage);
  const availableActions = worldState.status === "ACTIVE"
    ? getAvailableActions(templateSlug, worldState)
    : [];

  const company = session!.companyData as CompanyProfile;
  const rawStates = buildEmployeeStates(company.employees, session!.events);
  const graph = buildInfluenceGraph(company.employees);
  const employeeStates = applyContagion(rawStates, company.employees, graph);
  const offlineCount = Object.values(worldState.systemStatuses).filter((s) => s === "OFFLINE").length;
  const organizationHealth = computeOrganizationHealth(employeeStates, offlineCount);
  const executives = buildExecutivesWithSatisfaction(templateSlug, company, worldState, session!.events);

  return NextResponse.json({
    session: {
      id: session!.id,
      status: session!.status,
      currentStage: session!.currentStage,
      score: worldState.score,
      startedAt: session!.startedAt,
      template: {
        slug: session!.template.slug,
        name: session!.template.name,
        description: session!.template.description,
        difficulty: session!.template.difficulty,
      },
      companyData: session!.companyData,
    },
    events: session!.events.map((e) => ({
      id: e.id,
      type: e.type,
      actor: e.actor,
      payload: e.payload,
      narrative: e.narrative,
      createdAt: e.createdAt,
    })),
    worldState,
    availableActions,
    stageDefinition: stageDef
      ? { id: stageDef.id, label: stageDef.label, brief: stageDef.brief, threat: stageDef.threat, evidence: stageDef.evidence }
      : null,
    employeeStates,
    organizationHealth,
    executives,
  });
}
