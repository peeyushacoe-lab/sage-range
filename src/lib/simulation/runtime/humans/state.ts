// Human State Engine — deterministic psychological state of employees during an incident.
// "Engine decides, AI narrates" — states are computed from the event log, never stored in DB.
// Replay the full event history to get current employee states at any point in time.

import type { EmployeeProfile, EmployeeState } from "../../types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function initEmployeeState(emp: EmployeeProfile): EmployeeState {
  const awarenessBase = emp.riskLevel === "HIGH" ? 30 : emp.riskLevel === "MEDIUM" ? 55 : 80;
  const insiderBase   = emp.riskLevel === "HIGH" ? 35 : emp.riskLevel === "MEDIUM" ? 15 : 5;
  return {
    name: emp.name,
    stressLevel: 15,
    morale: 75,
    confidenceInSOC: 70,
    securityAwareness: awarenessBase,
    insiderRisk: insiderBase,
  };
}

// Threat-level deltas applied to all employees on stage advance
const ADVANCE_DELTAS: Record<string, { stress: number; morale: number; confidence: number }> = {
  LOW:      { stress:  5, morale:  -3, confidence:  0 },
  MEDIUM:   { stress: 12, morale:  -8, confidence: -5 },
  HIGH:     { stress: 20, morale: -12, confidence: -8 },
  CRITICAL: { stress: 30, morale: -20, confidence: -15 },
};

export function buildEmployeeStates(
  employees: EmployeeProfile[],
  events: Array<{ type: string; payload: unknown }>
): Record<string, EmployeeState> {
  const states: Record<string, EmployeeState> = {};
  for (const emp of employees) {
    states[emp.name] = initEmployeeState(emp);
  }

  for (const ev of events) {
    const p = ev.payload as Record<string, unknown>;

    switch (ev.type) {
      case "STAGE_ADVANCE": {
        const threat = (p.threat as string | undefined) ?? "MEDIUM";
        const d = ADVANCE_DELTAS[threat] ?? ADVANCE_DELTAS.MEDIUM;
        for (const s of Object.values(states)) {
          s.stressLevel     = clamp(s.stressLevel     + d.stress);
          s.morale          = clamp(s.morale          + d.morale);
          s.confidenceInSOC = clamp(s.confidenceInSOC + d.confidence);
        }
        break;
      }

      case "STUDENT_ACTION": {
        const isBlocker = p.stageBlocker === true;
        for (const s of Object.values(states)) {
          if (isBlocker) {
            s.stressLevel     = clamp(s.stressLevel     - 20);
            s.morale          = clamp(s.morale          + 15);
            s.confidenceInSOC = clamp(s.confidenceInSOC + 20);
          } else {
            // Analyst activity is calming
            s.stressLevel     = clamp(s.stressLevel     - 3);
            s.confidenceInSOC = clamp(s.confidenceInSOC + 3);
          }
        }
        break;
      }

      case "CONSEQUENCE": {
        for (const s of Object.values(states)) {
          s.stressLevel = clamp(s.stressLevel + 10);
          s.morale      = clamp(s.morale      - 5);
        }
        break;
      }

      case "PRESSURE_EVENT": {
        const urgency = p.urgency as string | undefined;
        const delta = urgency === "CRITICAL" ? 10 : urgency === "HIGH" ? 5 : 2;
        for (const s of Object.values(states)) {
          s.stressLevel = clamp(s.stressLevel + delta);
        }
        break;
      }

      case "ENDPOINT_ALERT": {
        const target = p.employee as string | undefined;
        if (target && states[target]) {
          states[target].stressLevel       = clamp(states[target].stressLevel       + 25);
          states[target].securityAwareness = clamp(states[target].securityAwareness - 15);
          states[target].insiderRisk       = clamp(states[target].insiderRisk       + 15);
        }
        break;
      }

      case "PHISHING_EMAIL": {
        const target = p.target as string | undefined;
        if (target && states[target]) {
          states[target].stressLevel       = clamp(states[target].stressLevel       + 5);
          states[target].securityAwareness = clamp(states[target].securityAwareness - 10);
        }
        break;
      }

      case "REDAI_EMPLOYEE_PHISHED": {
        const target = p.employee as string | undefined;
        if (target && states[target]) {
          states[target].stressLevel       = clamp(states[target].stressLevel       + 10);
          states[target].securityAwareness = clamp(states[target].securityAwareness - 10);
        }
        break;
      }

      case "REDAI_EMPLOYEE_COMPROMISED": {
        const target = p.employee as string | undefined;
        if (target && states[target]) {
          states[target].stressLevel       = clamp(states[target].stressLevel       + 30);
          states[target].securityAwareness = clamp(states[target].securityAwareness - 20);
          states[target].insiderRisk       = clamp(states[target].insiderRisk       + 40);
        }
        break;
      }
    }
  }

  return states;
}
