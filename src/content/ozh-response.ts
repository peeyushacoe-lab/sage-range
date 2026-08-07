/**
 * Operation Zero Hour — Phase 5: Incident Response, and Phase 6: Final Report.
 *
 * Phase 5 is the phase that separates an analyst from a quiz-taker. The action
 * list contains things that are correct, things that are merely available, and
 * things that are actively harmful — and the harmful ones are all plausible.
 * Shutting down the domain controller because it appears in the attack path,
 * powering off patient zero before memory is captured, deleting the staged
 * archive because it is "the stolen data": each is a real mistake made by real
 * responders under pressure, and each subtracts.
 *
 * Because harmful actions subtract, selecting everything scores badly. That is
 * the point — an action set is judged by what it leaves out as much as by what
 * it contains.
 *
 * `responseActions()` is client-safe: it carries labels and categories but not
 * grades. `responseKey()` and `reportKey()` are not.
 */

import type { OzhEvidence } from "./ozh-evidence";
import type { ResponseKey, ReportKey } from "@/lib/ozh-engine";

export type ResponseCategory = "ENDPOINT" | "ACCOUNTS" | "NETWORK" | "EVIDENCE" | "COMMS";

export type ResponseAction = {
  id: string;
  category: ResponseCategory;
  label: string;
  detail: string;
};

export function responseActions(e: OzhEvidence): ResponseAction[] {
  return [
    // ── Endpoint ──
    {
      id: "isolate-patient-zero",
      category: "ENDPOINT",
      label: `Network-isolate ${e.victimHost}`,
      detail: "Cut network access but leave the host powered on and running.",
    },
    {
      id: "isolate-fileserver",
      category: "ENDPOINT",
      label: `Network-isolate ${e.fileServer}`,
      detail: "Contain the second compromised host. Client shares go offline.",
    },
    {
      id: "power-off-patient-zero",
      category: "ENDPOINT",
      label: `Power off ${e.victimHost} immediately`,
      detail: "Hard shutdown to stop the implant.",
    },
    {
      id: "reimage-now",
      category: "ENDPOINT",
      label: `Reimage ${e.victimHost} and return it to the user`,
      detail: "Fastest route back to a working machine.",
    },
    {
      id: "shutdown-dc",
      category: "ENDPOINT",
      label: `Shut down ${e.dcHost}`,
      detail: "The domain controller appears in the attacker's discovery activity.",
    },
    {
      id: "remove-task",
      category: "ENDPOINT",
      label: `Remove scheduled task "${e.taskName}"`,
      detail: "Delete the persistence mechanism on the workstation.",
    },
    {
      id: "remove-runkey",
      category: "ENDPOINT",
      label: `Remove the ${e.runKeyName} autorun value on ${e.fileServer}`,
      detail: "Delete the second persistence mechanism.",
    },

    // ── Accounts ──
    {
      id: "disable-victim",
      category: "ACCOUNTS",
      label: `Disable ${e.victimUser}`,
      detail: "Suspend the compromised employee account pending investigation.",
    },
    {
      id: "reset-svc",
      category: "ACCOUNTS",
      label: `Reset and rotate ${e.svcAccount}`,
      detail: "Change the service account credential and update dependent services.",
    },
    {
      id: "revoke-sessions",
      category: "ACCOUNTS",
      label: `Revoke active sessions and Kerberos tickets for ${e.svcAccount}`,
      detail: "A password reset alone leaves existing tickets valid.",
    },
    {
      id: "disable-all-service-accounts",
      category: "ACCOUNTS",
      label: "Disable every service account in the domain",
      detail: "Guarantees no service account can be abused.",
    },
    {
      id: "reset-spray-target",
      category: "ACCOUNTS",
      label: `Unlock and reset ${e.sprayTarget}`,
      detail: "The account targeted by the VPN password spray.",
    },

    // ── Network ──
    {
      id: "block-c2-ip",
      category: "NETWORK",
      label: `Block ${e.c2Ip} at the perimeter`,
      detail: "Deny outbound traffic to the beacon destination.",
    },
    {
      id: "block-c2-domain",
      category: "NETWORK",
      label: `Sinkhole ${e.c2Domain}`,
      detail: "Break both the beacon and the DNS exfiltration channel.",
    },
    {
      id: "block-hash",
      category: "NETWORK",
      label: "Block the implant hash estate-wide",
      detail: `Add ${e.macroHash.slice(0, 16)}… to the EDR block list.`,
    },
    {
      id: "block-phish-domain",
      category: "NETWORK",
      label: `Block ${e.phishDomain} and sweep the mail estate`,
      detail: "Stop further delivery and pull the eleven quarantined copies.",
    },
    {
      id: "block-all-dns",
      category: "NETWORK",
      label: "Block all outbound DNS at the firewall",
      detail: "Stops the tunnelling channel outright.",
    },

    // ── Evidence ──
    {
      id: "preserve-memory",
      category: "EVIDENCE",
      label: `Capture a memory image from ${e.victimHost}`,
      detail: "Acquire volatile memory before any containment that reboots the host.",
    },
    {
      id: "preserve-logs",
      category: "EVIDENCE",
      label: "Preserve and hash the relevant log sets",
      detail: "Export mail, EDR, DNS, firewall and authentication logs for the window.",
    },
    {
      id: "preserve-archive",
      category: "EVIDENCE",
      label: `Forensically copy ${e.archiveName} before removal`,
      detail: "Establish exactly what was staged for exfiltration.",
    },
    {
      id: "delete-archive",
      category: "EVIDENCE",
      label: `Delete ${e.archivePath}`,
      detail: "Remove the staged client data from the file server.",
    },

    // ── Comms ──
    {
      id: "notify-legal",
      category: "COMMS",
      label: "Notify legal and the data protection officer",
      detail: "Client records were staged and exfiltrated; a notification assessment is needed.",
    },
    {
      id: "email-all-staff",
      category: "COMMS",
      label: "Email all 240 staff with the technical details now",
      detail: "Warn everyone about the phishing campaign immediately.",
    },
  ];
}

/**
 * Answer key. Server-side only.
 *
 * Weights are relative, not absolute — the engine normalises the CORRECT
 * weights to the 150-point pool, so adding an action later does not silently
 * change what the phase is worth.
 */
export function responseKey(e: OzhEvidence): ResponseKey[] {
  return [
    {
      actionId: "isolate-patient-zero",
      grade: "CORRECT",
      weight: 3,
      label: `Isolate ${e.victimHost}`,
      rationale: "Contains the implant while keeping memory intact for acquisition.",
    },
    {
      actionId: "isolate-fileserver",
      grade: "CORRECT",
      weight: 3,
      label: `Isolate ${e.fileServer}`,
      rationale: "The second compromised host, with its own persistence. Leaving it up leaves the attacker in.",
    },
    {
      actionId: "preserve-memory",
      grade: "CORRECT",
      weight: 3,
      label: "Capture memory before containment reboots anything",
      rationale: "The implant is running; its memory is the best evidence available and it is gone on reboot.",
    },
    {
      actionId: "reset-svc",
      grade: "CORRECT",
      weight: 3,
      label: `Reset ${e.svcAccount}`,
      rationale: "The dumped credential is what carried the attacker to the file server.",
    },
    {
      actionId: "revoke-sessions",
      grade: "CORRECT",
      weight: 2,
      label: "Revoke sessions and tickets",
      rationale: "Kerberos tickets issued before a reset stay valid for their lifetime.",
    },
    {
      actionId: "disable-victim",
      grade: "CORRECT",
      weight: 2,
      label: `Disable ${e.victimUser}`,
      rationale: "The account is under attacker control until proven otherwise.",
    },
    {
      actionId: "block-c2-ip",
      grade: "CORRECT",
      weight: 2,
      label: `Block ${e.c2Ip}`,
      rationale: "Severs the beacon for any host you have not yet found.",
    },
    {
      actionId: "block-c2-domain",
      grade: "CORRECT",
      weight: 2,
      label: `Sinkhole ${e.c2Domain}`,
      rationale: "The IP block alone does not stop DNS tunnelling, which resolves through your own resolver.",
    },
    {
      actionId: "block-hash",
      grade: "CORRECT",
      weight: 2,
      label: "Block the implant hash",
      rationale: "Prevents re-execution across the estate, including from the quarantined copies.",
    },
    {
      actionId: "block-phish-domain",
      grade: "CORRECT",
      weight: 2,
      label: `Block ${e.phishDomain}`,
      rationale: "Eleven more copies were delivered to other mailboxes.",
    },
    {
      actionId: "remove-runkey",
      grade: "CORRECT",
      weight: 2,
      label: "Remove the file server autorun value",
      rationale: "The second persistence mechanism. Removing only the scheduled task leaves the attacker a way back.",
    },
    {
      actionId: "preserve-logs",
      grade: "CORRECT",
      weight: 2,
      label: "Preserve and hash the logs",
      rationale: "Retention windows are short; the DNS and mail logs will roll before the investigation closes.",
    },
    {
      actionId: "preserve-archive",
      grade: "CORRECT",
      weight: 2,
      label: `Forensically copy ${e.archiveName}`,
      rationale: "It is the only record of precisely which client data was taken, which is what the notification assessment turns on.",
    },
    {
      actionId: "notify-legal",
      grade: "CORRECT",
      weight: 2,
      label: "Notify legal and the DPO",
      rationale: "Personal financial data left the estate. The notification clock is already running.",
    },
    {
      actionId: "remove-task",
      grade: "CORRECT",
      weight: 1,
      label: "Remove the scheduled task",
      rationale: "Correct, but on its own it is the trap — it is not the only persistence.",
    },

    // ── Harmful ──
    {
      actionId: "shutdown-dc",
      grade: "HARMFUL",
      weight: 3,
      label: `Shut down ${e.dcHost}`,
      rationale:
        "The DC was enumerated, not compromised. Taking it down halts authentication for all 240 staff and achieves nothing the isolation of two hosts does not.",
    },
    {
      actionId: "reimage-now",
      grade: "HARMFUL",
      weight: 3,
      label: `Reimage ${e.victimHost} immediately`,
      rationale: "Destroys every artefact on patient zero before it has been acquired. The investigation cannot be completed afterwards.",
    },
    {
      actionId: "power-off-patient-zero",
      grade: "HARMFUL",
      weight: 2,
      label: `Power off ${e.victimHost}`,
      rationale: "Loses volatile memory — the implant's configuration, keys and any unwritten staging. Isolation achieves containment without the loss.",
    },
    {
      actionId: "delete-archive",
      grade: "HARMFUL",
      weight: 2,
      label: `Delete ${e.archivePath}`,
      rationale: "Destroys the evidence of what was taken. The data is already gone; the archive is now a forensic record, not a live risk.",
    },
    {
      actionId: "disable-all-service-accounts",
      grade: "HARMFUL",
      weight: 2,
      label: "Disable every service account",
      rationale: "Takes backups, batch processing and the trading platform down across a financial services firm to address one known account.",
    },
    {
      actionId: "block-all-dns",
      grade: "HARMFUL",
      weight: 2,
      label: "Block all outbound DNS",
      rationale: "Breaks essentially every business system. Sinkholing the one domain gets the same containment at no cost.",
    },
    {
      actionId: "email-all-staff",
      grade: "HARMFUL",
      weight: 1,
      label: "Mass-email the technical details now",
      rationale: "Tips off an attacker who still has access, and breach communications are not the responder's call to make unilaterally.",
    },

    // ── Neutral: defensible, but neither contains nor harms. ──
    {
      actionId: "reset-spray-target",
      grade: "NEUTRAL",
      weight: 0,
      label: `Reset ${e.sprayTarget}`,
      rationale: "Reasonable hygiene after a spray, but this account was never compromised.",
    },
  ];
}

// ── Phase 6: Final Report ───────────────────────────────────────────────────

export type ReportOptionSets = {
  severity: string[];
  iocs: string[];
  assets: string[];
  techniques: string[];
  containment: string[];
};

/**
 * The option sets the report editor renders.
 *
 * Each list mixes the correct entries with plausible wrong ones drawn from the
 * same incident — the spray IP, the blocked firewall destination, the DC —
 * so ticking everything is penalised by the report grader's false-positive
 * rule rather than rewarded.
 */
export function reportOptions(e: OzhEvidence): ReportOptionSets {
  return {
    severity: ["Low", "Medium", "High", "Critical"],
    iocs: [
      e.c2Ip,
      e.c2Domain,
      e.macroHash,
      e.attachment,
      e.phishDomain,
      e.stagerName,
      e.taskName,
      e.runKeyName,
      e.sprayIp,
      "198.18.55.11",
      "portal.aegisfinancial.com",
      e.archiveName,
    ],
    assets: [
      e.victimHost,
      e.fileServer,
      e.victimUser,
      e.svcAccount,
      e.dcHost,
      e.dbServer,
      "WEB-01",
      e.vpnGateway,
      e.sprayTarget,
      "MAIL-GW-01",
    ],
    techniques: [
      "T1566.001",
      "T1059.001",
      "T1053.005",
      "T1547.001",
      "T1003.001",
      "T1087.002",
      "T1021.002",
      "T1560.001",
      "T1048.003",
      "T1071.004",
      "T1190",
      "T1021.001",
      "T1486",
    ],
    containment: [
      `Isolate ${e.victimHost}`,
      `Isolate ${e.fileServer}`,
      `Reset ${e.svcAccount}`,
      `Sinkhole ${e.c2Domain}`,
      `Shut down ${e.dcHost}`,
      `Reimage ${e.victimHost} immediately`,
      "Block all outbound DNS",
    ],
  };
}

/** Answer key. Server-side only. */
export function reportKey(e: OzhEvidence): ReportKey {
  return {
    // Confirmed exfiltration of client financial records from a regulated
    // firm. Anything below Critical understates a notifiable breach.
    severity: "Critical",
    iocs: [
      e.c2Ip,
      e.c2Domain,
      e.macroHash,
      e.attachment,
      e.phishDomain,
      e.stagerName,
      e.taskName,
      e.runKeyName,
    ],
    // The spray target is not listed: that account was attacked and never
    // compromised, and naming it as affected would misstate the breach scope.
    assets: [e.victimHost, e.fileServer, e.victimUser, e.svcAccount],
    techniques: [
      "T1566.001",
      "T1059.001",
      "T1053.005",
      "T1547.001",
      "T1003.001",
      "T1087.002",
      "T1021.002",
      "T1560.001",
      "T1048.003",
      "T1071.004",
    ],
    containment: [
      `Isolate ${e.victimHost}`,
      `Isolate ${e.fileServer}`,
      `Reset ${e.svcAccount}`,
      `Sinkhole ${e.c2Domain}`,
    ],
  };
}
