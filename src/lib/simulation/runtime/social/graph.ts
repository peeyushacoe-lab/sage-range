// Influence Graph — deterministic employee network topology.
// Relationships are inferred from department co-membership and riskLevel.
// No schema changes needed: the graph is computed from the existing EmployeeProfile data.

import type { EmployeeProfile } from "../../types";

export type InfluenceEdge = {
  from: string;
  to: string;
  weight: number; // 0–1, how strongly "from" affects "to"
};

// Finance/HR spread panic faster; Security/IT are more resistant
const DEPT_AMPLIFIER: Record<string, number> = {
  Finance:     1.3,
  HR:          1.2,
  Marketing:   1.1,
  Operations:  1.0,
  Engineering: 0.7,
  IT:          0.6,
  Security:    0.5,
};

// Builds a directed influence graph from the employee roster.
// Employees in the same department influence each other.
// HIGH-risk employees spread stress faster; LOW-risk employees spread calm.
export function buildInfluenceGraph(employees: EmployeeProfile[]): InfluenceEdge[] {
  const edges: InfluenceEdge[] = [];

  for (const a of employees) {
    for (const b of employees) {
      if (a.name === b.name) continue;
      if (a.department !== b.department) continue;

      const sourceAmp = a.riskLevel === "HIGH" ? 1.4 : a.riskLevel === "MEDIUM" ? 1.0 : 0.6;
      const deptAmp   = DEPT_AMPLIFIER[a.department] ?? 1.0;
      const weight    = Math.min(1.0, 0.5 * sourceAmp * deptAmp);

      edges.push({ from: a.name, to: b.name, weight });
    }
  }

  return edges;
}
