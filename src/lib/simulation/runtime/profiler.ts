// Analyst Behavior Profiler — infers cybersecurity psychometric traits
// from the event log. This becomes the platform's biggest differentiator:
// showing analysts HOW they think, not just whether they won.

import type { AnalystProfile, AnalystTrait } from "../types";

type TimedEvent = {
  type: string;
  actor: string;
  payload: unknown;
  createdAt: string;
};

export function buildAnalystProfile(events: TimedEvent[]): AnalystProfile {
  const actions = events.filter((e) => e.type === "STUDENT_ACTION");
  const stageAdvances = events.filter((e) => e.type === "STAGE_ADVANCE");

  const traits: AnalystTrait[] = [];

  // ── Speed: time from first stage advance to first analyst action ───────────
  const firstAdvance = stageAdvances[0];
  const firstAction = actions[0];
  let decisionSpeed: AnalystProfile["decisionSpeed"] = "MEASURED";

  if (firstAdvance && firstAction) {
    const gapSec = Math.floor(
      (new Date(firstAction.createdAt).getTime() - new Date(firstAdvance.createdAt).getTime()) / 1000
    );
    if (gapSec < 30) decisionSpeed = "FAST";
    else if (gapSec > 90) decisionSpeed = "SLOW";
  }

  // ── Trait: Aggressive Responder ─────────────────────────────────────────────
  const containmentActions = actions.filter((e) => {
    const p = e.payload as Record<string, unknown>;
    return p.stageBlocker === true;
  });
  traits.push({
    id: "aggressive_responder",
    label: "Aggressive Responder",
    score: Math.min(100, containmentActions.length * 35),
    evidence: containmentActions.length > 0
      ? `Took ${containmentActions.length} containment action(s)`
      : "No containment actions taken",
  });

  // ── Trait: Compliance Aware ─────────────────────────────────────────────────
  const complianceActionIds = new Set([
    "notify_legal", "notify_regulators", "file_hipaa_notification",
    "notify_patients", "engage_law_enforcement",
  ]);
  const complianceActions = actions.filter((e) => {
    const p = e.payload as Record<string, unknown>;
    return complianceActionIds.has(p.actionId as string);
  });
  traits.push({
    id: "compliance_aware",
    label: "Compliance Aware",
    score: Math.min(100, complianceActions.length * 50),
    evidence: complianceActions.length > 0
      ? `Filed ${complianceActions.length} regulatory/legal notification(s)`
      : "No compliance notifications filed",
  });

  // ── Trait: Thorough Investigator ────────────────────────────────────────────
  const investigationIds = new Set([
    "investigate_machine", "pull_access_logs", "preserve_forensics",
    "preserve_forensic_image", "shadow_monitoring", "monitor_silently",
  ]);
  const investigationActions = actions.filter((e) => {
    const p = e.payload as Record<string, unknown>;
    return investigationIds.has(p.actionId as string);
  });
  traits.push({
    id: "thorough_investigator",
    label: "Thorough Investigator",
    score: Math.min(100, investigationActions.length * 40),
    evidence: investigationActions.length > 0
      ? `Ran ${investigationActions.length} forensic/investigation action(s)`
      : "No investigative actions taken",
  });

  // ── Trait: Early Detector ───────────────────────────────────────────────────
  const earlyStages = new Set(["NORMAL", "SUSPICIOUS_ACCESS"]);
  const earlyActions = actions.filter((e) => {
    // We can infer the stage from the stage at time of action — approximated
    // by looking at what stage advances preceded this action
    return true; // simplified: check if any action taken before second stage advance
  });
  const actedBeforeCompromise = firstAction &&
    stageAdvances.length > 1 &&
    new Date(firstAction.createdAt) < new Date(stageAdvances[1]?.createdAt ?? "9999");
  traits.push({
    id: "early_detector",
    label: "Early Detector",
    score: actedBeforeCompromise ? 80 : 20,
    evidence: actedBeforeCompromise
      ? "Acted before the attack reached a critical stage"
      : "First action taken after the attack had already progressed",
  });

  // ── Trait: Risk Tolerance ───────────────────────────────────────────────────
  const autoAdvances = stageAdvances.filter((e) => {
    const p = e.payload as Record<string, unknown>;
    return p.reason === "auto";
  });
  traits.push({
    id: "risk_tolerant",
    label: "Risk Tolerant",
    score: Math.min(100, autoAdvances.length * 25),
    evidence: autoAdvances.length > 0
      ? `${autoAdvances.length} stage(s) auto-advanced — attacker gained ground`
      : "Kept pace with the attacker throughout",
  });

  const sorted = [...traits].sort((a, b) => b.score - a.score);
  const topStrength = sorted[0]?.score >= 60 ? sorted[0].label : null;
  const topWeakness = sorted[sorted.length - 1]?.score <= 30
    ? sorted[sorted.length - 1].label
    : null;

  return { traits, decisionSpeed, topStrength, topWeakness };
}
