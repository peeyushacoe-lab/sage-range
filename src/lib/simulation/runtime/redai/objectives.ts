import type { AttackObjective, AdversaryActionType } from "./types";
import type { AdversaryMemory } from "./memory";

export const OBJECTIVE_ORDER: AttackObjective[] = [
  "INITIAL_ACCESS",
  "PERSISTENCE",
  "PRIV_ESC",
  "LATERAL_MOVEMENT",
  "EXFILTRATION",
  "IMPACT",
];

// Primary action to execute for each objective
const PRIMARY_ACTIONS: Record<AttackObjective, AdversaryActionType> = {
  INITIAL_ACCESS:    "PHISH_EMPLOYEE",
  PERSISTENCE:       "STEAL_CREDENTIALS",
  PRIV_ESC:          "EXPLOIT_SERVER",
  LATERAL_MOVEMENT:  "MOVE_LATERALLY",
  EXFILTRATION:      "EXFILTRATE_DATA",
  IMPACT:            "DEPLOY_RANSOMWARE",
};

// Pivot action when primary is blocked
const FALLBACK_ACTIONS: Partial<Record<AttackObjective, AdversaryActionType>> = {
  INITIAL_ACCESS:   "STEAL_CREDENTIALS",   // phishing blocked → direct credential theft
  PERSISTENCE:      "EXPLOIT_SERVER",       // cred theft blocked → exploit a vuln instead
  PRIV_ESC:         "MOVE_LATERALLY",       // server exploit blocked → move laterally anyway
  LATERAL_MOVEMENT: "STEAL_CREDENTIALS",    // lateral blocked → re-harvest creds from new host
};

export function getPrimaryAction(objective: AttackObjective): AdversaryActionType {
  return PRIMARY_ACTIONS[objective];
}

export function getFallbackAction(
  objective: AttackObjective,
  memory: AdversaryMemory
): AdversaryActionType {
  const fallback = FALLBACK_ACTIONS[objective];
  if (fallback && !memory.failedActions.includes(fallback)) {
    return fallback;
  }
  // Adversary is persistent — retry primary rather than give up
  return PRIMARY_ACTIONS[objective];
}

export function getNextObjective(
  current: AttackObjective,
  chain?: AttackObjective[]
): AttackObjective | null {
  const order = chain ?? OBJECTIVE_ORDER;
  const idx = order.indexOf(current);
  return order[idx + 1] ?? null;
}

// Whether an action directly advances a given objective when it succeeds
export function actionAdvancesObjective(
  action: AdversaryActionType,
  objective: AttackObjective
): boolean {
  return PRIMARY_ACTIONS[objective] === action;
}
