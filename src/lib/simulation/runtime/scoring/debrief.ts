import type { CompanyProfile } from "../../types";
import { getMitreTechniques } from "../redai/mitre";
import { getControl } from "../security/controls";

type RawEvent = {
  type: string;
  actor: string;
  payload: unknown;
  narrative: string | null;
};

// ── Report types ──────────────────────────────────────────────────────────────

export interface TimelineEntry {
  index: number;
  eventType: string;
  actor: string;
  summary: string;
  mitreTechniqueId?: string;
}

export interface MitreTechniqueRef {
  id: string;
  name: string;
  tactic: string;
}

export interface MitreCoverage {
  used: MitreTechniqueRef[];         // techniques the adversary executed
  detected: MitreTechniqueRef[];     // techniques that triggered visible alerts
  missed: MitreTechniqueRef[];       // techniques that went undetected
  coveragePercent: number;
}

export interface ControlSummary {
  controlId: string;
  controlName: string;
  type: "PREVENTION" | "CONTAINMENT";
  count: number;
}

export interface BusinessImpact {
  compromisedEmployees: number;
  compromisedSystems: number;
  dataExfiltrated: boolean;
  estimatedRecords: number;
  ransomwareDeployed: boolean;
  estimatedCostUSD: number;
  classification: "MINOR" | "MODERATE" | "SIGNIFICANT" | "SEVERE" | "CATASTROPHIC";
}

export interface DebriefScores {
  detection: number;     // 0-100
  containment: number;   // 0-100
  recovery: number;      // 0-100
  response: number;      // 0-100
  overall: number;       // weighted average
}

export interface DebriefReport {
  attackTimeline: TimelineEntry[];
  mitreCoverage: MitreCoverage;
  controlsEffective: ControlSummary[];
  controlsBypassed: ControlSummary[];
  businessImpact: BusinessImpact;
  scores: DebriefScores;
  recommendations: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function p(event: RawEvent): Record<string, unknown> {
  return (event.payload ?? {}) as Record<string, unknown>;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function dedupeBy<T>(arr: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── Sub-builders ──────────────────────────────────────────────────────────────

function buildTimeline(events: RawEvent[]): TimelineEntry[] {
  const relevant = new Set([
    "STUDENT_ACTION", "REDAI_ACTION", "REDAI_EMPLOYEE_COMPROMISED",
    "REDAI_SYSTEM_COMPROMISED", "REDAI_DATA_EXFILTRATED", "REDAI_RANSOMWARE_DEPLOYED",
    "CONTROL_PREVENTION", "CONTROL_CONTAINMENT", "TELEMETRY_ALERT",
  ]);

  return events
    .filter((e) => relevant.has(e.type))
    .map((e, i) => {
      const ep = p(e);
      const mitreTechniqueId =
        e.type === "TELEMETRY_ALERT" ? (ep.mitreTechniqueId as string | undefined) : undefined;
      return {
        index: i,
        eventType: e.type,
        actor: e.actor,
        summary: e.narrative?.replace(/^\[.*?\]\s*/, "") ?? e.type.replace(/_/g, " "),
        mitreTechniqueId,
      };
    });
}

function buildMitreCoverage(events: RawEvent[]): MitreCoverage {
  // Collect MITRE techniques from successful adversary actions
  const usedRaw = events
    .filter((e) => e.type === "REDAI_ACTION")
    .filter((e) => {
      const ep = p(e);
      return ep.succeeded === true || (ep.prevented !== true && ep.blocked !== true);
    })
    .flatMap((e) => getMitreTechniques(p(e).action as string));

  const used = dedupeBy(usedRaw, (t) => t.id);

  // Visible telemetry → detected technique IDs
  const detectedIds = new Set(
    events
      .filter((e) => e.type === "TELEMETRY_ALERT" && p(e).visible === true)
      .map((e) => p(e).mitreTechniqueId as string)
      .filter(Boolean)
  );

  const detected = used.filter((t) => detectedIds.has(t.id));
  const missed = used.filter((t) => !detectedIds.has(t.id));
  const coveragePercent = used.length > 0
    ? clamp((detected.length / used.length) * 100)
    : 100;

  return { used, detected, missed, coveragePercent };
}

function buildControlSummaries(events: RawEvent[]): {
  effective: ControlSummary[];
  bypassed: ControlSummary[];
} {
  const preventionCounts: Record<string, number> = {};
  const containmentCounts: Record<string, number> = {};

  for (const e of events) {
    if (e.type === "CONTROL_PREVENTION") {
      const id = p(e).control as string;
      if (id) preventionCounts[id] = (preventionCounts[id] ?? 0) + 1;
    }
    if (e.type === "CONTROL_CONTAINMENT") {
      const id = p(e).control as string;
      if (id) containmentCounts[id] = (containmentCounts[id] ?? 0) + 1;
    }
  }

  const effective: ControlSummary[] = [
    ...Object.entries(preventionCounts).map(([id, count]) => ({
      controlId: id,
      controlName: getControl(id)?.name ?? id,
      type: "PREVENTION" as const,
      count,
    })),
    ...Object.entries(containmentCounts).map(([id, count]) => ({
      controlId: id,
      controlName: getControl(id)?.name ?? id,
      type: "CONTAINMENT" as const,
      count,
    })),
  ];

  // Bypassed = adversary actions that succeeded, keyed by which controls should have stopped them
  const succeeded = events
    .filter((e) => e.type === "REDAI_ACTION" && p(e).succeeded === true)
    .map((e) => p(e).action as string)
    .filter(Boolean);

  // Controls known to prevent each action but weren't active / didn't fire
  const actionToPreventors: Record<string, string[]> = {
    PHISH_EMPLOYEE: ["block_email_gateway", "notify_employees"],
    STEAL_CREDENTIALS: ["enable_mfa", "reset_credentials"],
    EXPLOIT_SERVER: ["patch_servers"],
    MOVE_LATERALLY: ["segment_network", "enable_mfa"],
    EXFILTRATE_DATA: ["block_egress"],
    DEPLOY_RANSOMWARE: ["activate_edr", "engage_incident_response"],
  };

  const bypassedIds = new Set<string>();
  for (const action of succeeded) {
    for (const ctrlId of actionToPreventors[action] ?? []) {
      bypassedIds.add(ctrlId);
    }
  }
  const alreadyPreventedIds = new Set(Object.keys(preventionCounts));
  const bypassed: ControlSummary[] = [...bypassedIds]
    .filter((id) => !alreadyPreventedIds.has(id))
    .map((id) => ({
      controlId: id,
      controlName: getControl(id)?.name ?? id,
      type: "PREVENTION" as const,
      count: 0,
    }));

  return { effective, bypassed };
}

function buildBusinessImpact(events: RawEvent[]): BusinessImpact {
  const compromisedEmployees = events.filter((e) => e.type === "REDAI_EMPLOYEE_COMPROMISED").length;
  const compromisedSystems = events.filter((e) => e.type === "REDAI_SYSTEM_COMPROMISED").length;
  const dataExfiltrated = events.some((e) => e.type === "REDAI_DATA_EXFILTRATED");
  const ransomwareDeployed = events.some((e) => e.type === "REDAI_RANSOMWARE_DEPLOYED");

  const estimatedRecords = events
    .filter((e) => e.type === "REDAI_DATA_EXFILTRATED")
    .reduce((sum, e) => sum + ((p(e).recordsEstimate as number) ?? 5000), 0);

  const costEmployees = compromisedEmployees * 10_000;
  const costSystems = compromisedSystems * 50_000;
  const costData = estimatedRecords * 150;
  const costRansomware = ransomwareDeployed ? 500_000 + compromisedSystems * 100_000 : 0;
  const estimatedCostUSD = costEmployees + costSystems + costData + costRansomware;

  let classification: BusinessImpact["classification"];
  if (estimatedCostUSD === 0) classification = "MINOR";
  else if (estimatedCostUSD < 200_000) classification = "MODERATE";
  else if (estimatedCostUSD < 1_000_000) classification = "SIGNIFICANT";
  else if (estimatedCostUSD < 5_000_000) classification = "SEVERE";
  else classification = "CATASTROPHIC";

  return {
    compromisedEmployees,
    compromisedSystems,
    dataExfiltrated,
    estimatedRecords,
    ransomwareDeployed,
    estimatedCostUSD,
    classification,
  };
}

function buildScores(events: RawEvent[], impact: BusinessImpact): DebriefScores {
  const adversaryActions = events.filter((e) => e.type === "REDAI_ACTION");
  const successfulActions = adversaryActions.filter((e) => p(e).succeeded === true);
  const visibleAlerts = events.filter(
    (e) => e.type === "TELEMETRY_ALERT" && p(e).visible === true
  );
  const preventions = events.filter((e) => e.type === "CONTROL_PREVENTION");
  const containments = events.filter((e) => e.type === "CONTROL_CONTAINMENT");
  const studentActions = events.filter((e) => e.type === "STUDENT_ACTION");
  const backupActivated = studentActions.some((e) => p(e).actionId === "restore_backups");

  const totalSuccessful = successfulActions.length;
  const totalActions = adversaryActions.length;

  const detection = totalSuccessful > 0
    ? clamp((visibleAlerts.length / totalSuccessful) * 100)
    : 100;

  const containment = totalActions > 0
    ? clamp(((preventions.length + containments.length * 0.5) / totalActions) * 100)
    : 100;

  const recovery = impact.ransomwareDeployed
    ? (backupActivated ? 65 : 20)
    : impact.dataExfiltrated
    ? 55
    : 90;

  const response = clamp(
    (studentActions.length / Math.max(visibleAlerts.length, 1)) * 80
  );

  const overall = clamp(
    detection * 0.30 +
    containment * 0.30 +
    recovery * 0.20 +
    response * 0.20
  );

  return { detection, containment, recovery, response, overall };
}

function buildRecommendations(
  mitre: MitreCoverage,
  scores: DebriefScores,
  impact: BusinessImpact,
  events: RawEvent[]
): string[] {
  const recs: string[] = [];

  const missedTactics = new Set(mitre.missed.map((t) => t.tactic));

  if (missedTactics.has("Initial Access")) {
    recs.push("Email Security Gateway + phishing simulation training would significantly reduce initial access risk.");
  }
  if (missedTactics.has("Credential Access")) {
    recs.push("MFA and Privileged Access Management (PAM) would impede credential theft — second factor prevents hash reuse.");
  }
  if (missedTactics.has("Lateral Movement")) {
    recs.push("Network segmentation would confine lateral movement — adversary gains one segment, not the full environment.");
  }
  if (missedTactics.has("Exfiltration")) {
    recs.push("DLP with egress filtering would detect and block outbound data staging before exfiltration completes.");
  }
  if (missedTactics.has("Impact")) {
    recs.push("EDR with anti-ransomware modules would detect mass encryption activity and halt propagation within minutes.");
  }

  if (scores.detection < 50) {
    recs.push("SIEM deployment would centralise log sources and raise detection probability across all attack phases.");
  }
  if (scores.containment < 40) {
    recs.push("Incident Response retainer enables faster containment — current response window allowed full campaign completion.");
  }
  if (impact.ransomwareDeployed && !events.some((e) => e.type === "STUDENT_ACTION" && p(e).actionId === "restore_backups")) {
    recs.push("Immutable backup strategy (3-2-1 rule) would enable recovery without ransom payment and limit downtime.");
  }
  if (impact.dataExfiltrated) {
    recs.push("Zero Trust architecture with least-privilege access would limit data accessible from any single compromised account.");
  }

  if (recs.length === 0) {
    recs.push("Strong defensive posture demonstrated. Consider red team exercise to stress-test controls against a more sophisticated adversary.");
  }

  return recs;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function generateDebrief(
  events: RawEvent[],
  _company: CompanyProfile
): DebriefReport {
  const attackTimeline = buildTimeline(events);
  const mitreCoverage = buildMitreCoverage(events);
  const { effective: controlsEffective, bypassed: controlsBypassed } = buildControlSummaries(events);
  const businessImpact = buildBusinessImpact(events);
  const scores = buildScores(events, businessImpact);
  const recommendations = buildRecommendations(mitreCoverage, scores, businessImpact, events);

  return {
    attackTimeline,
    mitreCoverage,
    controlsEffective,
    controlsBypassed,
    businessImpact,
    scores,
    recommendations,
  };
}
