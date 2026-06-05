import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import {
  buildWorldState,
  getActionDef,
  getAvailableActions,
  getStageDefinition,
} from "@/lib/simulation/engine";
import { narrateAction } from "@/lib/simulation/narrator";
import { buildNarrativeContext } from "@/lib/simulation/runtime/context";
import { getActionConsequences, formatConsequenceNarrative } from "@/lib/simulation/runtime/consequences";
import { getExecReactionsForAction } from "@/lib/simulation/runtime/executives";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { createAdversary, applyAdversarySuccess, applyAdversaryBlock } from "@/lib/simulation/runtime/redai/adversary";
import { createMemory, recordAction, recordDefenderResponse } from "@/lib/simulation/runtime/redai/memory";
import { evaluatePlayerDecision } from "@/lib/simulation/runtime/redai/evaluator";
import { planNextMove } from "@/lib/simulation/runtime/redai/planner";
import { applyAdversaryAction } from "@/lib/simulation/runtime/redai/consequences";
import { buildAssetGraph } from "@/lib/simulation/runtime/redai/asset-graph";
import { detectAction } from "@/lib/simulation/runtime/redai/detection";
import { evaluateDefenseLayer } from "@/lib/simulation/runtime/security/effectiveness";
import { generateControlResponses } from "@/lib/simulation/runtime/security/responses";
import type { AttackStage, CompanyProfile, EmployeeState } from "@/lib/simulation/types";
import type { AdversaryState } from "@/lib/simulation/runtime/redai/types";
import type { AdversaryMemory } from "@/lib/simulation/runtime/redai/memory";
import { sendSimCertificateEmail } from "@/lib/email";
import { track } from "@/lib/analytics";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ actionId: z.string().min(1) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 60 actions per minute per session — prevents spam/automation
  const rl = await rateLimit(`sim-action:${sessionId}`, { max: 60, windowSec: 60 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Slow down — too many actions in a short window." }, { status: 429 });
  }

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const worldState = buildWorldState(session.events);
  if (worldState.status !== "ACTIVE") {
    return NextResponse.json({ error: "session_not_active" }, { status: 409 });
  }

  const { actionId } = parsed.data;
  const available = getAvailableActions(session.template.slug, worldState);
  if (!available.find((a) => a.id === actionId)) {
    return NextResponse.json({ error: "action_not_available" }, { status: 400 });
  }

  const actionDef = getActionDef(session.template.slug, actionId);
  if (!actionDef) return NextResponse.json({ error: "action_not_found" }, { status: 404 });

  const company = session.companyData as CompanyProfile;
  const stageDef = getStageDefinition(session.template.slug, worldState.stage as AttackStage);
  const narrativeContext = buildNarrativeContext(
    session.events.map((e) => ({ type: e.type, actor: e.actor, narrative: e.narrative })),
    company.name
  );
  const narrative = await narrateAction(
    actionDef.label,
    actionDef.effects.stageBlocker,
    company.name,
    stageDef?.label ?? worldState.stage,
    narrativeContext
  );

  await db.simulationEvent.create({
    data: {
      sessionId: session.id,
      type: "STUDENT_ACTION",
      actor: "ANALYST",
      payload: {
        actionId,
        label: actionDef.label,
        scoreChange: actionDef.effects.scoreChange,
        stealthChange: actionDef.effects.stealthChange,
        stageBlocker: actionDef.effects.stageBlocker,
      },
      narrative,
    },
  });

  // Emit consequence events for side effects of this action
  const consequences = getActionConsequences(session.template.slug, actionId);
  if (consequences.length > 0) {
    await db.simulationEvent.createMany({
      data: consequences.map((c) => ({
        sessionId: session.id,
        type: "CONSEQUENCE",
        actor: "SYSTEM",
        payload: { system: c.system, status: c.status, reason: c.reason, triggeredBy: actionId },
        narrative: formatConsequenceNarrative(c),
      })),
    });
  }

  // Emit exec reaction events based on the action taken
  const execReactions = getExecReactionsForAction(actionId);
  if (execReactions.length > 0) {
    await db.simulationEvent.createMany({
      data: execReactions.map((r) => ({
        sessionId: session.id,
        type: "EXEC_REACTION",
        actor: "EXEC",
        payload: { role: r.role, delta: r.delta, reason: r.reason, triggeredBy: actionId },
        narrative: `[${r.role}] ${r.reason}`,
      })),
    });
  }

  const newScore = worldState.score + actionDef.effects.scoreChange;
  const newStatus = actionDef.effects.stageBlocker ? "CONTAINED" : "ACTIVE";

  await db.simulationSession.update({
    where: { id: session.id },
    data: {
      score: newScore,
      status: newStatus,
      ...(newStatus !== "ACTIVE" && { endedAt: new Date() }),
    },
  });

  if (newStatus !== "ACTIVE") {
    track("simulation.completed", user.id, {
      sessionId: session.id,
      outcome: newStatus,
      score: newScore,
      templateSlug: session.template.slug,
    });
  }

  // Award XP and skillScore on session end, send certificate email
  if (newStatus === "CONTAINED") {
    const xpGain = newScore * 3;
    const skillGain = Math.floor(newScore / 2);
    await db.user.update({
      where: { id: user.id },
      data: { xp: { increment: xpGain }, skillScore: { increment: skillGain } },
    });
    const rating = newScore >= 88 ? "EXCEPTIONAL" : newScore >= 68 ? "STRONG" : newScore >= 48 ? "ADEQUATE" : "DEVELOPING";
    sendSimCertificateEmail(
      user.email,
      user.displayName ?? user.email.split("@")[0],
      session.template.name,
      newScore,
      rating,
      session.id
    ).catch(() => null);
  }

  // REDai adversary turn — only runs while the simulation is still live
  let adversaryNarrative: string | null = null;
  if (newStatus === "ACTIVE") {
    const rawAdversaryState = session.adversaryState as AdversaryState | null;
    const rawAdversaryMemory = session.adversaryMemory as AdversaryMemory | null;

    let adversaryState = rawAdversaryState ?? createAdversary(60);
    let adversaryMemory = rawAdversaryMemory ?? createMemory();

    // Record what the defender just did
    adversaryMemory = recordDefenderResponse(adversaryMemory, actionDef.label);

    // Evaluate whether this player action disrupts the adversary's current objective
    const evaluation = evaluatePlayerDecision(actionId, adversaryState, adversaryMemory);
    if (evaluation.disrupted) {
      adversaryState = applyAdversaryBlock(adversaryState, adversaryMemory);
      adversaryMemory = recordAction(adversaryMemory, actionId, false);
    }

    // Build employee states and asset graph to inform attacker targeting
    const company = session.companyData as CompanyProfile;
    const allEvents = session.events.map((e) => ({ type: e.type, payload: e.payload }));
    const employeeStateMap = buildEmployeeStates(company.employees ?? [], allEvents);
    const employeeStates: EmployeeState[] = Object.values(employeeStateMap);
    const assetGraph = buildAssetGraph(company);

    // REDai plans its next move with graph context
    const plan = await planNextMove(worldState, employeeStates, adversaryState, adversaryMemory, assetGraph);
    adversaryNarrative = plan.reason;

    // Security controls evaluate before the adversary acts (PREVENT → CONTAIN → RECOVER)
    const defenseResult = evaluateDefenseLayer(plan.action, worldState.blockedVectors, adversaryState);
    const defenseEvents = generateControlResponses(plan.action, defenseResult);

    let actionSucceeded = false;

    if (defenseResult.prevented) {
      // A control stopped the adversary outright — no world consequence
      adversaryState = applyAdversaryBlock(adversaryState, adversaryMemory);
      adversaryMemory = recordAction(adversaryMemory, plan.action, false);
    } else {
      // Action lands — apply world consequences with graph context
      const consequences = applyAdversaryAction(worldState, employeeStates, adversaryState, plan, assetGraph);
      const actionFailed = consequences.some((c) => c.type === "REDAI_ACTION_FAILED");

      if (actionFailed) {
        adversaryState = applyAdversaryBlock(adversaryState, adversaryMemory);
        adversaryMemory = recordAction(adversaryMemory, plan.action, false);
      } else {
        adversaryState = applyAdversarySuccess(adversaryState, plan);
        adversaryMemory = recordAction(adversaryMemory, plan.action, true);
        actionSucceeded = true;
      }

      // Store world-consequence events
      if (consequences.length > 0) {
        await db.simulationEvent.createMany({
          data: consequences.map((c) => ({
            sessionId: session.id,
            type: c.type,
            actor: c.actor,
            // JSON.parse(JSON.stringify()) normalises Record<string,unknown> to Prisma's InputJsonValue
            payload: JSON.parse(JSON.stringify(c.payload)),
            narrative: c.narrative,
          })),
        });

        // Ransomware deployment = simulation ends in breach
        if (consequences.some((c) => c.type === "REDAI_RANSOMWARE_DEPLOYED")) {
          await db.simulationSession.update({
            where: { id: session.id },
            data: { status: "BREACHED", endedAt: new Date(), score: newScore },
          });
          track("simulation.completed", user.id, {
            sessionId: session.id,
            outcome: "BREACHED",
            score: newScore,
            templateSlug: session.template.slug,
            cause: "ransomware",
          });
        }
      }
    }

    // Store the adversary's tactical decision event
    await db.simulationEvent.create({
      data: {
        sessionId: session.id,
        type: "REDAI_ACTION",
        actor: "ADVERSARY",
        payload: {
          action: plan.action,
          target: plan.target,
          objective: adversaryState.currentObjective,
          confidence: adversaryState.confidence,
          prevented: defenseResult.prevented,
          succeeded: actionSucceeded,
        },
        narrative: `[THREAT INTEL] ${adversaryNarrative}`,
      },
    });

    // Store defense events (CONTROL_PREVENTION or CONTROL_CONTAINMENT)
    if (defenseEvents.length > 0) {
      await db.simulationEvent.createMany({
        data: defenseEvents.map((c) => ({
          sessionId: session.id,
          type: c.type,
          actor: c.actor,
          payload: JSON.parse(JSON.stringify(c.payload)),
          narrative: c.narrative,
        })),
      });
    }

    // Detection pass — determines what security tools surface to the analyst
    const detection = detectAction(plan.action, adversaryState, worldState);
    const allTelemetry = [...detection.visibleAlerts, ...detection.hiddenTelemetry];
    if (allTelemetry.length > 0) {
      await db.simulationEvent.createMany({
        data: allTelemetry.map((t) => ({
          sessionId: session.id,
          type: "TELEMETRY_ALERT",
          actor: t.source,
          payload: JSON.parse(JSON.stringify({
            source: t.source,
            severity: t.severity,
            mitreTechniqueId: t.mitreTechniqueId,
            system: t.system,
            visible: t.visible,
          })),
          narrative: t.visible
            ? `[${t.source}] ${t.severity}: ${t.description}`
            : null,
        })),
      });
    }

    await db.simulationSession.update({
      where: { id: session.id },
      data: {
        adversaryState: adversaryState as object,
        adversaryMemory: adversaryMemory as object,
      },
    });

    adversaryNarrative = plan.reason;
  }

  return NextResponse.json({
    ok: true,
    narrative,
    scoreChange: actionDef.effects.scoreChange,
    newScore,
    contained: actionDef.effects.stageBlocker,
    adversaryNarrative,
  });
}
