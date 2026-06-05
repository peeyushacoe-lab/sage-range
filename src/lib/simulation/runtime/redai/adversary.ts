import type { AdversaryState, AdversaryPlan } from "./types";
import type { AdversaryMemory } from "./memory";
import type { AdversaryPersona } from "./personas";
import { getNextObjective, actionAdvancesObjective } from "./objectives";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function advanceObjective(state: AdversaryState): AdversaryState {
  const next = getNextObjective(state.currentObjective, state.objectiveChain);
  return {
    ...state,
    completedObjectives: [...state.completedObjectives, state.currentObjective],
    currentObjective: next ?? state.currentObjective,
    confidence: clamp(state.confidence + 10),
  };
}

export function createAdversary(sophistication = 60): AdversaryState {
  return {
    id: Math.random().toString(36).slice(2, 10),
    sophistication,
    currentObjective: "INITIAL_ACCESS",
    completedObjectives: [],
    detected: false,
    confidence: 80,
    resources: 100,
  };
}

export function createAdversaryFromPersona(persona: AdversaryPersona): AdversaryState {
  return {
    id: Math.random().toString(36).slice(2, 10),
    personaId: persona.id,
    objectiveChain: persona.objectives,
    sophistication: persona.sophistication,
    currentObjective: persona.startingObjective,
    completedObjectives: [],
    detected: false,
    confidence: 80,
    resources: 100,
  };
}

// Called after a successful adversary action
export function applyAdversarySuccess(
  state: AdversaryState,
  plan: AdversaryPlan
): AdversaryState {
  const advanced = actionAdvancesObjective(plan.action, state.currentObjective);
  const updated: AdversaryState = {
    ...state,
    confidence: clamp(state.confidence + 5),
    resources: clamp(state.resources - 3),
  };
  return advanced ? advanceObjective(updated) : updated;
}

// Called when a player action disrupts the adversary's current plan
export function applyAdversaryBlock(
  state: AdversaryState,
  memory: AdversaryMemory
): AdversaryState {
  const blockCount = memory.failedActions.length;
  return {
    ...state,
    confidence: clamp(state.confidence - 20),
    resources: clamp(state.resources - 10),
    // After repeated blocks the adversary knows it's been detected
    detected: blockCount >= 2 ? true : state.detected,
  };
}
