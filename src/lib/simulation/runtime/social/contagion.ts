// Contagion Engine — applies one round of social propagation to employee states.
// Runs as a post-processing step after buildEmployeeStates().
// All mutations are applied simultaneously (not sequentially) to avoid order dependence.

import type { EmployeeProfile, EmployeeState } from "../../types";
import type { InfluenceEdge } from "./graph";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const LEADERSHIP_KEYWORDS = ["Manager", "Director", "VP", "Chief", "Head", "Lead", "Senior"];

function isLeader(title: string): boolean {
  return LEADERSHIP_KEYWORDS.some((kw) => title.includes(kw));
}

// Apply social contagion: panic spreads, rumors erode trust, calm leaders stabilize.
export function applyContagion(
  states: Record<string, EmployeeState>,
  employees: EmployeeProfile[],
  graph: InfluenceEdge[]
): Record<string, EmployeeState> {
  // Work on a deep copy — all effects are computed from the original states
  const result: Record<string, EmployeeState> = Object.fromEntries(
    Object.entries(states).map(([k, v]) => [k, { ...v }])
  );
  const titleOf = Object.fromEntries(employees.map((e) => [e.name, e.title]));

  for (const edge of graph) {
    const src = states[edge.from];
    const dst = result[edge.to];
    if (!src || !dst) continue;

    // Panic contagion: stressed employees raise their colleagues' anxiety
    if (src.stressLevel > 80) {
      dst.stressLevel = clamp(dst.stressLevel + Math.round(edge.weight * 12));
    }

    // Rumor contagion: disengaged employees erode colleagues' confidence in the SOC
    if (src.morale < 35) {
      dst.confidenceInSOC = clamp(dst.confidenceInSOC - Math.round(edge.weight * 8));
    }

    // Leadership stabilization: a calm, confident manager reduces nearby stress and boosts morale
    if (isLeader(titleOf[edge.from] ?? "") && src.stressLevel < 50 && src.confidenceInSOC > 60) {
      dst.stressLevel = clamp(dst.stressLevel - Math.round(edge.weight * 8));
      dst.morale      = clamp(dst.morale      + Math.round(edge.weight * 5));
    }
  }

  return result;
}
