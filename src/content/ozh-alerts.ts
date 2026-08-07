/**
 * Operation Zero Hour — Phase 1: SOC Triage.
 *
 * Fifteen alerts from the Aegis SOC queue. Nine are the intrusion, six are the
 * noise a real queue carries: a backup job, a scanner, an expiring certificate,
 * an admin doing legitimate work that looks alarming, a stale-password lockout,
 * and one genuinely suspicious event that was already blocked at the firewall.
 *
 * The trap is deliberate. ALERT-001 is the loudest thing in the queue — a
 * password spray with dozens of failures — and it is the first alert by
 * timestamp, so it reads like the way in. It never succeeded. The actual entry
 * is ALERT-015, a quiet mail-gateway delivery that fired no authentication
 * alarm at all. An intern who triages by noise gets the wrong answer for the
 * next four phases.
 *
 * `alerts()` is client-safe. `triageKey()` is not, and must never be
 * serialised into a page or an API response.
 */

import type { OzhEvidence } from "./ozh-evidence";
import type { TriageKey } from "@/lib/ozh-engine";

export type OzhAlert = {
  id: string;
  /** Detection source, as it would appear in the console. */
  source: string;
  /** Wall-clock time on the day of the incident. */
  at: string;
  summary: string;
  rawLog: string;
};

/** Assets the intern picks from when attributing an alert. */
export function assetList(e: OzhEvidence): string[] {
  return [
    e.victimHost,
    e.vpnGateway,
    e.fileServer,
    e.dcHost,
    e.dbServer,
    "MAIL-GW-01",
    "WEB-01",
    "DNS-01",
    "FW-EDGE-01",
    "SEC-SCAN-01",
  ];
}

export function alerts(e: OzhEvidence): OzhAlert[] {
  return [
    {
      id: "ALERT-001",
      source: "VPN Gateway",
      at: "09:17",
      summary: `${e.sprayAttempts} failed authentication attempts against ${e.vpnGateway}`,
      rawLog: `${e.sprayAttempts} auth failures in 00:04:12
user=${e.sprayTarget}  src=${e.sprayIp}  dst=${e.vpnGateway}
result=FAIL (bad password) ×${e.sprayAttempts}
successful_auth_from_src=0
account_lockout=triggered 09:16:58`,
    },
    {
      id: "ALERT-002",
      source: "EDR — Sysmon",
      at: "09:19",
      summary: `PowerShell spawned by EXCEL.EXE on ${e.victimHost}`,
      rawLog: `EventID 1  08:47:31  ${e.victimHost}  User=${e.victimUser}
ParentImage=C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE
Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
CommandLine=powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0A...
IntegrityLevel=Medium`,
    },
    {
      id: "ALERT-003",
      source: "DNS Resolver",
      at: "10:47",
      summary: `Abnormal DNS TXT query volume from ${e.victimHost}`,
      rawLog: `src=${e.victimHost}  resolver=DNS-01
query_type=TXT  count=${e.dnsQueryCount} in 00:38:00
domain=*.${e.c2Domain}
avg_label_length=48 chars  entropy=high
baseline_for_host=31 TXT queries/day`,
    },
    {
      id: "ALERT-004",
      source: "File Server Audit",
      at: "02:19",
      summary: `Bulk file read by ${e.svcAccount} on ${e.fileServer}`,
      rawLog: `src=${e.fileServer}  account=${e.svcAccount}
operation=READ  objects=48,201  window=02:14–02:51
job=NightlyBackup-Full  scheduler=Veeam
change_ticket=CHG-2026-0771 (approved, recurring)`,
    },
    {
      id: "ALERT-005",
      source: "Active Directory",
      at: "08:12",
      summary: "Repeated failed logons for a single user on one workstation",
      rawLog: `user=k.brennan  src=WS-058  dst=${e.dcHost}
4625 ×6 between 08:09 and 08:12
4624 SUCCESS at 08:13 from same host
pwdLastSet=2026-08-06 17:44 (previous day)
Helpdesk note: cached credential on mapped drive after password change.`,
    },
    {
      id: "ALERT-006",
      source: "IDS",
      at: "06:00",
      summary: "Internal port scan across three server subnets",
      rawLog: `src=SEC-SCAN-01  dst=10.40.0.0/16, 10.41.0.0/16, 10.42.0.0/16
ports=1-65535  rate=high
signature=ET SCAN Nmap Scripting Engine
asset_owner=Security Engineering
schedule=weekly authenticated scan, Mondays 06:00`,
    },
    {
      id: "ALERT-007",
      source: "EDR — Sysmon",
      at: "09:28",
      summary: `Scheduled task "${e.taskName}" created on ${e.victimHost}`,
      rawLog: `EventID 1  09:26:04  ${e.victimHost}  User=${e.victimUser}
Image=C:\\Windows\\System32\\schtasks.exe
CommandLine=schtasks /create /tn "${e.taskName}" /tr "${e.stagerPath}" /sc onlogon /rl highest
ParentImage=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
No matching change ticket.`,
    },
    {
      id: "ALERT-008",
      source: "EDR — Credential Guard",
      at: "09:36",
      summary: `Handle to LSASS opened by an unsigned binary on ${e.victimHost}`,
      rawLog: `EventID 10  09:34:47  ${e.victimHost}
SourceImage=${e.stagerPath}
TargetImage=C:\\Windows\\System32\\lsass.exe
GrantedAccess=0x1010  (PROCESS_VM_READ | PROCESS_QUERY_LIMITED_INFORMATION)
SourceImage signature=UNSIGNED
SHA256=${e.macroHash}`,
    },
    {
      id: "ALERT-009",
      source: "Windows Security Log",
      at: "10:04",
      summary: `Service account ${e.svcAccount} authenticated to ${e.fileServer} from a workstation`,
      rawLog: `4624  10:02:11  ${e.fileServer}
Account=${e.svcAccount}  LogonType=3 (Network)
Source=${e.victimHost}  AuthPackage=NTLM
Share accessed: \\\\${e.fileServer}\\ADMIN$
Note: ${e.svcAccount} has never authenticated from a workstation before.`,
    },
    {
      id: "ALERT-010",
      source: "EDR — Sysmon",
      at: "10:21",
      summary: `Archive ${e.archiveName} created in a system temp directory`,
      rawLog: `EventID 11  10:19:38  ${e.fileServer}
TargetFilename=${e.archivePath}
Size=${e.archiveSizeMb} MB
CreatingProcess=7z.exe  Account=${e.svcAccount}
Source paths: \\\\${e.fileServer}\\ClientData\\, \\\\${e.fileServer}\\Ledgers\\`,
    },
    {
      id: "ALERT-011",
      source: "EDR — Registry Monitor",
      at: "10:33",
      summary: `Autorun registry value added on ${e.fileServer}`,
      rawLog: `EventID 13  10:31:52  ${e.fileServer}
TargetObject=${e.runKeyPath}
Details=C:\\Windows\\Temp\\${e.stagerName}
Account=${e.svcAccount}
No matching software deployment record.`,
    },
    {
      id: "ALERT-012",
      source: "Perimeter Firewall",
      at: "11:02",
      summary: "Outbound connection to a threat-intel listed address was blocked",
      rawLog: `src=WEB-01  dst=198.18.55.11:8080  proto=TCP
action=DENY  rule=OUTBOUND-TI-BLOCK
intel_list=Emerging Threats — Compromised Hosts
attempts=3  bytes_transferred=0`,
    },
    {
      id: "ALERT-013",
      source: "Certificate Monitor",
      at: "07:00",
      summary: "TLS certificate approaching expiry on the public web server",
      rawLog: `host=WEB-01  cn=portal.aegisfinancial.com
not_after=2026-08-21T23:59:59Z  days_remaining=14
issuer=DigiCert TLS RSA SHA256 2020 CA1
renewal_ticket=CHG-2026-0804 (open, assigned)`,
    },
    {
      id: "ALERT-014",
      source: "Windows Security Log",
      at: "09:41",
      summary: "PowerShell remoting from an administrator workstation to three servers",
      rawLog: `src=WS-ADM-04  account=t.sorensen-adm
WinRM sessions to ${e.dbServer}, WEB-01, MAIL-GW-01
CommandLine=Get-HotFix | Where-Object InstalledOn -gt '2026-07-01'
change_ticket=CHG-2026-0802 (approved, patch verification window 09:30–10:30)
Account is a member of Tier-1 Server Admins.`,
    },
    {
      id: "ALERT-015",
      source: "Mail Gateway",
      at: "08:43",
      summary: `Inbound message with macro-enabled attachment delivered to ${e.victimUser}`,
      rawLog: `08:41:19  msg_id=<a7f2e@${e.phishDomain}>
From: ${e.phishSender}
To: ${e.victimEmail}
Subject: Q3 reconciliation — signed off, please confirm
Attachment: ${e.attachment}  (macro-enabled, 96 KB)
SHA256=${e.macroHash}
spf=fail  dkim=none  dmarc=fail
Disposition: DELIVERED (sender domain not on block list)`,
    },
  ];
}

/**
 * Answer key. Server-side only.
 *
 * Priorities follow the Aegis runbook: P1 is an active compromise needing
 * immediate action, P2 an attacker action already contained or historic, P3
 * worth investigation this shift, P4 informational.
 */
export function triageKey(e: OzhEvidence): TriageKey[] {
  return [
    // Real, and hostile — but every attempt failed and the account locked out.
    // MALICIOUS with a HIGH rather than CRITICAL severity is the honest read:
    // an attack occurred, no access was gained.
    { alertId: "ALERT-001", verdict: "MALICIOUS", severity: "HIGH", priority: "P2", asset: e.vpnGateway },
    { alertId: "ALERT-002", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: e.victimHost },
    { alertId: "ALERT-003", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: e.victimHost },
    { alertId: "ALERT-004", verdict: "BENIGN", severity: "INFO", priority: "P4", asset: e.fileServer },
    { alertId: "ALERT-005", verdict: "FALSE_POSITIVE", severity: "INFO", priority: "P4", asset: e.dcHost },
    { alertId: "ALERT-006", verdict: "BENIGN", severity: "INFO", priority: "P4", asset: "SEC-SCAN-01" },
    { alertId: "ALERT-007", verdict: "MALICIOUS", severity: "HIGH", priority: "P1", asset: e.victimHost },
    { alertId: "ALERT-008", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: e.victimHost },
    { alertId: "ALERT-009", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: e.fileServer },
    { alertId: "ALERT-010", verdict: "MALICIOUS", severity: "HIGH", priority: "P1", asset: e.fileServer },
    { alertId: "ALERT-011", verdict: "MALICIOUS", severity: "HIGH", priority: "P2", asset: e.fileServer },
    // Blocked at the perimeter with zero bytes transferred: worth a look, not
    // evidence of compromise, and not part of this intrusion.
    { alertId: "ALERT-012", verdict: "SUSPICIOUS", severity: "MEDIUM", priority: "P3", asset: "WEB-01" },
    { alertId: "ALERT-013", verdict: "BENIGN", severity: "LOW", priority: "P4", asset: "WEB-01" },
    { alertId: "ALERT-014", verdict: "BENIGN", severity: "LOW", priority: "P4", asset: e.dbServer },
    { alertId: "ALERT-015", verdict: "MALICIOUS", severity: "CRITICAL", priority: "P1", asset: "MAIL-GW-01" },
  ];
}
