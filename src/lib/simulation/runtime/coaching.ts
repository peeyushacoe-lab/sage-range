// Leadership Assessment — evaluates the analyst's performance on two dimensions:
// 1. Technical: how well they responded to the attack
// 2. Operational: how well they kept the organization together while doing it

import type { AnalystProfile } from "../types";
import type { OrganizationHealth } from "./social/sentiment";

export type LeadershipAssessment = {
  technicalScore: number;    // 0-100
  operationalScore: number;  // 0-100
  leadershipGrade: "A" | "B" | "C" | "D" | "F";
  orgOutcome: "STABLE" | "DISRUPTED" | "COLLAPSED";
};

export function computeLeadershipAssessment(
  profile: AnalystProfile,
  orgHealth: OrganizationHealth,
  outcome: "CONTAINED" | "BREACHED"
): LeadershipAssessment {
  const traitAvg = profile.traits.length > 0
    ? profile.traits.reduce((sum, t) => sum + t.score, 0) / profile.traits.length
    : 50;
  const containmentBonus = outcome === "CONTAINED" ? 20 : 0;
  const speedBonus = profile.decisionSpeed === "FAST" ? 8 : profile.decisionSpeed === "SLOW" ? -8 : 0;
  const technicalScore = Math.min(100, Math.max(0, Math.round(traitAvg + containmentBonus + speedBonus)));

  // Operational score: average of five org health signals, inverted where needed
  const operationalScore = Math.min(100, Math.max(0, Math.round([
    100 - orgHealth.panicIndex,
    orgHealth.trustInSOC,
    orgHealth.operationalStability,
    orgHealth.communicationIntegrity,
    100 - orgHealth.insiderThreatRisk,
  ].reduce((a, b) => a + b, 0) / 5)));

  const orgOutcome: LeadershipAssessment["orgOutcome"] =
    orgHealth.panicIndex > 70 || orgHealth.operationalStability < 30 ? "COLLAPSED" :
    orgHealth.panicIndex > 45 || orgHealth.trustInSOC < 45 ? "DISRUPTED" : "STABLE";

  const combined = Math.round(technicalScore * 0.6 + operationalScore * 0.4);
  const leadershipGrade: LeadershipAssessment["leadershipGrade"] =
    combined >= 85 ? "A" : combined >= 70 ? "B" : combined >= 55 ? "C" : combined >= 40 ? "D" : "F";

  return { technicalScore, operationalScore, leadershipGrade, orgOutcome };
}
