// Seeds Boss Fight simulation: HOSP-2026-001 — Ransomware via Exposed RDP,
// inside the St. Agnes Regional Hospital CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first.
//
// This simulation is RANDOMIZED: artifact/task content uses {{TOKEN}}
// placeholders substituted per-student by src/lib/incident-randomizer.ts.
// Do not hardcode the values these tokens represent anywhere in this file —
// answer verification depends on the template staying token-based.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-hosp-2026-001.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// NOTE: `order` reflects true chronological sequence — the Evidence Board's
// timeline exercise scores against this field, so it must match the story
// told by the Consolidated Incident Timeline artifact below.
const ARTIFACTS = [
  {
    order: 1,
    type: "EVENT_LOG" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "RDP Authentication Log — External Access to {{PATIENT_ZERO_HOST}}",
    content: `2026-07-18 02:11:04 - 02:47:52  EventID 4625 (Failed Logon) x 340
  Logon Type: 10 (RemoteInteractive)
  Source IP: 91.203.44.18 (external, geolocates outside normal clinician remote-access region)
  Account Name: {{EMPLOYEE_USER}}
  Workstation: {{PATIENT_ZERO_HOST}}

2026-07-18 02:48:07  EventID 4624 (Logon) — SUCCESS
  Logon Type: 10 (RemoteInteractive)
  Source IP: 91.203.44.18
  Account Name: {{EMPLOYEE_USER}}
  Workstation: {{PATIENT_ZERO_HOST}}

Note from IT: {{EMPLOYEE_USER}}'s password matched a credential found in a
public breach-data dump from an unrelated third-party service. RDP is exposed
directly to the internet on {{PATIENT_ZERO_HOST}} for after-hours clinician access.`,
  },
  {
    order: 2,
    type: "SYSMON_LOG" as const,
    tactic: null,
    title: "Sysmon Event Log — {{PATIENT_ZERO_HOST}}",
    content: `Event ID 1 (Process Create)  2026-07-18 02:49:15
  Image: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  ParentImage: C:\\Windows\\System32\\mstsc.exe
  CommandLine: powershell.exe -nop -w hidden -enc <base64-encoded-download-cradle>

Event ID 1 (Process Create)  2026-07-18 02:50:02
  Image: C:\\Windows\\Temp\\epicsvc_helper.exe
  ParentImage: powershell.exe
  CommandLine: epicsvc_helper.exe -install

Event ID 3 (Network Connection)  2026-07-18 02:55:00 (and every ~240s after)
  Image: epicsvc_helper.exe
  DestinationIp: {{C2_IP}}
  DestinationPort: 443
  DestinationHostname: {{C2_DOMAIN}}`,
  },
  {
    order: 3,
    type: "REGISTRY" as const,
    tactic: "PERSISTENCE" as const,
    title: "Registry Export — {{PATIENT_ZERO_HOST}} (HKLM Run Keys)",
    content: `[HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run]
"EpicHelperSvc"="C:\\\\Windows\\\\Temp\\\\epicsvc_helper.exe"

Key created: 2026-07-18 02:50:05
Last modified by: SYSTEM (via elevated session on {{PATIENT_ZERO_HOST}})`,
  },
  {
    order: 4,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "Endpoint Detection Log — {{PATIENT_ZERO_HOST}}",
    content: `Detection Time: 2026-07-18 02:51:20
Threat Name: Ransom:Win32/{{MALWARE_NAME}}
File: C:\\Windows\\Temp\\epicsvc_helper.exe
SHA256: {{MALWARE_HASH}}
Action Taken: DETECTED — Quarantine failed (file locked by running process)
Severity: Severe`,
  },
  {
    order: 5,
    type: "PCAP_SUMMARY" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Firewall/PCAP Summary — Egress Traffic from {{PATIENT_ZERO_HOST}}",
    content: `Window: 2026-07-18 02:55:00 - 09:40:00
Destination: {{C2_IP}}:443 ({{C2_DOMAIN}})
Protocol: TLS (self-signed certificate)
Pattern: Beacon every ~240 seconds, small request / variable response size
Total sessions: 98
Classification: Matches known C2 beaconing cadence pattern`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Windows Security Event Log — Lateral Movement to {{FILE_SERVER_HOST}}",
    content: `2026-07-18 03:20:41  EventID 4624 (Logon)
  Logon Type: 10 (RemoteInteractive)
  Source Workstation: {{PATIENT_ZERO_HOST}}
  Target: {{FILE_SERVER_HOST}}
  Account Name: {{ADMIN_ACCOUNT}}  (local admin on {{FILE_SERVER_HOST}})

2026-07-18 03:20:44  EventID 5140 (Network Share Access)
  Share: \\\\{{FILE_SERVER_HOST}}\\EHR_Records$
  Source: {{PATIENT_ZERO_HOST}}`,
  },
  {
    order: 7,
    type: "MEMORY_DUMP" as const,
    tactic: "IMPACT" as const,
    title: "Memory Dump Strings Excerpt — {{FILE_SERVER_HOST}}",
    content: `Strings extracted from {{FILE_SERVER_HOST}} memory image (post-encryption):

"{{MALWARE_NAME}} Locker"
"Encrypting share: \\\\{{FILE_SERVER_HOST}}\\EHR_Records$"
"RESTORE_PATIENT_DATA.txt"
"Extension: .locked2026"
"C2 fallback: {{C2_DOMAIN}}"

Hospital incident command has diverted incoming ambulances to neighboring
facilities while EHR access is unavailable.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `02:11–02:47  Brute-force RDP login attempts against {{PATIENT_ZERO_HOST}} from 91.203.44.18
02:48  Successful RDP logon as {{EMPLOYEE_USER}} using a breached, reused password
02:49  PowerShell download cradle launched from the RDP session
02:50  Payload (epicsvc_helper.exe) dropped, Run key persistence established
02:51  Endpoint detection fires but fails to quarantine the locked file
02:55  C2 beaconing begins ({{C2_IP}} / {{C2_DOMAIN}})
03:20  Lateral movement to {{FILE_SERVER_HOST}} via RDP using {{ADMIN_ACCOUNT}} credentials
03:20–09:35  Continued C2 beaconing during staging
09:40  Mass file encryption begins on \\\\{{FILE_SERVER_HOST}}\\EHR_Records$
09:42  Ransom note RESTORE_PATIENT_DATA.txt dropped, .locked2026 extension applied
09:45  Hospital diverts incoming ambulances; incident command activated`,
  },
];

const NETWORK_NODES = [
  { id: "rdp-gw", label: "RDP Gateway", kind: "vpn", x: 10, y: 15 },
  { id: "fw", label: "Perimeter Firewall", kind: "firewall", x: 10, y: 65 },
  { id: "patient-zero", label: "{{PATIENT_ZERO_HOST}}", kind: "workstation", x: 42, y: 35 },
  { id: "dc", label: "Domain Controller", kind: "domain-controller", x: 72, y: 12 },
  { id: "file-server", label: "{{FILE_SERVER_HOST}}", kind: "server", x: 72, y: 55 },
  { id: "c2", label: "{{C2_DOMAIN}}", kind: "internet", x: 98, y: 35 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "patient-zero", status: "suspicious", note: "Flagged as the likely patient-zero host" },
  { triggerOrder: 2, nodeId: "rdp-gw", status: "suspicious", note: "External brute-force logons detected" },
  { triggerOrder: 2, nodeId: "patient-zero", status: "compromised", note: "Attacker RDP session established" },
  { triggerOrder: 4, nodeId: "c2", status: "compromised", note: "Identified as the ransomware's C2 infrastructure" },
  { triggerOrder: 4, nodeId: "fw", status: "suspicious", note: "Egress beacon traffic confirmed in PCAP" },
  { triggerOrder: 5, nodeId: "dc", status: "suspicious", note: "Internal RDP lateral movement observed" },
  { triggerOrder: 5, nodeId: "file-server", status: "compromised", note: "Ransomware deployed against EHR file shares" },
  { triggerOrder: 7, nodeId: "patient-zero", status: "contained", note: "Isolated from the network" },
  { triggerOrder: 7, nodeId: "file-server", status: "contained", note: "Isolated; EHR shares taken offline for recovery" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "Compromised admin credentials rotated" },
  { triggerOrder: 7, nodeId: "c2", status: "contained", note: "Blocked at the perimeter firewall" },
  { triggerOrder: 7, nodeId: "rdp-gw", status: "contained", note: "External RDP access disabled, MFA enforced" },
  { triggerOrder: 7, nodeId: "fw", status: "contained", note: "Egress rule deployed blocking the C2 domain/IP" },
];

const TASKS = [
  {
    order: 1,
    title: "Find Patient Zero",
    prompt: "Based on the RDP authentication log, which single host is patient zero for this incident?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{PATIENT_ZERO_HOST}}",
    options: [] as string[],
    points: 110,
    hints: [
      { level: 1, pointCost: 15, text: "Check which workstation the successful external RDP logon landed on." },
      { level: 2, pointCost: 25, text: "The 4624 success event immediately follows a burst of 4625 failures — the target host is named right there." },
      { level: 3, pointCost: 35, text: "It's the host named directly in the RDP authentication log artifact." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "What was the initial access vector used to compromise patient zero?",
    answerType: "RADIO" as const,
    correctAnswer: "Brute-force compromise of an internet-facing RDP service using a reused, breached password",
    options: [
      "Brute-force compromise of an internet-facing RDP service using a reused, breached password",
      "Spearphishing email with a malicious macro attachment",
      "SQL injection against the patient portal web application",
      "A malicious USB drive left in a clinical break room",
    ],
    points: 110,
    hints: [
      { level: 1, pointCost: 15, text: "Look at the pattern of logon events right before the compromise." },
      { level: 2, pointCost: 25, text: "Hundreds of failed RemoteInteractive logons from one external IP, followed by a success, is a classic signature." },
      { level: 3, pointCost: 35, text: "It's brute-force RDP compromise, not phishing, injection, or physical media." },
    ],
  },
  {
    order: 3,
    title: "Find the Malware Hash",
    prompt: "What is the SHA256 hash of the malicious payload identified by the endpoint detection log?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{MALWARE_HASH}}",
    options: [],
    points: 130,
    hints: [
      { level: 1, pointCost: 15, text: "Check the endpoint detection log artifact for epicsvc_helper.exe." },
      { level: 2, pointCost: 25, text: "The SHA256 field is listed directly under the threat name." },
      { level: 3, pointCost: 35, text: "It's the SHA256 value in the endpoint detection log artifact — copy it exactly." },
    ],
  },
  {
    order: 4,
    title: "Find the C2 Domain",
    prompt: "What C2 domain did the malware beacon to?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{C2_DOMAIN}}",
    options: [],
    points: 130,
    hints: [
      { level: 1, pointCost: 15, text: "Check the Sysmon network connection events and the PCAP summary artifact." },
      { level: 2, pointCost: 25, text: "The destination hostname appears in both Sysmon Event ID 3 and the firewall/PCAP summary." },
      { level: 3, pointCost: 35, text: "It's the DestinationHostname value shared by both artifacts." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes the lateral movement from patient zero to the file server?",
    answerType: "RADIO" as const,
    correctAnswer: "T1021.001 – Remote Services: Remote Desktop Protocol",
    options: [
      "T1021.001 – Remote Services: Remote Desktop Protocol",
      "T1021.002 – Remote Services: SMB/Windows Admin Shares",
      "T1078 – Valid Accounts (Cloud)",
      "T1570 – Lateral Tool Transfer only, no authentication involved",
    ],
    points: 150,
    hints: [
      { level: 1, pointCost: 20, text: "Look at the logon type recorded in the lateral movement event log." },
      { level: 2, pointCost: 30, text: "Logon Type 10 (RemoteInteractive) means the attacker used RDP again internally, not SMB." },
      { level: 3, pointCost: 40, text: "It's RDP-based lateral movement — T1021.001." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this initial access pattern across the fleet. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A high volume of EventID 4625 (Type 10) failures from a single external source IP followed by an EventID 4624 success for the same account",
    options: [
      "A high volume of EventID 4625 (Type 10) failures from a single external source IP followed by an EventID 4624 success for the same account",
      "Any EventID 4624 logon regardless of type or source",
      "The username that eventually logged on successfully",
      "The process's working directory path on the target host",
    ],
    points: 150,
    hints: [
      { level: 1, pointCost: 20, text: "Re-read the authentication log artifact closely." },
      { level: 2, pointCost: 30, text: "A burst of failures immediately followed by a success from the same external IP is the brute-force signature." },
      { level: 3, pointCost: 40, text: "Detect on the failure-burst-then-success pattern, not just any successful logon." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "Ransomware is actively encrypting EHR records right now. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Isolate patient zero and the file server from the network immediately, disable external RDP exposure, and rotate credentials used in lateral movement",
    options: [
      "Isolate patient zero and the file server from the network immediately, disable external RDP exposure, and rotate credentials used in lateral movement",
      "Wait until encryption finishes so you can fully assess the damage before doing anything",
      "Only reset the compromised clinician's email password",
      "Shut down the entire hospital network including biomedical device VLANs",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 20, text: "Encryption is active right now — every minute of delay costs more patient data." },
      { level: 2, pointCost: 30, text: "Isolate exactly the affected hosts, close the entry point, and rotate the compromised account." },
      { level: 3, pointCost: 40, text: "Contain the affected hosts, disable the exposed RDP path, and rotate credentials — don't wait or overreach." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A brute-forced, internet-facing RDP service with a reused password gave an attacker an initial foothold, who then moved laterally over RDP to deploy ransomware against the hospital's EHR file shares",
    options: [
      "A brute-forced, internet-facing RDP service with a reused password gave an attacker an initial foothold, who then moved laterally over RDP to deploy ransomware against the hospital's EHR file shares",
      "An unpatched web server vulnerability allowed direct remote code execution",
      "A disgruntled employee intentionally deployed ransomware",
      "The incident was caused by a supply-chain compromise of a vendor update",
    ],
    points: 190,
    hints: [
      { level: 1, pointCost: 25, text: "Trace the chain from entry point through to final impact." },
      { level: 2, pointCost: 35, text: "The root cause statement should name the exposed RDP service as the entry point and EHR ransomware as the impact." },
      { level: 3, pointCost: 45, text: "Entry via exposed/brute-forced RDP, lateral movement over RDP, impact is EHR ransomware." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "st-agnes-regional-hospital" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — st-agnes-regional-hospital not found.");
  }

  const briefing =
    "St. Agnes Regional Hospital's EHR platform has gone dark — clinicians report patient records are inaccessible " +
    "and incoming ambulances are being diverted to neighboring facilities. The SOC has pulled artifacts from the " +
    "suspected patient-zero host and surrounding infrastructure. You are the lead incident responder. Work through " +
    "the evidence below to reconstruct the full attack chain, then produce detection content, a containment " +
    "recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "hosp-2026-001-ransomware" },
    update: {
      codename: "HOSP-2026-001",
      title: "Ransomware via Exposed RDP",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 180,
      points: 1180,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "hosp-2026-001-ransomware",
      codename: "HOSP-2026-001",
      title: "Ransomware via Exposed RDP",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 180,
      points: 1180,
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

  console.log(`✓ HOSP-2026-001 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
