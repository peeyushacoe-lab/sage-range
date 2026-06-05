import type { WorldState, AttackStage, PublicAction } from "./types";
import { phishingRansomware } from "./templates/phishing-ransomware";
import { insiderThreat } from "./templates/insider-threat";
import { cloudMisconfiguration } from "./templates/cloud-misconfiguration";
import { supplyChainAttack } from "./templates/supply-chain-attack";
import { dataBreach } from "./templates/data-breach";

const REGISTRY = {
  "phishing-to-ransomware": phishingRansomware,
  "insider-threat": insiderThreat,
  "cloud-misconfiguration": cloudMisconfiguration,
  "supply-chain-attack": supplyChainAttack,
  "data-breach": dataBreach,
} as const;

export type TemplateSlug = keyof typeof REGISTRY;

export function getTemplate(slug: string) {
  return REGISTRY[slug as TemplateSlug] ?? null;
}

export function buildWorldState(events: Array<{ type: string; payload: unknown }>): WorldState {
  const state: WorldState = {
    stage: "NORMAL",
    stealthLevel: 50,
    score: 0,
    blockedVectors: [],
    decisionCount: 0,
    endpointIsolated: false,
    networkSegmented: false,
    egressBlocked: false,
    status: "ACTIVE",
    systemStatuses: {},
    activePressures: [],
    firedPressureIds: [],
    executiveSatisfaction: {},
    firedExecPressureStages: [],
    compromisedEmployees: [],
    compromisedSystems: [],
    dataExfiltrated: false,
    ransomwareDeployed: false,
    ceoConfidence: 70,
    boardConfidence: 70,
    mediaPressure: 0,
    legalPressure: 0,
    customerTrust: 85,
  };

  for (const ev of events) {
    const p = ev.payload as Record<string, unknown>;

    if (ev.type === "STAGE_ADVANCE") {
      state.stage = p.to as AttackStage;
      if (p.breach === true) state.status = "BREACHED";

    } else if (ev.type === "STUDENT_ACTION") {
      state.decisionCount++;
      state.score += (p.scoreChange as number) ?? 0;
      state.stealthLevel = Math.max(
        0,
        Math.min(100, state.stealthLevel + ((p.stealthChange as number) ?? 0))
      );
      if (p.stageBlocker) state.status = "CONTAINED";
      if (p.actionId === "isolate_endpoint") state.endpointIsolated = true;
      if (p.actionId === "segment_network") state.networkSegmented = true;
      if (p.actionId === "block_egress") state.egressBlocked = true;
      if (typeof p.actionId === "string") state.blockedVectors.push(p.actionId);

    } else if (ev.type === "CONSEQUENCE") {
      const system = p.system as string;
      const status = p.status as "DEGRADED" | "OFFLINE";
      if (system) state.systemStatuses[system] = status;

    } else if (ev.type === "PRESSURE_EVENT") {
      const pid = p.id as string;
      if (pid && !state.firedPressureIds.includes(pid)) {
        state.firedPressureIds.push(pid);
        state.activePressures.push({
          id: pid,
          source: p.source as never,
          message: p.message as string,
          urgency: p.urgency as never,
        });
      }

    } else if (ev.type === "EXEC_REACTION") {
      const role = p.role as string;
      const delta = (p.delta as number) ?? 0;
      if (role) {
        const current = state.executiveSatisfaction[role] ?? 70;
        state.executiveSatisfaction[role] = Math.max(0, Math.min(100, current + delta));
      }

    } else if (ev.type === "EXEC_PRESSURE") {
      const stage = p.stage as string;
      if (stage && !state.firedExecPressureStages.includes(stage)) {
        state.firedExecPressureStages.push(stage);
      }

    } else if (ev.type === "REDAI_EMPLOYEE_COMPROMISED") {
      const name = p.employee as string;
      if (name && !state.compromisedEmployees.includes(name)) {
        state.compromisedEmployees.push(name);
      }

    } else if (ev.type === "REDAI_SYSTEM_COMPROMISED") {
      const sys = p.system as string;
      const status = (p.status as "DEGRADED" | "OFFLINE") ?? "DEGRADED";
      if (sys) {
        if (!state.compromisedSystems.includes(sys)) state.compromisedSystems.push(sys);
        state.systemStatuses[sys] = status;
      }

    } else if (ev.type === "REDAI_DATA_EXFILTRATED") {
      state.dataExfiltrated = true;
      state.legalPressure   = Math.min(100, state.legalPressure   + 25);
      state.boardConfidence = Math.max(0,   state.boardConfidence - 20);
      state.customerTrust   = Math.max(0,   state.customerTrust   - 20);

    } else if (ev.type === "REDAI_RANSOMWARE_DEPLOYED") {
      state.ransomwareDeployed = true;
      state.status = "BREACHED";
      state.mediaPressure   = Math.min(100, state.mediaPressure   + 40);
      state.ceoConfidence   = Math.max(0,   state.ceoConfidence   - 30);
      state.boardConfidence = Math.max(0,   state.boardConfidence - 30);

    } else if (ev.type === "REDAI_SYSTEM_COMPROMISED") {
      state.ceoConfidence = Math.max(0, state.ceoConfidence - 10);

    } else if (ev.type === "REDAI_EMPLOYEE_COMPROMISED") {
      state.legalPressure = Math.min(100, state.legalPressure + 10);

    } else if (ev.type === "CONTROL_PREVENTION") {
      state.ceoConfidence = Math.min(100, state.ceoConfidence + 5);

    } else if (ev.type === "CONTROL_CONTAINMENT") {
      state.ceoConfidence = Math.min(100, state.ceoConfidence + 3);
    }
  }

  return state;
}

export function getAvailableActions(templateSlug: string, state: WorldState): PublicAction[] {
  const template = getTemplate(templateSlug);
  if (!template) return [];

  const taken = new Set(state.blockedVectors);

  return template.actions
    .filter(
      (a) =>
        a.availableInStages.includes(state.stage) &&
        !taken.has(a.id)
    )
    .map(({ id, label, description }) => ({ id, label, description }));
}

export function getStageDefinition(templateSlug: string, stageId: AttackStage) {
  const template = getTemplate(templateSlug);
  return template?.stages.find((s) => s.id === stageId) ?? null;
}

export function checkAutoAdvance(
  templateSlug: string,
  stage: AttackStage,
  elapsedSec: number
): AttackStage | null {
  const stageDef = getStageDefinition(templateSlug, stage);
  if (!stageDef || stageDef.autoAdvanceSec === 0) return null;
  if (elapsedSec >= stageDef.autoAdvanceSec) return stageDef.nextStage;
  return null;
}

export function getActionDef(templateSlug: string, actionId: string) {
  const template = getTemplate(templateSlug);
  return template?.actions.find((a) => a.id === actionId) ?? null;
}
