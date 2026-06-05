import type { AdversaryState } from "./types";
import type { AdversaryMemory } from "./memory";

// Maps defender action IDs to the attack objectives they disrupt
const DISRUPT_MAP: Record<string, string[]> = {
  block_email_gateway:      ["INITIAL_ACCESS"],
  enable_mfa:               ["INITIAL_ACCESS", "PERSISTENCE"],
  isolate_endpoint:         ["INITIAL_ACCESS", "PERSISTENCE", "PRIV_ESC"],
  reset_credentials:        ["PERSISTENCE"],
  patch_servers:            ["PRIV_ESC"],
  segment_network:          ["LATERAL_MOVEMENT"],
  block_egress:             ["EXFILTRATION"],
  deploy_honeypots:         ["LATERAL_MOVEMENT", "EXFILTRATION"],
  activate_edr:             ["PERSISTENCE", "LATERAL_MOVEMENT"],
  engage_incident_response: ["IMPACT"],
  notify_employees:         ["INITIAL_ACCESS"],
  deploy_siem:              ["PERSISTENCE", "LATERAL_MOVEMENT"],
  restore_backups:          ["IMPACT"],
};

export interface EvaluationResult {
  disrupted: boolean;
  objectivesDisrupted: string[];
  confidenceImpact: number;   // negative means adversary loses confidence
  forcedPivot: boolean;
}

export function evaluatePlayerDecision(
  actionId: string,
  adversaryState: AdversaryState,
  _memory: AdversaryMemory
): EvaluationResult {
  const disruptedObjectives = DISRUPT_MAP[actionId] ?? [];
  const disrupted = disruptedObjectives.includes(adversaryState.currentObjective);
  const confidenceImpact = disrupted ? -25 : disruptedObjectives.length > 0 ? -10 : 0;
  const forcedPivot = disrupted && adversaryState.confidence + confidenceImpact < 20;

  return {
    disrupted,
    objectivesDisrupted: disruptedObjectives,
    confidenceImpact,
    forcedPivot,
  };
}
