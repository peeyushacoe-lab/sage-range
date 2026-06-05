import type { AdversaryState, AdversaryPlan } from "./types";
import type { WorldState, EmployeeState } from "../../types";
import type { AssetGraph } from "./asset-graph";
import { getReachableFromCompromised } from "./asset-graph";

export interface ConsequenceEvent {
  type: string;
  actor: string;
  payload: Record<string, unknown>;
  narrative: string;
}

// Pick the most vulnerable uncompromised employee for targeting
function pickVulnerableEmployee(
  employeeStates: EmployeeState[],
  alreadyCompromised: string[]
): EmployeeState | null {
  const candidates = employeeStates.filter((e) => !alreadyCompromised.includes(e.name));
  if (candidates.length === 0) return null;
  return [...candidates].sort(
    (a, b) => (b.stressLevel - b.securityAwareness) - (a.stressLevel - a.securityAwareness)
  )[0];
}

// Fallback pool used only when no asset graph is provided
const FALLBACK_LATERAL_TARGETS = [
  "File Server", "Exchange Server", "SharePoint",
  "Finance Database", "ERP System", "Backup Server", "Dev Server",
];

export function applyAdversaryAction(
  worldState: WorldState,
  employeeStates: EmployeeState[],
  adversaryState: AdversaryState,
  plan: AdversaryPlan,
  assetGraph?: AssetGraph
): ConsequenceEvent[] {
  switch (plan.action) {
    case "PHISH_EMPLOYEE": {
      const target = pickVulnerableEmployee(employeeStates, worldState.compromisedEmployees);
      if (!target) {
        return [
          {
            type: "REDAI_ACTION_FAILED",
            actor: "ADVERSARY",
            payload: { action: plan.action, reason: "no_targets" },
            narrative: "THREAT INTEL: Phishing campaign found no viable targets — employee awareness is sufficient.",
          },
        ];
      }
      const events: ConsequenceEvent[] = [
        {
          type: "REDAI_EMPLOYEE_PHISHED",
          actor: "ADVERSARY",
          payload: { employee: target.name, stressDelta: 10, awarenessDelta: -10 },
          narrative: `THREAT INTEL: Spearphish delivered to ${target.name}. Malicious link clicked — C2 callback established.`,
        },
      ];
      // Employees below 50 awareness are susceptible to full credential compromise
      if (target.securityAwareness < 50) {
        events.push({
          type: "REDAI_EMPLOYEE_COMPROMISED",
          actor: "ADVERSARY",
          payload: { employee: target.name, method: "PHISHING" },
          narrative: `THREAT INTEL: ${target.name} credentials harvested. Adversary holds valid account access.`,
        });
      }
      return events;
    }

    case "STEAL_CREDENTIALS": {
      const lastCompromised = worldState.compromisedEmployees.at(-1);
      const target =
        lastCompromised ??
        [...employeeStates].sort((a, b) => b.insiderRisk - a.insiderRisk)[0]?.name;
      if (!target) return [];
      const elevated = adversaryState.sophistication > 60;
      return [
        {
          type: "REDAI_CREDENTIALS_STOLEN",
          actor: "ADVERSARY",
          payload: { account: target, elevated },
          narrative: elevated
            ? `THREAT INTEL: LSASS dump executed — domain admin hash captured from ${target}'s workstation.`
            : `THREAT INTEL: Credential dump from ${target}'s session. Local password hash captured.`,
        },
      ];
    }

    case "EXPLOIT_SERVER": {
      const system = "internet-facing server";
      return [
        {
          type: "REDAI_SYSTEM_COMPROMISED",
          actor: "ADVERSARY",
          payload: { system, method: "EXPLOIT", status: "DEGRADED" },
          narrative: `THREAT INTEL: Remote code execution confirmed on ${system}. Adversary shell active — privilege escalation in progress.`,
        },
      ];
    }

    case "MOVE_LATERALLY": {
      // Prefer graph-based reachability; fall back to flat pool
      const reachableNodes = assetGraph
        ? getReachableFromCompromised(assetGraph, worldState.compromisedEmployees, worldState.compromisedSystems)
        : [];
      const newSystems = reachableNodes.length > 0
        ? reachableNodes
            .sort((a, b) => {
              const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
              return order[b.criticality] - order[a.criticality];
            })
            .slice(0, 2)
            .map((n) => n.name)
        : FALLBACK_LATERAL_TARGETS.filter((s) => !worldState.compromisedSystems.includes(s)).slice(0, 2);

      if (newSystems.length === 0) {
        return [
          {
            type: "REDAI_ACTION_FAILED",
            actor: "ADVERSARY",
            payload: { action: plan.action, reason: "no_reachable_systems" },
            narrative: "THREAT INTEL: Lateral movement attempted — no uncompromised internal hosts reachable from current position.",
          },
        ];
      }
      return newSystems.map((sys) => ({
        type: "REDAI_SYSTEM_COMPROMISED",
        actor: "ADVERSARY",
        payload: { system: sys, method: "LATERAL_MOVEMENT", status: "DEGRADED" },
        narrative: `THREAT INTEL: Adversary pivoted to ${sys} via pass-the-hash from compromised credentials. Host under attacker control.`,
      }));
    }

    case "EXFILTRATE_DATA": {
      const recordEstimate = Math.max(1000, worldState.compromisedSystems.length * 5000);
      return [
        {
          type: "REDAI_DATA_EXFILTRATED",
          actor: "ADVERSARY",
          payload: {
            systemsAccessed: worldState.compromisedSystems.length,
            recordsEstimate: recordEstimate,
          },
          narrative: `THREAT INTEL: Data staging complete. ~${recordEstimate.toLocaleString()} records exfiltrated via encrypted channel to external C2.`,
        },
        {
          type: "PRESSURE_EVENT",
          actor: "SYSTEM",
          payload: {
            id: "redai_legal_exfil",
            source: "LEGAL",
            message:
              "Legal flagging potential GDPR/CCPA notification obligations. We need incident scope documentation immediately.",
            urgency: "HIGH",
          },
          narrative: "[LEGAL] Regulatory notification obligations triggered by confirmed data exfiltration.",
        },
        {
          type: "PRESSURE_EVENT",
          actor: "SYSTEM",
          payload: {
            id: "redai_ceo_exfil",
            source: "CEO",
            message:
              "Board is demanding an immediate briefing. What data was taken and how many customers are affected?",
            urgency: "CRITICAL",
          },
          narrative: "[CEO] Board requesting immediate breach scope briefing.",
        },
      ];
    }

    case "DEPLOY_RANSOMWARE": {
      const targets =
        worldState.compromisedSystems.length > 0
          ? worldState.compromisedSystems.slice(0, 3)
          : ["File Server", "Domain Controller"];
      return [
        {
          type: "REDAI_RANSOMWARE_DEPLOYED",
          actor: "ADVERSARY",
          payload: { systemsEncrypted: targets },
          narrative: `THREAT INTEL: Ransomware detonated. ${targets.length} system${targets.length > 1 ? "s" : ""} encrypted. Recovery keys withheld.`,
        },
        ...targets.map((sys) => ({
          type: "CONSEQUENCE",
          actor: "SYSTEM",
          payload: {
            system: sys,
            status: "OFFLINE",
            reason: "Encrypted by ransomware",
            triggeredBy: "DEPLOY_RANSOMWARE",
          },
          narrative: `SYSTEM OFFLINE: ${sys} — ransomware encryption complete. All data inaccessible.`,
        })),
        {
          type: "PRESSURE_EVENT",
          actor: "SYSTEM",
          payload: {
            id: "redai_ransom_ceo",
            source: "CEO",
            message:
              "Operations are down. Client calls are coming in. When will systems be restored and do we pay?",
            urgency: "CRITICAL",
          },
          narrative: "[CEO] Operations down — demanding ransom decision.",
        },
      ];
    }

    default:
      return [];
  }
}
