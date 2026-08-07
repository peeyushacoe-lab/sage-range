/**
 * Operation Zero Hour — Phase 4: Attack Reconstruction.
 *
 * Eleven events, presented shuffled and stripped of their timestamps, to be
 * placed into the correct order and labelled with a MITRE tactic.
 *
 * Descriptions deliberately carry no times. The console shows the time slots
 * down one side, so if a description read "at 09:26 a scheduled task was
 * created" the ordering would be a matching exercise rather than an
 * understanding of how an intrusion progresses.
 *
 * EVT-SPRAY is in the set on purpose. It is a genuine credential-access
 * attempt, it belongs in the timeline by time, and it contributed nothing to
 * the compromise. An intern who dropped it in Phase 1 as noise has to decide
 * whether it still belongs on the record. It does — failed attacker activity
 * is part of the incident.
 */

import type { OzhEvidence } from "./ozh-evidence";
import type { ReconKey } from "@/lib/ozh-engine";

export const TACTIC_OPTIONS = [
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
] as const;

export type TimelineEvent = {
  id: string;
  /** No timestamp, by design. */
  description: string;
};

/** The clock face the console renders down the left-hand side. */
export function timelineSlots(): string[] {
  return [
    "08:41",
    "08:47",
    "09:03",
    "09:11",
    "09:26",
    "09:34",
    "09:47",
    "10:02",
    "10:19",
    "10:31",
    "10:44",
  ];
}

/**
 * The event pool, in a stable shuffled order.
 *
 * Shuffling is seeded by userId rather than random so the pool does not
 * reorder underneath a half-finished drag-and-drop on re-render.
 */
export function timelineEvents(e: OzhEvidence, userId: string): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "EVT-PHISH",
      description: `A macro-enabled attachment (${e.attachment}) is delivered to ${e.victimUser} from a lookalike domain. SPF, DKIM and DMARC all fail; the message is delivered anyway.`,
    },
    {
      id: "EVT-EXEC",
      description: `EXCEL.EXE on ${e.victimHost} spawns PowerShell with an encoded command, which downloads ${e.stagerName} to the user's temp directory.`,
    },
    {
      id: "EVT-BEACON",
      description: `${e.victimHost} begins periodic TLS sessions to ${e.c2Ip}:${e.c2Port} on a 60-second interval with jitter.`,
    },
    {
      id: "EVT-SPRAY",
      description: `${e.sprayAttempts} authentication attempts against ${e.vpnGateway} targeting ${e.sprayTarget} from ${e.sprayIp}. Every attempt fails and the account locks out.`,
    },
    {
      id: "EVT-TASK",
      description: `A scheduled task named "${e.taskName}" is registered on ${e.victimHost} to run the implant at every logon with highest privileges.`,
    },
    {
      id: "EVT-LSASS",
      description: `The implant opens a handle to LSASS on ${e.victimHost} and reads process memory, recovering credentials for ${e.svcAccount}.`,
    },
    {
      id: "EVT-DISCO",
      description: `Domain group membership, domain controllers and available shares are enumerated from ${e.victimHost} by the implant rather than by an interactive shell.`,
    },
    {
      id: "EVT-LATERAL",
      description: `${e.svcAccount} authenticates to ${e.fileServer} over SMB from ${e.victimHost} and accesses the admin share — the first time this account has ever logged on from a workstation.`,
    },
    {
      id: "EVT-ARCHIVE",
      description: `${e.archiveName} (${e.archiveSizeMb} MB) is assembled on ${e.fileServer} from the client data and ledger shares using a compression utility.`,
    },
    {
      id: "EVT-RUNKEY",
      description: `A registry autorun value named ${e.runKeyName} is written on ${e.fileServer}, pointing at a copy of the implant in the system temp directory.`,
    },
    {
      id: "EVT-EXFIL",
      description: `${e.dnsQueryCount.toLocaleString()} high-entropy TXT queries leave ${e.victimHost} for subdomains of ${e.c2Domain}, carrying roughly ${e.exfilMb} MB.`,
    },
  ];

  let h = 2166136261;
  const seed = `ozh:timeline:${userId}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0 || 1;
  const next = () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };

  // Fisher-Yates, so every permutation is equally likely and no event has a
  // systematic bias toward the position it belongs in.
  const pool = [...events];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** Answer key. Server-side only. */
export function reconstructionKey(): ReconKey {
  return {
    order: [
      "EVT-PHISH",
      "EVT-EXEC",
      "EVT-BEACON",
      "EVT-SPRAY",
      "EVT-TASK",
      "EVT-LSASS",
      "EVT-DISCO",
      "EVT-LATERAL",
      "EVT-ARCHIVE",
      "EVT-RUNKEY",
      "EVT-EXFIL",
    ],
    tactics: {
      "EVT-PHISH": "Initial Access",
      "EVT-EXEC": "Execution",
      "EVT-BEACON": "Command and Control",
      "EVT-SPRAY": "Credential Access",
      "EVT-TASK": "Persistence",
      "EVT-LSASS": "Credential Access",
      "EVT-DISCO": "Discovery",
      "EVT-LATERAL": "Lateral Movement",
      "EVT-ARCHIVE": "Collection",
      "EVT-RUNKEY": "Persistence",
      "EVT-EXFIL": "Exfiltration",
    },
  };
}
