// Seeds Boss Fight simulation: GOV-2026-003 — APT Intrusion via Compromised
// MSP Access, inside the Harrow County Government CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first.
//
// This simulation is RANDOMIZED: artifact/task content uses {{TOKEN}}
// placeholders substituted per-student by src/lib/incident-randomizer.ts.
// Do not hardcode the values these tokens represent anywhere in this file —
// answer verification depends on the template staying token-based.
//
// Unlike the ransomware-flavored FIN-2026-004 and HOSP-2026-001, this is a
// quiet espionage-style intrusion: the "impact" is data exfiltration, not
// encryption — giving students exposure to privilege escalation and
// exfiltration tradecraft the other two simulations don't cover.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-gov-2026-003.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "EVENT_LOG" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "MSP RMM Tool Access Log — {{PATIENT_ZERO_HOST}}",
    content: `2026-07-20 23:02:11  RMM Console Login
  Technician Account: msp-tech-{{EMPLOYEE_USER}}
  Source IP: 154.16.88.203 (outside the MSP's normal office IP range)
  Action: Remote script deployment queued

2026-07-20 23:04:47  Script Execution via RMM Agent
  Target Host: {{PATIENT_ZERO_HOST}}
  Deployed As: SYSTEM (RMM agent runs with elevated service privileges)
  Script Name: quarterly_patch_check.ps1

Note from IT: {{EMPLOYEE_USER}} is a technician at Harrow County's contracted
MSP. Their RMM console credentials appear in a separate, unrelated breach
dump. The county's RMM agent has broad unattended-elevation privileges on
every host it manages, with no additional MFA step for script deployment.`,
  },
  {
    order: 2,
    type: "SYSMON_LOG" as const,
    tactic: null,
    title: "Sysmon Event Log — {{PATIENT_ZERO_HOST}}",
    content: `Event ID 1 (Process Create)  2026-07-20 23:04:49
  Image: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  ParentImage: C:\\Program Files\\RMMAgent\\rmmagent.exe
  CommandLine: powershell.exe -nop -w hidden -enc <base64-encoded-loader>

Event ID 1 (Process Create)  2026-07-20 23:05:30
  Image: C:\\ProgramData\\svc_cache\\winlogon_helper.exe
  ParentImage: powershell.exe
  CommandLine: winlogon_helper.exe -q

Event ID 3 (Network Connection)  2026-07-20 23:10:00 (and every ~600s after)
  Image: winlogon_helper.exe
  DestinationIp: {{C2_IP}}
  DestinationPort: 443
  DestinationHostname: {{C2_DOMAIN}}`,
  },
  {
    order: 3,
    type: "MEMORY_DUMP" as const,
    tactic: "PRIVILEGE_ESCALATION" as const,
    title: "Memory Forensics — LSASS Access on {{PATIENT_ZERO_HOST}}",
    content: `Process: winlogon_helper.exe (PID 4402)
Handle opened to: lsass.exe (PID 712)
Access Mask: 0x1410 (PROCESS_VM_READ | PROCESS_QUERY_INFORMATION)
Time: 2026-07-20 23:06:12

Strings extracted from winlogon_helper.exe memory region shortly after:
"{{ADMIN_ACCOUNT}}"
"sekurlsa::logonpasswords"
"Domain: HARROWCOGOV"

Assessment: consistent with an LSASS credential-dumping technique used to
harvest domain admin-equivalent credentials ({{ADMIN_ACCOUNT}}) directly
from memory — no on-disk credential file was ever written.`,
  },
  {
    order: 4,
    type: "REGISTRY" as const,
    tactic: "PERSISTENCE" as const,
    title: "Scheduled Task Export — {{PATIENT_ZERO_HOST}}",
    content: `Task Name: \\Microsoft\\Windows\\Maintenance\\WinlogonHelperCheck
Action: C:\\ProgramData\\svc_cache\\winlogon_helper.exe -q
Trigger: At log on of any user, and every 6 hours thereafter
Run As: SYSTEM
Created: 2026-07-20 23:06:40
Author: {{ADMIN_ACCOUNT}}`,
  },
  {
    order: 5,
    type: "PCAP_SUMMARY" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Firewall/PCAP Summary — Egress Traffic from {{PATIENT_ZERO_HOST}}",
    content: `Window: 2026-07-20 23:10:00 - 2026-07-24 04:00:00
Destination: {{C2_IP}}:443 ({{C2_DOMAIN}})
Protocol: TLS (self-signed certificate)
Pattern: Beacon every ~600 seconds, low-and-slow cadence consistent with
long-dwell-time espionage tradecraft rather than commodity ransomware
Total sessions: 542
Classification: Matches known C2 beaconing cadence pattern`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Windows Security Event Log — Lateral Movement to {{FILE_SERVER_HOST}}",
    content: `2026-07-23 01:15:02  EventID 4624 (Logon)
  Logon Type: 3 (Network)
  Source Workstation: {{PATIENT_ZERO_HOST}}
  Target: {{FILE_SERVER_HOST}}
  Account Name: {{ADMIN_ACCOUNT}}  (domain admin-equivalent)

2026-07-23 01:15:06  EventID 5140 (Network Share Access)
  Share: \\\\{{FILE_SERVER_HOST}}\\Permitting_Elections$
  Source: {{PATIENT_ZERO_HOST}}`,
  },
  {
    order: 7,
    type: "FILE_LISTING" as const,
    tactic: "EXFILTRATION" as const,
    title: "DLP Alert — Outbound Transfer from {{FILE_SERVER_HOST}}",
    content: `2026-07-23 01:22:18  Data Loss Prevention Alert
Source Host: {{FILE_SERVER_HOST}}
File: permitting_elections_records_2026Q2.zip (4.1 GB)
Destination: {{C2_IP}} over HTTPS (port 443)
Method: Chunked upload disguised as routine backup traffic
Contents (per index recovered from the archive manifest):
  - permitting_applications_2026.csv
  - voter_registration_extract_2026.csv
  - staff_directory.csv

Classification: Confirmed exfiltration of citizen PII and elections-adjacent
records to external infrastructure.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `23:02  Attacker logs into the MSP's RMM console using breached technician credentials
23:04  Malicious script deployed via RMM agent to {{PATIENT_ZERO_HOST}} as SYSTEM
23:05  PowerShell loader launches, drops winlogon_helper.exe
23:06  LSASS memory accessed, {{ADMIN_ACCOUNT}} domain admin-equivalent credentials harvested
23:06  Scheduled task persistence established, running as SYSTEM every 6 hours
23:10  Low-and-slow C2 beaconing begins ({{C2_IP}} / {{C2_DOMAIN}})
Jul 20–23  Extended dwell time; attacker quietly maps the environment
01:15 (Jul 23)  Lateral movement to {{FILE_SERVER_HOST}} using {{ADMIN_ACCOUNT}}
01:22 (Jul 23)  4.1 GB archive of permitting and elections-adjacent records exfiltrated over HTTPS
04:00 (Jul 24)  DLP review flags the transfer; incident response engaged`,
  },
];

const NETWORK_NODES = [
  { id: "rmm", label: "MSP RMM Console", kind: "vpn", x: 10, y: 15 },
  { id: "fw", label: "Perimeter Firewall", kind: "firewall", x: 10, y: 65 },
  { id: "patient-zero", label: "{{PATIENT_ZERO_HOST}}", kind: "workstation", x: 42, y: 35 },
  { id: "dc", label: "Domain Controller", kind: "domain-controller", x: 72, y: 12 },
  { id: "file-server", label: "{{FILE_SERVER_HOST}}", kind: "server", x: 72, y: 55 },
  { id: "c2", label: "{{C2_DOMAIN}}", kind: "internet", x: 98, y: 35 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "patient-zero", status: "suspicious", note: "Flagged as the likely patient-zero host" },
  { triggerOrder: 2, nodeId: "rmm", status: "suspicious", note: "Malicious script pushed via compromised MSP RMM credentials" },
  { triggerOrder: 2, nodeId: "patient-zero", status: "compromised", note: "Loader executed with SYSTEM privileges via the RMM agent" },
  { triggerOrder: 4, nodeId: "c2", status: "compromised", note: "Identified as the intrusion's C2 infrastructure" },
  { triggerOrder: 4, nodeId: "fw", status: "suspicious", note: "Low-and-slow egress beacon confirmed in PCAP" },
  { triggerOrder: 5, nodeId: "dc", status: "suspicious", note: "Domain admin-equivalent credentials harvested via LSASS dump" },
  { triggerOrder: 5, nodeId: "file-server", status: "compromised", note: "Accessed and exfiltrated using harvested admin credentials" },
  { triggerOrder: 7, nodeId: "patient-zero", status: "contained", note: "Isolated from the network" },
  { triggerOrder: 7, nodeId: "file-server", status: "contained", note: "Isolated pending full forensic review" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "Harvested credentials rotated domain-wide" },
  { triggerOrder: 7, nodeId: "c2", status: "contained", note: "Blocked at the perimeter firewall" },
  { triggerOrder: 7, nodeId: "rmm", status: "contained", note: "MSP RMM access revoked and credentials rotated" },
  { triggerOrder: 7, nodeId: "fw", status: "contained", note: "Egress rule deployed blocking the C2 domain/IP" },
];

const TASKS = [
  {
    order: 1,
    title: "Find Patient Zero",
    prompt: "Based on the RMM tool access log, which single host is patient zero for this incident?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{PATIENT_ZERO_HOST}}",
    options: [] as string[],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check which host the RMM console's script deployment actually targeted." },
      { level: 2, pointCost: 30, text: "The RMM access log names the target host directly next to the script deployment action." },
      { level: 3, pointCost: 40, text: "It's the host named as the RMM script deployment target." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "What was the initial access vector used to compromise patient zero?",
    answerType: "RADIO" as const,
    correctAnswer: "Abuse of compromised MSP remote monitoring and management (RMM) tool credentials to push a malicious script",
    options: [
      "Abuse of compromised MSP remote monitoring and management (RMM) tool credentials to push a malicious script",
      "Spearphishing email with a malicious macro attachment",
      "Brute-force compromise of an internet-facing RDP service",
      "A malicious USB drive left in a county office",
    ],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Look at what tool actually deployed the very first script on patient zero." },
      { level: 2, pointCost: 30, text: "The RMM console login from an unusual IP, followed by a queued script deployment, is the entry point." },
      { level: 3, pointCost: 40, text: "The attacker abused compromised MSP RMM credentials, not phishing, RDP, or physical media." },
    ],
  },
  {
    order: 3,
    title: "Find the Malware C2 Beacon Host",
    prompt: "What C2 domain did the loader beacon to?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{C2_DOMAIN}}",
    options: [],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Check the Sysmon network connection events and the PCAP summary artifact." },
      { level: 2, pointCost: 30, text: "The destination hostname appears in both Sysmon Event ID 3 and the firewall/PCAP summary." },
      { level: 3, pointCost: 40, text: "It's the DestinationHostname value shared by both artifacts." },
    ],
  },
  {
    order: 4,
    title: "Find the Persistence Mechanism",
    prompt: "What is the exact name of the scheduled task used for persistence?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "WinlogonHelperCheck",
    options: [],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Check the scheduled task export artifact." },
      { level: 2, pointCost: 30, text: "The task name is listed right at the top of the export, without its folder path." },
      { level: 3, pointCost: 40, text: "It's the last path segment of the Task Name field." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes how the attacker obtained domain admin-equivalent credentials?",
    answerType: "RADIO" as const,
    correctAnswer: "T1003.001 – OS Credential Dumping: LSASS Memory",
    options: [
      "T1003.001 – OS Credential Dumping: LSASS Memory",
      "T1552.001 – Unsecured Credentials: Credentials in Files",
      "T1110 – Brute Force",
      "T1558 – Steal or Forge Kerberos Tickets",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Look at what process the memory forensics artifact says accessed lsass.exe, and how." },
      { level: 2, pointCost: 35, text: "A handle to lsass.exe with PROCESS_VM_READ access, followed by recovered logonpasswords strings, is the signature of LSASS memory dumping." },
      { level: 3, pointCost: 45, text: "It's LSASS memory credential dumping — T1003.001." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this credential-theft technique across the fleet. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A non-standard process opening a handle to lsass.exe with PROCESS_VM_READ access",
    options: [
      "A non-standard process opening a handle to lsass.exe with PROCESS_VM_READ access",
      "Any process named lsass.exe running on the host",
      "The username that owns the scheduled task",
      "The process's working directory path on the target host",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Re-read exactly what the memory forensics artifact flagged as suspicious." },
      { level: 2, pointCost: 35, text: "It's not that lsass.exe ran — it's that another process reached into it with read access to its memory." },
      { level: 3, pointCost: 45, text: "Detect on non-lsass processes opening PROCESS_VM_READ handles to lsass.exe." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed 4.1 GB of permitting and elections-adjacent records were exfiltrated. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Isolate patient zero and the file server, revoke and rotate the MSP's RMM credentials, and rotate all domain credentials touched by the harvested admin account",
    options: [
      "Isolate patient zero and the file server, revoke and rotate the MSP's RMM credentials, and rotate all domain credentials touched by the harvested admin account",
      "Wait for the MSP to investigate on their own timeline before taking any local action",
      "Only reset the technician's RMM console password",
      "Shut down the entire county network including unrelated departments and public-facing citizen services",
    ],
    points: 180,
    hints: [
      { level: 1, pointCost: 25, text: "The attacker had broad, elevated RMM access and domain admin-equivalent credentials — contain both paths." },
      { level: 2, pointCost: 35, text: "Isolate exactly the affected hosts, cut off the RMM channel, and rotate every credential the attacker touched." },
      { level: 3, pointCost: 45, text: "Contain the affected hosts, revoke/rotate RMM access, and rotate the harvested domain credentials." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "Compromised MSP remote-management credentials gave an attacker elevated code execution, which was used to harvest domain admin-equivalent credentials via LSASS dumping and exfiltrate permitting and elections-adjacent records",
    options: [
      "Compromised MSP remote-management credentials gave an attacker elevated code execution, which was used to harvest domain admin-equivalent credentials via LSASS dumping and exfiltrate permitting and elections-adjacent records",
      "An unpatched web server vulnerability allowed direct remote code execution",
      "A disgruntled employee intentionally leaked the records",
      "The incident was caused by ransomware encrypting the file server",
    ],
    points: 200,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the chain from the MSP entry point all the way through to the DLP alert." },
      { level: 2, pointCost: 40, text: "The root cause statement should name the MSP RMM compromise as entry, LSASS dumping as the escalation step, and exfiltration as the impact." },
      { level: 3, pointCost: 50, text: "Entry via compromised MSP RMM access, escalation via LSASS dumping, impact is data exfiltration — not ransomware." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "harrow-county-government" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — harrow-county-government not found.");
  }

  const briefing =
    "Harrow County Government's DLP system has flagged a multi-gigabyte outbound transfer from the permitting and " +
    "elections records file server. Nothing was encrypted and no ransom note has appeared — this looks like quiet " +
    "espionage, not commodity ransomware. The SOC has pulled artifacts from the suspected patient-zero host and " +
    "surrounding infrastructure. You are the lead incident responder. Work through the evidence below to reconstruct " +
    "the full intrusion chain, then produce detection content, a containment recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "gov-2026-003-apt-intrusion" },
    update: {
      codename: "GOV-2026-003",
      title: "APT Intrusion via Compromised MSP Access",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 190,
      points: 1240,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "gov-2026-003-apt-intrusion",
      codename: "GOV-2026-003",
      title: "APT Intrusion via Compromised MSP Access",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 190,
      points: 1240,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
  });

  await db.incidentSimArtifact.deleteMany({ where: { simulationId: sim.id } });
  await db.incidentSimArtifact.createMany({
    data: ARTIFACTS.map((a) => ({
      simulationId: sim.id,
      type: a.type,
      title: a.title,
      content: a.content,
      order: a.order,
      tactic: a.tactic,
    })),
  });

  // Delete existing tasks (cascades to hints/progress) and recreate in order.
  await db.incidentSimTask.deleteMany({ where: { simulationId: sim.id } });
  for (const t of TASKS) {
    const task = await db.incidentSimTask.create({
      data: {
        simulationId: sim.id,
        order: t.order,
        title: t.title,
        prompt: t.prompt,
        answerType: t.answerType,
        correctAnswer: t.correctAnswer,
        options: t.options,
        points: t.points,
      },
    });
    await db.incidentSimHint.createMany({
      data: t.hints.map((h) => ({ taskId: task.id, level: h.level, pointCost: h.pointCost, text: h.text })),
    });
  }

  console.log(`✓ GOV-2026-003 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
