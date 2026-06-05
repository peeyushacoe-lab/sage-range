// Reaction Engine — deterministic rules for when an employee generates a spontaneous behavior event.
// "Deterministic psychology + AI flavoring": rules decide IF a reaction fires, AI writes the text.

import type { AttackStage, EmployeeState } from "../../types";

export type ReactionType = "PANIC" | "REPORT" | "RUMOR";

export type EmployeeReaction = {
  employeeName: string;
  employeeTitle: string;
  reactionType: ReactionType;
  urgency: "LOW" | "MEDIUM" | "HIGH";
};

// Stages where a security-aware employee is likely to notice and report something
const REPORTING_STAGES = new Set<string>([
  "PHISHING_ACTIVE", "INITIAL_COMPROMISE", "SUSPICIOUS_ACCESS", "LATERAL_MOVEMENT",
]);

export function getTriggeredReactions(
  states: Record<string, EmployeeState>,
  employees: Array<{ name: string; title: string }>,
  stage: AttackStage,
  reactedThisStage: Set<string>
): EmployeeReaction[] {
  const reactions: EmployeeReaction[] = [];
  const titleOf = Object.fromEntries(employees.map((e) => [e.name, e.title]));

  for (const [name, s] of Object.entries(states)) {
    if (reactedThisStage.has(name)) continue;

    if (s.stressLevel > 80) {
      reactions.push({
        employeeName: name,
        employeeTitle: titleOf[name] ?? "Employee",
        reactionType: "PANIC",
        urgency: s.stressLevel > 90 ? "HIGH" : "MEDIUM",
      });
    } else if (s.securityAwareness > 70 && REPORTING_STAGES.has(stage)) {
      reactions.push({
        employeeName: name,
        employeeTitle: titleOf[name] ?? "Employee",
        reactionType: "REPORT",
        urgency: "LOW",
      });
    } else if (s.morale < 30 && s.stressLevel > 60) {
      reactions.push({
        employeeName: name,
        employeeTitle: titleOf[name] ?? "Employee",
        reactionType: "RUMOR",
        urgency: "LOW",
      });
    }
  }

  // Cap at 2 spontaneous reactions per stage transition to avoid feed flooding
  return reactions.slice(0, 2);
}
