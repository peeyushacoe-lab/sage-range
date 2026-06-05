export type AttackObjective =
  | "INITIAL_ACCESS"
  | "PERSISTENCE"
  | "PRIV_ESC"
  | "LATERAL_MOVEMENT"
  | "EXFILTRATION"
  | "IMPACT";

export type AdversaryActionType =
  | "PHISH_EMPLOYEE"
  | "STEAL_CREDENTIALS"
  | "EXPLOIT_SERVER"
  | "MOVE_LATERALLY"
  | "EXFILTRATE_DATA"
  | "DEPLOY_RANSOMWARE";

export interface AdversaryState {
  id: string;
  personaId?: string;                   // which persona drives this adversary instance
  objectiveChain?: AttackObjective[];   // persona-specific objective order; falls back to global OBJECTIVE_ORDER
  sophistication: number;              // 0-100
  currentObjective: AttackObjective;
  completedObjectives: AttackObjective[];
  detected: boolean;
  confidence: number;              // 0-100: how committed adversary is to current approach
  resources: number;               // 0-100: remaining operational capacity
}

export interface AdversaryPlan {
  action: AdversaryActionType;
  target: string;
  reason: string;
}
