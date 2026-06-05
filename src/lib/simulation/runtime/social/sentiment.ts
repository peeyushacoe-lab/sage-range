// Organizational Sentiment — aggregates employee states into org-level health metrics.
// The organization can now fail independently of the attacker — through panic, distrust,
// and communication collapse. That's the realism layer.

import type { EmployeeState } from "../../types";

export type OrganizationHealth = {
  panicIndex: number;           // 0-100 — average employee stress
  trustInSOC: number;           // 0-100 — average confidence in the security team
  operationalStability: number; // 0-100 — degrades with stress + offline systems
  communicationIntegrity: number; // 0-100 — average morale (low morale = rumors, silence)
  insiderThreatRisk: number;    // 0-100 — highest insiderRisk score across all employees
};

export function computeOrganizationHealth(
  states: Record<string, EmployeeState>,
  offlineSystemCount = 0
): OrganizationHealth {
  const all = Object.values(states);
  if (all.length === 0) {
    return { panicIndex: 0, trustInSOC: 100, operationalStability: 100, communicationIntegrity: 100, insiderThreatRisk: 0 };
  }

  const avg = (fn: (s: EmployeeState) => number) =>
    Math.round(all.reduce((sum, s) => sum + fn(s), 0) / all.length);

  const panicIndex             = avg((s) => s.stressLevel);
  const trustInSOC             = avg((s) => s.confidenceInSOC);
  const communicationIntegrity = avg((s) => s.morale);
  const insiderThreatRisk      = Math.max(...all.map((s) => s.insiderRisk));

  // Each offline system adds operational pressure on top of base stress
  const systemPenalty      = Math.min(40, offlineSystemCount * 10);
  const operationalStability = Math.max(0, 100 - Math.round(panicIndex * 0.4) - systemPenalty);

  return { panicIndex, trustInSOC, operationalStability, communicationIntegrity, insiderThreatRisk };
}
