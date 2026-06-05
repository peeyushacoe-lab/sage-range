import type { WorldState } from "../../types";

export type SimulationRole =
  | "INCIDENT_COMMANDER"
  | "SOC_ANALYST"
  | "THREAT_HUNTER"
  | "IT_OPERATIONS"
  | "LEGAL"
  | "PR"
  | "EXECUTIVE";

// World state fields a role is allowed to read
type WorldStateKey = keyof WorldState;

interface RoleConfig {
  label: string;
  description: string;
  // Event types visible to this role. "*" = all types.
  visibleEventTypes: string[] | "*";
  // For TELEMETRY_ALERT: whether hidden telemetry is included
  includeHiddenTelemetry: boolean;
  // World state fields exposed to this role
  worldStateFields: WorldStateKey[];
  // Whether this role can submit STUDENT_ACTION decisions
  canTakeActions: boolean;
}

export const ROLE_CONFIGS: Record<SimulationRole, RoleConfig> = {

  INCIDENT_COMMANDER: {
    label: "Incident Commander",
    description: "Full situational awareness. Coordinates all teams. Sees everything.",
    visibleEventTypes: "*",
    includeHiddenTelemetry: true,
    worldStateFields: [
      "stage", "stealthLevel", "score", "blockedVectors", "decisionCount",
      "endpointIsolated", "networkSegmented", "egressBlocked", "status",
      "systemStatuses", "activePressures", "firedPressureIds",
      "executiveSatisfaction", "compromisedEmployees", "compromisedSystems",
      "dataExfiltrated", "ransomwareDeployed",
      "ceoConfidence", "boardConfidence", "mediaPressure", "legalPressure", "customerTrust",
    ],
    canTakeActions: true,
  },

  SOC_ANALYST: {
    label: "SOC Analyst",
    description: "Alert triage and first-line response. Sees telemetry and system status.",
    visibleEventTypes: [
      "TELEMETRY_ALERT",
      "STUDENT_ACTION",
      "CONSEQUENCE",
      "CONTROL_PREVENTION",
      "CONTROL_CONTAINMENT",
      "REDAI_SYSTEM_COMPROMISED",
    ],
    includeHiddenTelemetry: false,
    worldStateFields: [
      "stage", "status", "stealthLevel", "score", "blockedVectors", "decisionCount",
      "systemStatuses", "activePressures", "compromisedSystems", "endpointIsolated",
      "networkSegmented", "egressBlocked",
    ],
    canTakeActions: true,
  },

  THREAT_HUNTER: {
    label: "Threat Hunter",
    description: "Deep forensic visibility. Sees all telemetry including raw hidden signals.",
    visibleEventTypes: [
      "TELEMETRY_ALERT",
      "REDAI_ACTION",
      "REDAI_EMPLOYEE_PHISHED",
      "REDAI_EMPLOYEE_COMPROMISED",
      "REDAI_CREDENTIALS_STOLEN",
      "REDAI_SYSTEM_COMPROMISED",
      "CONTROL_PREVENTION",
      "CONTROL_CONTAINMENT",
    ],
    includeHiddenTelemetry: true,
    worldStateFields: [
      "stage", "status", "stealthLevel", "blockedVectors",
      "systemStatuses", "compromisedEmployees", "compromisedSystems",
      "dataExfiltrated", "ransomwareDeployed",
    ],
    canTakeActions: false,
  },

  IT_OPERATIONS: {
    label: "IT Operations",
    description: "System health and infrastructure. Sees what broke and what needs patching.",
    visibleEventTypes: [
      "CONSEQUENCE",
      "REDAI_SYSTEM_COMPROMISED",
      "REDAI_RANSOMWARE_DEPLOYED",
      "CONTROL_CONTAINMENT",
      "STUDENT_ACTION",
    ],
    includeHiddenTelemetry: false,
    worldStateFields: [
      "stage", "status", "systemStatuses", "compromisedSystems",
      "endpointIsolated", "networkSegmented", "egressBlocked",
      "ransomwareDeployed",
    ],
    canTakeActions: true,
  },

  LEGAL: {
    label: "Legal & Compliance",
    description: "Regulatory exposure and notification obligations. Sees data breach events and legal pressure.",
    visibleEventTypes: [
      "REDAI_DATA_EXFILTRATED",
      "REDAI_EMPLOYEE_COMPROMISED",
      "PRESSURE_EVENT",
      "STUDENT_ACTION",
    ],
    includeHiddenTelemetry: false,
    worldStateFields: [
      "stage", "status", "dataExfiltrated", "compromisedEmployees",
      "legalPressure", "activePressures", "firedPressureIds",
    ],
    canTakeActions: false,
  },

  PR: {
    label: "PR / Communications",
    description: "Brand and media management. Sees public-facing impact and executive mood.",
    visibleEventTypes: [
      "PRESSURE_EVENT",
      "REDAI_RANSOMWARE_DEPLOYED",
      "REDAI_DATA_EXFILTRATED",
      "EXEC_REACTION",
    ],
    includeHiddenTelemetry: false,
    worldStateFields: [
      "stage", "status", "mediaPressure", "customerTrust",
      "ceoConfidence", "activePressures", "ransomwareDeployed", "dataExfiltrated",
    ],
    canTakeActions: false,
  },

  EXECUTIVE: {
    label: "Executive",
    description: "Business impact view. Sees confidence metrics, board exposure, and financial risk.",
    visibleEventTypes: [
      "PRESSURE_EVENT",
      "EXEC_REACTION",
      "REDAI_DATA_EXFILTRATED",
      "REDAI_RANSOMWARE_DEPLOYED",
    ],
    includeHiddenTelemetry: false,
    worldStateFields: [
      "status", "score", "ceoConfidence", "boardConfidence",
      "mediaPressure", "legalPressure", "customerTrust",
      "dataExfiltrated", "ransomwareDeployed", "activePressures",
    ],
    canTakeActions: false,
  },

};

// ── Filtering helpers ─────────────────────────────────────────────────────────

export type RawEvent = {
  type: string;
  actor: string;
  payload: unknown;
  narrative: string | null;
};

export function filterEventsForRole(
  events: RawEvent[],
  role: SimulationRole
): RawEvent[] {
  const config = ROLE_CONFIGS[role];
  if (config.visibleEventTypes === "*") return events;

  const allowed = new Set(config.visibleEventTypes);

  return events.filter((e) => {
    if (!allowed.has(e.type)) return false;
    // THREAT_HUNTER sees all TELEMETRY_ALERT; others only see visible ones
    if (e.type === "TELEMETRY_ALERT" && !config.includeHiddenTelemetry) {
      const payload = e.payload as Record<string, unknown>;
      if (payload.visible === false) return false;
    }
    // LEGAL/PR only see PRESSURE_EVENT relevant to their domain
    if (e.type === "PRESSURE_EVENT" && role === "LEGAL") {
      const payload = e.payload as Record<string, unknown>;
      if (!["LEGAL", "REGULATOR"].includes(payload.source as string)) return false;
    }
    if (e.type === "PRESSURE_EVENT" && role === "PR") {
      const payload = e.payload as Record<string, unknown>;
      if (!["CEO", "PR", "HR"].includes(payload.source as string)) return false;
    }
    return true;
  });
}

export function filterWorldStateForRole(
  worldState: WorldState,
  role: SimulationRole
): Partial<WorldState> {
  const config = ROLE_CONFIGS[role];
  const result: Partial<WorldState> = {};
  for (const field of config.worldStateFields) {
    (result as Record<string, unknown>)[field] = worldState[field];
  }
  return result;
}

export function getRoleConfig(role: SimulationRole): RoleConfig {
  return ROLE_CONFIGS[role];
}

export function listRoles(): Array<{ id: SimulationRole; label: string; description: string; canTakeActions: boolean }> {
  return (Object.entries(ROLE_CONFIGS) as [SimulationRole, RoleConfig][]).map(
    ([id, cfg]) => ({ id, label: cfg.label, description: cfg.description, canTakeActions: cfg.canTakeActions })
  );
}
