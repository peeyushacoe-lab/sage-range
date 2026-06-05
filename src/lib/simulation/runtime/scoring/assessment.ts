import type { DebriefReport, DebriefScores } from "./debrief";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OverallRating = "EXCEPTIONAL" | "STRONG" | "ADEQUATE" | "DEVELOPING";

export interface CandidateAssessment {
  scores: DebriefScores;
  mitreCoveragePercent: number;
  decisionSpeed: "FAST" | "MEASURED" | "SLOW";   // relative to alert volume
  strengths: string[];
  gaps: string[];
  overallRating: OverallRating;
  hiringRecommendation: string;
  notableActions: string[];     // controls deployed correctly
  durationSeconds: number;
}

export interface ClassAnalytics {
  cohortSize: number;
  averageScores: DebriefScores;
  topQuartileThreshold: number;           // overall score at 75th percentile
  distribution: Record<OverallRating, number>;
  commonGaps: string[];                   // gaps present in > 40% of candidates
  topPerformerIds: number[];              // indices of top-quartile assessments
  recommendations: string[];             // curriculum adjustments
}

// ── Candidate report ──────────────────────────────────────────────────────────

function deriveRating(overallScore: number): OverallRating {
  if (overallScore >= 80) return "EXCEPTIONAL";
  if (overallScore >= 65) return "STRONG";
  if (overallScore >= 45) return "ADEQUATE";
  return "DEVELOPING";
}

const HIRING_RECOMMENDATIONS: Record<OverallRating, string> = {
  EXCEPTIONAL:
    "Highly recommended for senior SOC Analyst or Incident Response Lead roles. Demonstrated systematic threat detection, proactive containment, and clear situational awareness under pressure.",
  STRONG:
    "Recommended for mid-level Analyst or IR roles. Strong technical instincts with specific MITRE coverage gaps worth exploring in interview. Likely to develop quickly with structured mentorship.",
  ADEQUATE:
    "Suitable for junior analyst or entry-level IR roles with mentorship. Core procedural knowledge is present; decision-making tempo and detection depth need development.",
  DEVELOPING:
    "Not recommended at this stage. Fundamental gaps in alert triage and containment methodology suggest structured training is needed before an operational role.",
};

export function generateCandidateAssessment(
  debrief: DebriefReport,
  durationSeconds: number
): CandidateAssessment {
  const { scores, mitreCoverage, businessImpact, controlsEffective, attackTimeline } = debrief;

  const studentActionCount = attackTimeline.filter((e) => e.eventType === "STUDENT_ACTION").length;
  const visibleAlertCount = attackTimeline.filter((e) => e.eventType === "TELEMETRY_ALERT").length;

  // Decision speed relative to alert volume
  const secondsPerAction = durationSeconds / Math.max(studentActionCount, 1);
  const alertsPerAction = visibleAlertCount / Math.max(studentActionCount, 1);
  const decisionSpeed: CandidateAssessment["decisionSpeed"] =
    secondsPerAction < 45 && alertsPerAction < 1.5
      ? "FAST"
      : secondsPerAction < 120
      ? "MEASURED"
      : "SLOW";

  const strengths: string[] = [];
  if (scores.detection >= 70)
    strengths.push("Threat detection — identified the majority of adversary techniques from telemetry");
  if (scores.containment >= 70)
    strengths.push("Containment — deployed security controls before adversary reached critical objectives");
  if (scores.recovery >= 70)
    strengths.push("Recovery readiness — backup and restoration procedures activated appropriately");
  if (scores.response >= 70)
    strengths.push("Response tempo — took action proportionate to alert volume and attack progression");
  if (mitreCoverage.coveragePercent >= 70)
    strengths.push("ATT&CK coverage — responded across multiple kill chain phases");
  if (decisionSpeed === "FAST")
    strengths.push("Decision speed — acted quickly under pressure without overreacting");
  if (strengths.length === 0)
    strengths.push("Participated in a high-fidelity simulation scenario — foundational exposure achieved");

  const gaps: string[] = [];
  if (scores.detection < 50)
    gaps.push("Alert triage — several adversary techniques generated telemetry that went unactioned");
  if (scores.containment < 50)
    gaps.push("Containment timing — controls were deployed too late to prevent deeper objective completion");
  if (scores.response < 50)
    gaps.push("Response volume — insufficient actions taken relative to the number of visible alerts");
  if (businessImpact.ransomwareDeployed)
    gaps.push("Ransomware prevention — adversary reached detonation; EDR and IR controls needed earlier");
  if (businessImpact.dataExfiltrated)
    gaps.push("Data exfiltration — egress controls were not activated before data left the environment");
  if (mitreCoverage.missed.length > 2)
    gaps.push(
      `MITRE ATT&CK blind spots — ${mitreCoverage.missed.map((t) => t.id).join(", ")} were not detected`
    );
  if (decisionSpeed === "SLOW")
    gaps.push("Decision tempo — response cadence too slow relative to adversary progression speed");

  const overallRating = deriveRating(scores.overall);
  const hiringRecommendation = HIRING_RECOMMENDATIONS[overallRating];
  const notableActions = controlsEffective.map(
    (c) => `${c.controlName} — ${c.type.toLowerCase()} (×${c.count})`
  );

  return {
    scores,
    mitreCoveragePercent: mitreCoverage.coveragePercent,
    decisionSpeed,
    strengths,
    gaps,
    overallRating,
    hiringRecommendation,
    notableActions,
    durationSeconds,
  };
}

// ── Class / instructor analytics ──────────────────────────────────────────────

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function generateClassAnalytics(
  assessments: CandidateAssessment[]
): ClassAnalytics {
  if (assessments.length === 0) {
    return {
      cohortSize: 0,
      averageScores: { detection: 0, containment: 0, recovery: 0, response: 0, overall: 0 },
      topQuartileThreshold: 0,
      distribution: { EXCEPTIONAL: 0, STRONG: 0, ADEQUATE: 0, DEVELOPING: 0 },
      commonGaps: [],
      topPerformerIds: [],
      recommendations: [],
    };
  }

  const averageScores: DebriefScores = {
    detection:   avg(assessments.map((a) => a.scores.detection)),
    containment: avg(assessments.map((a) => a.scores.containment)),
    recovery:    avg(assessments.map((a) => a.scores.recovery)),
    response:    avg(assessments.map((a) => a.scores.response)),
    overall:     avg(assessments.map((a) => a.scores.overall)),
  };

  const distribution: Record<OverallRating, number> = {
    EXCEPTIONAL: 0, STRONG: 0, ADEQUATE: 0, DEVELOPING: 0,
  };
  for (const a of assessments) distribution[a.overallRating]++;

  const sorted = [...assessments]
    .map((a, i) => ({ idx: i, score: a.scores.overall }))
    .sort((a, b) => b.score - a.score);
  const topN = Math.max(1, Math.floor(assessments.length * 0.25));
  const topPerformerIds = sorted.slice(0, topN).map((s) => s.idx);
  const topQuartileThreshold = sorted[topN - 1]?.score ?? 0;

  // Gaps that appear in > 40% of the cohort
  const gapFrequency: Record<string, number> = {};
  for (const a of assessments) {
    for (const gap of a.gaps) {
      gapFrequency[gap] = (gapFrequency[gap] ?? 0) + 1;
    }
  }
  const threshold = assessments.length * 0.4;
  const commonGaps = Object.entries(gapFrequency)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([gap]) => gap);

  const recommendations: string[] = [];
  if (averageScores.detection < 60)
    recommendations.push(
      "Add dedicated SIEM correlation lab — most students are missing alerts that telemetry is already surfacing."
    );
  if (averageScores.containment < 55)
    recommendations.push(
      "Introduce timed containment drills — students need practice on when to isolate vs. when to monitor."
    );
  if (averageScores.recovery < 55)
    recommendations.push(
      "Add backup/recovery scenario — most students did not activate recovery controls before ransomware detonated."
    );
  if (distribution.DEVELOPING / assessments.length > 0.3)
    recommendations.push(
      "Consider a prerequisite fundamentals module — more than 30% of the cohort lacks baseline detection skills."
    );
  if (averageScores.overall >= 70)
    recommendations.push(
      "Cohort performing well. Consider running the INSANE-difficulty APT scenario as an extension exercise."
    );

  return {
    cohortSize: assessments.length,
    averageScores,
    topQuartileThreshold,
    distribution,
    commonGaps,
    topPerformerIds,
    recommendations,
  };
}
