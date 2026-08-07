/**
 * Operation Zero Hour — scenario assembly.
 *
 * Two entry points, and the split between them is the security boundary for
 * the whole competition:
 *
 *   buildBriefing / buildPhasePayload  → client-safe, may be serialised
 *   buildAnswerKey                     → server-only, must never leave the API
 *
 * Rule 4 of the competition ("solutions must never be sent to the frontend")
 * is enforced by making the answer key reachable only through a function no
 * page component calls. The test suite asserts that no phase payload contains
 * a value from the key that is not already visible in the evidence.
 */

import { deriveEvidence, type OzhEvidence } from "./ozh-evidence";
import { alerts, triageKey, assetList } from "./ozh-alerts";
import {
  evidenceRecords,
  investigationQuestions,
  investigationKey,
} from "./ozh-investigation";
import { huntDataset, huntQuestions, huntKey, TECHNIQUE_OPTIONS } from "./ozh-hunt";
import { timelineEvents, timelineSlots, reconstructionKey, TACTIC_OPTIONS } from "./ozh-timeline";
import { responseActions, responseKey, reportOptions, reportKey } from "./ozh-response";
import type { OzhPhase } from "@/lib/ozh-engine";

export const OZH_SLUG = "operation-zero-hour";
export const OZH_TITLE = "Operation Zero Hour";
export const OZH_COMPANY = "Aegis Financial Services";

export const COMPANY_PROFILE = {
  name: OZH_COMPANY,
  sector: "Financial services",
  employees: 240,
  servers: 31,
  endpoints: 187,
  criticalSystems: 8,
} as const;

/** Rendered as a fixed-width diagram in the briefing. */
export const NETWORK_DIAGRAM = `Internet
   │
Firewall  (FW-EDGE-01)
   │
DMZ
 ├── Web Server    (WEB-01)
 └── Mail Gateway  (MAIL-GW-01)
        │
        ▼
Internal Network
 ├── Domain Controller
 ├── File Server
 ├── Database
 ├── Workstations
 └── Admin Network`;

export const BRIEFING = `You are the primary incident analyst on duty at ${OZH_COMPANY}.

At 09:17 the SOC receives an alert about unusual authentication activity.
Twenty minutes later, another alert appears. Then another.

Nobody is going to tell you which of them matters.

Your objective is to determine how the compromise happened, identify
everything the attacker did, contain the incident, and produce a
professional incident report.

You have three hours. Six phases unlock in sequence and you cannot go back
to a phase once you have submitted it, so be certain before you commit.
Every action you take is logged.

The evidence you are given is real but incomplete, and not all of it is
related. Reaching the wrong conclusion early will cost you for the rest of
the operation.`;

export const RULES = [
  "Individual competition — no collaboration.",
  "One attempt. Once started, the operation cannot be reset.",
  "Three-hour limit, beginning when you start.",
  "Phases unlock in order and lock on submission.",
  "Every evidence view and submission is logged.",
  "The final report cannot be modified after submission.",
] as const;

/** Everything about the run that does not depend on a phase. */
export function buildBriefing() {
  return {
    slug: OZH_SLUG,
    title: OZH_TITLE,
    company: COMPANY_PROFILE,
    network: NETWORK_DIAGRAM,
    briefing: BRIEFING,
    rules: RULES,
    evidenceAvailable: [
      "SOC alerts",
      "Authentication logs",
      "DNS logs",
      "Firewall logs",
      "Endpoint logs",
      "Web logs",
      "Email evidence",
      "File evidence",
      "Network events",
    ],
  };
}

export type PhasePayload =
  | { phase: "TRIAGE"; alerts: ReturnType<typeof alerts>; assets: string[] }
  | {
      phase: "INVESTIGATION";
      records: ReturnType<typeof evidenceRecords>;
      questions: ReturnType<typeof investigationQuestions>;
    }
  | {
      phase: "HUNT";
      dataset: ReturnType<typeof huntDataset>;
      questions: ReturnType<typeof huntQuestions>;
      techniques: typeof TECHNIQUE_OPTIONS;
    }
  | {
      phase: "RECONSTRUCTION";
      events: ReturnType<typeof timelineEvents>;
      slots: string[];
      tactics: typeof TACTIC_OPTIONS;
    }
  | { phase: "RESPONSE"; actions: ReturnType<typeof responseActions> }
  | { phase: "REPORT"; options: ReturnType<typeof reportOptions> };

/**
 * The data one phase needs, and nothing more.
 *
 * Phases are fetched individually rather than shipped as one bundle so a
 * curious intern reading the network tab during Phase 1 cannot see the Phase 3
 * corpus, let alone anything downstream of it.
 */
export function buildPhasePayload(userId: string, phase: OzhPhase): PhasePayload {
  const e = deriveEvidence(userId);
  switch (phase) {
    case "TRIAGE":
      return { phase, alerts: alerts(e), assets: assetList(e) };
    case "INVESTIGATION":
      return {
        phase,
        records: evidenceRecords(e),
        questions: investigationQuestions(e),
      };
    case "HUNT":
      return {
        phase,
        dataset: huntDataset(e, userId),
        questions: huntQuestions(),
        techniques: TECHNIQUE_OPTIONS,
      };
    case "RECONSTRUCTION":
      return {
        phase,
        events: timelineEvents(e, userId),
        slots: timelineSlots(),
        tactics: TACTIC_OPTIONS,
      };
    case "RESPONSE":
      return { phase, actions: responseActions(e) };
    case "REPORT":
      return { phase, options: reportOptions(e) };
  }
}

export type OzhAnswerKey = ReturnType<typeof buildAnswerKey>;

/**
 * The complete answer key for one intern.
 *
 * Server-only. Called by the grader in src/lib/ozh.ts and by the test suite.
 * If you find yourself importing this into anything under src/app that renders
 * — stop; the value you want is already in the phase payload.
 */
export function buildAnswerKey(userId: string) {
  const e = deriveEvidence(userId);
  return {
    evidence: e,
    TRIAGE: triageKey(e),
    INVESTIGATION: investigationKey(e),
    HUNT: huntKey(e),
    RECONSTRUCTION: reconstructionKey(),
    RESPONSE: responseKey(e),
    REPORT: reportKey(e),
  };
}

/** Re-exported so the service layer does not import six content modules. */
export type { OzhEvidence };
export { deriveEvidence };

/**
 * Skills the operation exercises, listed on the result page.
 * Fixed rather than derived — every intern investigates the same attack.
 */
export const SKILLS_DEMONSTRATED = [
  "Threat Hunting",
  "Log Analysis",
  "Incident Response",
  "Digital Forensics",
  "MITRE ATT&CK",
  "Technical Reporting",
] as const;
