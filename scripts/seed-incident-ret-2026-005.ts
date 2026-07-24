// Seeds Boss Fight simulation: RET-2026-005 — POS Memory-Scraper Malware,
// inside the BrightCart Retail CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts. This is one of the first sims to also use
// the newer {{ATTACKER_ALIAS}}/{{ATTACK_DATE}}/{{ATTACK_TIME}} tokens.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-ret-2026-005.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "EVENT_LOG" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Vendor Remote Access Log — POS Controller {{PATIENT_ZERO_HOST}}",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Remote Access Tool Login
  Vendor Account: pos-vendor-svc ({{EMPLOYEE_USER}} listed as the vendor's on-file technician)
  Source IP: external, outside the vendor's documented office IP range
  Target: POS Controller {{PATIENT_ZERO_HOST}}
  Session Duration: 41 minutes

Note from IT: BrightCart contracts POS maintenance to a third-party vendor
with standing remote access to every store controller. The vendor's access
tool credentials appear in a separate, unrelated breach dump. No additional
MFA step is required for vendor sessions.`,
  },
  {
    order: 2,
    type: "SYSMON_LOG" as const,
    tactic: null,
    title: "Sysmon Event Log — {{PATIENT_ZERO_HOST}}",
    content: `Event ID 1 (Process Create)  {{ATTACK_DATE}} {{ATTACK_TIME}}
  Image: C:\\Windows\\System32\\cmd.exe
  ParentImage: C:\\Program Files\\VendorRemoteTools\\rat_agent.exe
  CommandLine: cmd.exe /c powershell -nop -w hidden -enc <base64-encoded-loader>

Event ID 1 (Process Create)
  Image: C:\\Program Files\\Common Files\\pos_helper32.exe
  ParentImage: powershell.exe
  Description: Reads process memory of pos_payment_app.exe on a fixed interval

Event ID 3 (Network Connection)  (every ~300s after install)
  Image: pos_helper32.exe
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
"POSHelperSvc"="C:\\\\Program Files\\\\Common Files\\\\pos_helper32.exe"

Key created: {{ATTACK_DATE}} (same day as the vendor remote session)
Last modified by: SYSTEM (via the vendor tool's elevated session)`,
  },
  {
    order: 4,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "Endpoint Detection Log — {{PATIENT_ZERO_HOST}}",
    content: `Detection Time: {{ATTACK_TIME}} (same day, ~4 minutes after install)
Threat Name: PWS:Win32/{{MALWARE_NAME}}
File: C:\\Program Files\\Common Files\\pos_helper32.exe
SHA256: {{MALWARE_HASH}}
Action Taken: DETECTED — Quarantine failed (file locked by running process)
Severity: Severe
Classification: Memory-scraping point-of-sale malware`,
  },
  {
    order: 5,
    type: "PCAP_SUMMARY" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Firewall/PCAP Summary — Egress Traffic from {{PATIENT_ZERO_HOST}}",
    content: `Destination: {{C2_IP}}:443 ({{C2_DOMAIN}})
Protocol: TLS (self-signed certificate)
Pattern: Beacon every ~300 seconds, small requests consistent with staged
card-data uploads rather than a single large transfer
Total sessions: 214
Classification: Matches known C2 beaconing cadence for POS-targeting malware
families; threat intel attributes similar tooling to the group tracked as
{{ATTACKER_ALIAS}}.`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Windows Security Event Log — Lateral Movement to {{FILE_SERVER_HOST}}",
    content: `EventID 4624 (Logon)
  Logon Type: 3 (Network)
  Source Workstation: {{PATIENT_ZERO_HOST}}
  Target: {{FILE_SERVER_HOST}}
  Account Name: {{ADMIN_ACCOUNT}}  (local admin on {{FILE_SERVER_HOST}})

EventID 5140 (Network Share Access)
  Share: \\\\{{FILE_SERVER_HOST}}\\POS_Staging$
  Source: {{PATIENT_ZERO_HOST}}`,
  },
  {
    order: 7,
    type: "FILE_LISTING" as const,
    tactic: "EXFILTRATION" as const,
    title: "Staged Dump Files — {{FILE_SERVER_HOST}}",
    content: `Directory listing recovered from \\\\{{FILE_SERVER_HOST}}\\POS_Staging$:

  track_dump_001.dat   (est. 41,000 card records)
  track_dump_002.dat   (est. 38,500 card records)
  track_dump_003.dat   (est. 29,200 card records)
  upload_log.txt        "batch 3/3 sent to {{C2_DOMAIN}} — OK"

Classification: Confirmed staging and exfiltration of Track 1/2 card data
harvested from POS terminal memory across multiple store registers.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Vendor remote access tool login from an unrecognized external IP
+2 min   PowerShell loader launched via the vendor tool's elevated session
+3 min   pos_helper32.exe dropped, begins reading pos_payment_app.exe memory
+4 min   Endpoint detection fires but fails to quarantine the locked file
+4 min   Run key persistence established
+5 min   C2 beaconing begins ({{C2_IP}} / {{C2_DOMAIN}})
+30 min  Lateral movement to {{FILE_SERVER_HOST}} using {{ADMIN_ACCOUNT}} credentials
Following days  Card track data staged in three batches on {{FILE_SERVER_HOST}}
Following days  All three batches exfiltrated to {{C2_DOMAIN}}
Detection  Acquirer fraud alerts on a common-point-of-purchase pattern trigger the investigation`,
  },
];

const NETWORK_NODES = [
  { id: "vendor-access", label: "Vendor Remote Access Tool", kind: "vpn", x: 10, y: 15 },
  { id: "fw", label: "Perimeter Firewall", kind: "firewall", x: 10, y: 65 },
  { id: "patient-zero", label: "{{PATIENT_ZERO_HOST}}", kind: "workstation", x: 42, y: 35 },
  { id: "dc", label: "Domain Controller", kind: "domain-controller", x: 72, y: 12 },
  { id: "file-server", label: "{{FILE_SERVER_HOST}}", kind: "server", x: 72, y: 55 },
  { id: "c2", label: "{{C2_DOMAIN}}", kind: "internet", x: 98, y: 35 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "patient-zero", status: "suspicious", note: "Flagged as the likely patient-zero POS controller" },
  { triggerOrder: 2, nodeId: "vendor-access", status: "suspicious", note: "Anomalous vendor remote-access session identified" },
  { triggerOrder: 2, nodeId: "patient-zero", status: "compromised", note: "Memory-scraping malware installed" },
  { triggerOrder: 4, nodeId: "c2", status: "compromised", note: "Identified as the malware's C2/exfil infrastructure" },
  { triggerOrder: 4, nodeId: "fw", status: "suspicious", note: "Staged upload traffic to C2 confirmed in PCAP" },
  { triggerOrder: 5, nodeId: "dc", status: "suspicious", note: "Lateral movement credentials traced through the domain" },
  { triggerOrder: 5, nodeId: "file-server", status: "compromised", note: "Card data staged here before exfiltration" },
  { triggerOrder: 7, nodeId: "patient-zero", status: "contained", note: "Isolated from the network" },
  { triggerOrder: 7, nodeId: "file-server", status: "contained", note: "Isolated; staging directory quarantined" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "Compromised admin credentials rotated" },
  { triggerOrder: 7, nodeId: "c2", status: "contained", note: "Blocked at the perimeter firewall" },
  { triggerOrder: 7, nodeId: "vendor-access", status: "contained", note: "Vendor access revoked and credentials rotated" },
  { triggerOrder: 7, nodeId: "fw", status: "contained", note: "Egress rule deployed blocking the C2 domain/IP" },
];

const TASKS = [
  {
    order: 1,
    title: "Find Patient Zero",
    prompt: "Based on the vendor remote access log, which single host is patient zero for this incident?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{PATIENT_ZERO_HOST}}",
    options: [] as string[],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check which POS controller the vendor's remote access session actually logged into." },
      { level: 2, pointCost: 30, text: "The remote access log names the target host directly next to the session details." },
      { level: 3, pointCost: 40, text: "It's the host named as the target of the vendor remote-access session." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "What was the initial access vector used to compromise patient zero?",
    answerType: "RADIO" as const,
    correctAnswer: "Abuse of a third-party POS vendor's remote access tool using compromised credentials",
    options: [
      "Abuse of a third-party POS vendor's remote access tool using compromised credentials",
      "Spearphishing email with a malicious macro attachment",
      "Brute-force compromise of an internet-facing RDP service",
      "A malicious USB drive left at a checkout register",
    ],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Look at what tool actually logged into patient zero first." },
      { level: 2, pointCost: 30, text: "A vendor remote access session from an IP outside the vendor's documented range is the entry point." },
      { level: 3, pointCost: 40, text: "It's abuse of the vendor's remote access tool, not phishing, RDP, or physical media." },
    ],
  },
  {
    order: 3,
    title: "Find the Malware Hash",
    prompt: "What is the SHA256 hash of the malicious payload identified by the endpoint detection log?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{MALWARE_HASH}}",
    options: [],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Check the endpoint detection log artifact for pos_helper32.exe." },
      { level: 2, pointCost: 30, text: "The SHA256 field is listed directly under the threat name." },
      { level: 3, pointCost: 40, text: "It's the SHA256 value in the endpoint detection log artifact — copy it exactly." },
    ],
  },
  {
    order: 4,
    title: "Find the C2 Domain",
    prompt: "What domain did the malware exfiltrate staged card data to?",
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
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes how the malware obtained card data?",
    answerType: "RADIO" as const,
    correctAnswer: "T1005 – Data from Local System (memory-scraping the POS payment process)",
    options: [
      "T1005 – Data from Local System (memory-scraping the POS payment process)",
      "T1114 – Email Collection",
      "T1213 – Data from Information Repositories",
      "T1530 – Data from Cloud Storage",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Look at exactly what pos_helper32.exe reads, and from where." },
      { level: 2, pointCost: 35, text: "It reads the memory of the POS payment process directly on the local host, not a network share or cloud store." },
      { level: 3, pointCost: 45, text: "It's local memory-scraping — T1005." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this memory-scraping technique across every POS controller. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A non-payment process repeatedly opening a memory-read handle to the POS payment application process",
    options: [
      "A non-payment process repeatedly opening a memory-read handle to the POS payment application process",
      "Any process named pos_helper32.exe, regardless of behavior",
      "The username the vendor technician normally uses",
      "The process's working directory path on the target host",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Re-read what the Sysmon artifact says pos_helper32.exe actually does on a fixed interval." },
      { level: 2, pointCost: 35, text: "It's not the filename that matters — it's an unrelated process reading the payment app's memory repeatedly." },
      { level: 3, pointCost: 45, text: "Detect on non-payment processes reading the POS payment process's memory." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed staged card-data dumps have already been exfiltrated. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Isolate patient zero and the staging server, revoke and rotate the vendor's remote access credentials, and rotate all domain credentials touched by the lateral movement account",
    options: [
      "Isolate patient zero and the staging server, revoke and rotate the vendor's remote access credentials, and rotate all domain credentials touched by the lateral movement account",
      "Wait for the vendor to investigate on their own timeline before taking any local action",
      "Only reset the technician's remote access tool password",
      "Shut down every POS register across all stores including unaffected locations",
    ],
    points: 180,
    hints: [
      { level: 1, pointCost: 25, text: "The attacker had both standing vendor access and domain admin-equivalent credentials — contain both paths." },
      { level: 2, pointCost: 35, text: "Isolate exactly the affected hosts, cut off the vendor access channel, and rotate every credential the attacker touched." },
      { level: 3, pointCost: 45, text: "Contain the affected hosts, revoke/rotate vendor access, and rotate the lateral-movement credentials." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "Compromised third-party vendor remote-access credentials allowed memory-scraping malware to be installed on a POS controller, harvesting and exfiltrating card track data before detection",
    options: [
      "Compromised third-party vendor remote-access credentials allowed memory-scraping malware to be installed on a POS controller, harvesting and exfiltrating card track data before detection",
      "An unpatched web server vulnerability allowed direct remote code execution",
      "A disgruntled employee intentionally installed the malware",
      "The incident was caused by ransomware encrypting the POS network",
    ],
    points: 200,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the chain from the vendor entry point through to the staged card data." },
      { level: 2, pointCost: 40, text: "The root cause statement should name the vendor credential compromise as entry and card-data exfiltration as the impact." },
      { level: 3, pointCost: 50, text: "Entry via compromised vendor remote access, impact is POS card-data exfiltration — not ransomware." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "brightcart-retail" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — brightcart-retail not found.");
  }

  const briefing =
    "BrightCart Retail's card processor has flagged a common-point-of-purchase fraud pattern across several stores. " +
    "The SOC has pulled artifacts from the suspected patient-zero POS controller and surrounding infrastructure. " +
    "You are the lead incident responder. Work through the evidence below to reconstruct the full attack chain, " +
    "then produce detection content, a containment recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "ret-2026-005-pos-malware" },
    update: {
      codename: "RET-2026-005",
      title: "POS Memory-Scraper Malware",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 180,
      points: 1200,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "ret-2026-005-pos-malware",
      codename: "RET-2026-005",
      title: "POS Memory-Scraper Malware",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 180,
      points: 1200,
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

  console.log(`✓ RET-2026-005 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
