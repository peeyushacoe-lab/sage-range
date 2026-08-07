/**
 * Operation Zero Hour — Phase 3: Threat Hunt.
 *
 * The largest phase, and the one that decides the competition. The intern gets
 * a raw log corpus with no alerts attached and has to find ten attacker
 * behaviours in it, then map each to a MITRE technique.
 *
 * Nothing here tells them which techniques are present. The signal lines are
 * seeded into several hundred lines of ordinary estate traffic, and every
 * signal line is written to look exactly like the noise around it — same
 * format, same sources, same hosts.
 *
 * `huntDataset()` and `huntQuestions()` are client-safe: the corpus contains
 * the evidence but never marks it. `huntKey()` is not.
 */

import type { OzhEvidence } from "./ozh-evidence";
import type { HuntKey } from "@/lib/ozh-engine";

export type LogLine = {
  seq: number;
  at: string;
  source: string;
  host: string;
  user: string;
  line: string;
};

/** Techniques offered in the picker. Ten are present; the rest are plausible. */
export const TECHNIQUE_OPTIONS = [
  { id: "T1566.001", label: "T1566.001 — Phishing: Spearphishing Attachment" },
  { id: "T1566.002", label: "T1566.002 — Phishing: Spearphishing Link" },
  { id: "T1190", label: "T1190 — Exploit Public-Facing Application" },
  { id: "T1059.001", label: "T1059.001 — Command and Scripting Interpreter: PowerShell" },
  { id: "T1059.003", label: "T1059.003 — Command and Scripting Interpreter: Windows Command Shell" },
  { id: "T1053.005", label: "T1053.005 — Scheduled Task/Job: Scheduled Task" },
  { id: "T1547.001", label: "T1547.001 — Boot or Logon Autostart: Registry Run Keys" },
  { id: "T1543.003", label: "T1543.003 — Create or Modify System Process: Windows Service" },
  { id: "T1003.001", label: "T1003.001 — OS Credential Dumping: LSASS Memory" },
  { id: "T1003.002", label: "T1003.002 — OS Credential Dumping: Security Account Manager" },
  { id: "T1110.003", label: "T1110.003 — Brute Force: Password Spraying" },
  { id: "T1078.002", label: "T1078.002 — Valid Accounts: Domain Accounts" },
  { id: "T1087.002", label: "T1087.002 — Account Discovery: Domain Account" },
  { id: "T1018", label: "T1018 — Remote System Discovery" },
  { id: "T1135", label: "T1135 — Network Share Discovery" },
  { id: "T1021.002", label: "T1021.002 — Remote Services: SMB/Windows Admin Shares" },
  { id: "T1021.001", label: "T1021.001 — Remote Services: Remote Desktop Protocol" },
  { id: "T1560.001", label: "T1560.001 — Archive Collected Data: Archive via Utility" },
  { id: "T1074.001", label: "T1074.001 — Data Staged: Local Data Staging" },
  { id: "T1048.003", label: "T1048.003 — Exfiltration Over Alternative Protocol" },
  { id: "T1041", label: "T1041 — Exfiltration Over C2 Channel" },
  { id: "T1071.004", label: "T1071.004 — Application Layer Protocol: DNS" },
  { id: "T1027", label: "T1027 — Obfuscated Files or Information" },
  { id: "T1036.005", label: "T1036.005 — Masquerading: Match Legitimate Name or Location" },
] as const;

export type HuntQuestion = {
  id: string;
  tactic: string;
  prompt: string;
  /** What shape of answer the indicator box expects. */
  hint: string;
};

/** Client-safe. The tactic is given; finding the evidence for it is the work. */
export function huntQuestions(): HuntQuestion[] {
  return [
    {
      id: "hunt-initial-access",
      tactic: "Initial Access",
      prompt: "Something was delivered into the estate. Name the artefact that carried it.",
      hint: "A filename",
    },
    {
      id: "hunt-execution",
      tactic: "Execution",
      prompt: "Name the interpreter the attacker used to run their first code.",
      hint: "A process name",
    },
    {
      id: "hunt-persistence-1",
      tactic: "Persistence",
      prompt: "The attacker secured a return path on the workstation. Name it.",
      hint: "A scheduled task name",
    },
    {
      id: "hunt-persistence-2",
      tactic: "Persistence (second mechanism)",
      prompt:
        "One persistence mechanism is not the whole answer. Name the second, established elsewhere.",
      hint: "A registry value name",
    },
    {
      id: "hunt-credential-access",
      tactic: "Credential Access",
      prompt: "Name the process whose memory was read to obtain credentials.",
      hint: "A process name",
    },
    {
      id: "hunt-discovery",
      tactic: "Discovery",
      prompt: "Give the command the attacker ran to enumerate privileged group membership.",
      hint: "A command line",
    },
    {
      id: "hunt-lateral-movement",
      tactic: "Lateral Movement",
      prompt: "Name the host the attacker moved to from patient zero.",
      hint: "A hostname",
    },
    {
      id: "hunt-collection",
      tactic: "Collection",
      prompt: "Name the container the attacker assembled the stolen data into.",
      hint: "A filename",
    },
    {
      id: "hunt-exfiltration",
      tactic: "Exfiltration",
      prompt: "Name the domain the data was carried out through.",
      hint: "A domain",
    },
    {
      id: "hunt-c2",
      tactic: "Command and Control",
      prompt: "Give the address the implant beaconed to.",
      hint: "An IPv4 address",
    },
  ];
}

/** Answer key. Server-side only. */
export function huntKey(e: OzhEvidence): HuntKey[] {
  return [
    {
      id: "hunt-initial-access",
      tactic: "Initial Access",
      technique: "T1566.001",
      accept: [e.attachment],
      label: "Initial Access — malicious attachment",
    },
    {
      id: "hunt-execution",
      tactic: "Execution",
      technique: "T1059.001",
      accept: ["powershell.exe", "powershell"],
      label: "Execution — PowerShell",
    },
    {
      id: "hunt-persistence-1",
      tactic: "Persistence",
      technique: "T1053.005",
      accept: [e.taskName],
      label: "Persistence — scheduled task",
    },
    {
      id: "hunt-persistence-2",
      tactic: "Persistence",
      technique: "T1547.001",
      accept: [e.runKeyName, e.runKeyPath],
      label: "Persistence — registry Run key on the file server",
    },
    {
      id: "hunt-credential-access",
      tactic: "Credential Access",
      technique: "T1003.001",
      accept: ["lsass.exe", "lsass"],
      label: "Credential Access — LSASS memory",
    },
    {
      id: "hunt-discovery",
      tactic: "Discovery",
      technique: "T1087.002",
      accept: [
        'net group "Domain Admins" /domain',
        "net group Domain Admins /domain",
        'net group "domain admins" /domain',
      ],
      label: "Discovery — domain group enumeration",
    },
    {
      id: "hunt-lateral-movement",
      tactic: "Lateral Movement",
      technique: "T1021.002",
      accept: [e.fileServer, `\\\\${e.fileServer}\\ADMIN$`],
      label: "Lateral Movement — SMB admin share",
    },
    {
      id: "hunt-collection",
      tactic: "Collection",
      technique: "T1560.001",
      accept: [e.archiveName, e.archivePath],
      label: "Collection — staged archive",
    },
    {
      id: "hunt-exfiltration",
      tactic: "Exfiltration",
      technique: "T1048.003",
      accept: [e.c2Domain],
      label: "Exfiltration — DNS tunnelling",
    },
    {
      id: "hunt-c2",
      tactic: "Command and Control",
      technique: "T1071.004",
      accept: [e.c2Ip],
      label: "Command and Control — beacon destination",
    },
  ];
}

// ── Corpus generation ───────────────────────────────────────────────────────

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

const NOISE_USERS = [
  "a.fenwick", "d.oyelaran", "s.marchetti", "l.donnelly", "h.nakamura",
  "c.abara", "v.rasmussen", "e.thorne", "b.iqbal", "g.pereira",
];

const NOISE_PROCESSES = [
  "chrome.exe", "OUTLOOK.EXE", "EXCEL.EXE", "Teams.exe", "svchost.exe",
  "explorer.exe", "OneDrive.exe", "MsMpEng.exe", "SearchIndexer.exe", "sqlservr.exe",
];

const NOISE_TEMPLATES = [
  (u: string, h: string, p: string) => `EventID 1  Image=C:\\Program Files\\${p}  User=${u}  Host=${h}  ParentImage=explorer.exe`,
  (u: string, h: string) => `4624  LogonType=2  Account=${u}  Host=${h}  AuthPackage=Kerberos`,
  (u: string, h: string) => `4634  Logoff  Account=${u}  Host=${h}`,
  (_u: string, h: string) => `EventID 3  ${h} → 10.40.8.20:443  proto=TCP  bytes=8214  dst_name=login.microsoftonline.com`,
  (_u: string, h: string) => `EventID 3  ${h} → 10.40.8.44:445  proto=TCP  bytes=41220  share=DEPTDATA`,
  (u: string, h: string) => `DNS  ${h}  query=teams.microsoft.com  type=A  user=${u}`,
  (u: string, h: string) => `DNS  ${h}  query=outlook.office365.com  type=A  user=${u}`,
  (_u: string, h: string) => `FW  src=${h}  dst=93.184.216.34:443  action=ALLOW  rule=OUTBOUND-WEB-DEFAULT`,
  (u: string, h: string) => `EventID 11  ${h}  TargetFilename=C:\\Users\\${u}\\Downloads\\statement.pdf`,
  (u: string, h: string, p: string) => `EventID 5  Process terminated  Image=${p}  User=${u}  Host=${h}`,
  (u: string, h: string) => `4768  Kerberos TGT requested  Account=${u}  Host=${h}  Result=SUCCESS`,
  (_u: string, h: string) => `EventID 22  DNS query  ${h}  query=aegisfinancial.com  type=A`,
  (u: string, h: string) => `Print  Job submitted  User=${u}  Host=${h}  Queue=PRINT-01  pages=3`,
  (u: string, h: string) => `EventID 4104  ScriptBlock  Host=${h}  User=${u}  Text=Get-Mailbox -ResultSize 10`,
];

function clock(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = minuteOfDay % 60;
  const s = (minuteOfDay * 37) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** The ten lines that carry the answers, in chronological order. */
function signalLines(e: OzhEvidence): Array<Omit<LogLine, "seq">> {
  return [
    {
      at: "08:41:19",
      source: "Mail Gateway",
      host: "MAIL-GW-01",
      user: e.victimUser,
      line: `MSG delivered  from=${e.phishSender}  to=${e.victimEmail}  attachment=${e.attachment}  sha256=${e.macroHash}  spf=fail dmarc=fail`,
    },
    {
      at: "08:47:31",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      line: `EventID 1  Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe  ParentImage=EXCEL.EXE  CommandLine=powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBq`,
    },
    {
      at: "08:49:02",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      line: `EventID 11  TargetFilename=${e.stagerPath}  sha256=${e.macroHash}  signed=false`,
    },
    {
      at: "09:03:12",
      source: "Netflow",
      host: e.victimHost,
      user: e.victimUser,
      line: `SESSION  ${e.victimHost} → ${e.c2Ip}:${e.c2Port}  proto=TCP/TLS  interval=60s±4s  bytes=1204  dst_name=${e.c2Domain}`,
    },
    {
      at: "09:26:04",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      line: `EventID 1  Image=C:\\Windows\\System32\\schtasks.exe  CommandLine=schtasks /create /tn "${e.taskName}" /tr "${e.stagerPath}" /sc onlogon /rl highest`,
    },
    {
      at: "09:34:47",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      line: `EventID 10  SourceImage=${e.stagerPath}  TargetImage=C:\\Windows\\System32\\lsass.exe  GrantedAccess=0x1010`,
    },
    {
      at: "09:47:02",
      source: "EDR — Sysmon",
      host: e.victimHost,
      user: e.victimUser,
      line: `EventID 1  Image=C:\\Windows\\System32\\net.exe  CommandLine=net group "Domain Admins" /domain  ParentImage=${e.stagerPath}`,
    },
    {
      at: "10:02:11",
      source: "Windows Security Log",
      host: e.fileServer,
      user: e.svcAccount,
      line: `4624  LogonType=3  Account=${e.svcAccount}  Source=${e.victimHost}  AuthPackage=NTLM  Share=\\\\${e.fileServer}\\ADMIN$`,
    },
    {
      at: "10:19:38",
      source: "File Server Audit",
      host: e.fileServer,
      user: e.svcAccount,
      line: `EventID 11  TargetFilename=${e.archivePath}  size=${e.archiveSizeMb}MB  process=7z.exe  sources=ClientData,Ledgers`,
    },
    {
      at: "10:31:52",
      source: "EDR — Registry Monitor",
      host: e.fileServer,
      user: e.svcAccount,
      line: `EventID 13  TargetObject=${e.runKeyPath}  Details=C:\\Windows\\Temp\\${e.stagerName}`,
    },
    {
      at: "10:44:07",
      source: "DNS Resolver",
      host: e.victimHost,
      user: e.victimUser,
      line: `DNS  query=b3RoZXJkYXRhc2VnbWVudA.${e.c2Domain}  type=TXT  count=${e.dnsQueryCount}  entropy=high  est_payload=${e.exfilMb}MB`,
    },
  ];
}

export const HUNT_NOISE_LINES = 620;

/**
 * Build the corpus: noise plus the signal lines, sorted by time.
 *
 * Seeded by userId so the intern's dataset is stable across reloads — a hunt
 * whose corpus reshuffles on refresh would make any saved query worthless.
 */
export function huntDataset(e: OzhEvidence, userId: string): LogLine[] {
  const r = rng(`ozh:hunt:${userId}`);
  const rows: Array<Omit<LogLine, "seq">> = [];

  const hosts = [
    e.victimHost, e.fileServer, e.dbServer, e.dcHost, "WS-058", "WS-102",
    "WS-141", "WS-ADM-04", "WEB-01", "MAIL-GW-01",
  ];

  for (let i = 0; i < HUNT_NOISE_LINES; i++) {
    const user = NOISE_USERS[Math.floor(r() * NOISE_USERS.length)];
    const host = hosts[Math.floor(r() * hosts.length)];
    const proc = NOISE_PROCESSES[Math.floor(r() * NOISE_PROCESSES.length)];
    const tmpl = NOISE_TEMPLATES[Math.floor(r() * NOISE_TEMPLATES.length)];
    // Business hours, weighted around the incident window so the corpus is
    // densest exactly where the attacker was active.
    const minute = 7 * 60 + Math.floor(r() * 6 * 60);
    rows.push({
      at: clock(minute),
      source: ["EDR — Sysmon", "Windows Security Log", "Netflow", "DNS Resolver", "Perimeter Firewall"][
        Math.floor(r() * 5)
      ],
      host,
      user,
      line: tmpl(user, host, proc),
    });
  }

  rows.push(...signalLines(e));
  rows.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return rows.map((row, i) => ({ ...row, seq: i + 1 }));
}
