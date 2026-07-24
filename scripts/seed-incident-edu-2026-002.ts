// Seeds Boss Fight simulation: EDU-2026-002 — Insider Data Theft, inside the
// Lakeshore State University CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first.
//
// This is deliberately NOT another malware/C2 story — it's an insider threat:
// a departing employee misusing still-valid legitimate credentials. There is
// no malware hash or C2 domain to find; the investigation skills are
// different (access-scope analysis, mailbox audit logs, DLP/exfil evidence),
// which is the point of including it alongside the ransomware/APT sims.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-edu-2026-002.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "EVENT_LOG" as const,
    tactic: "PRIVILEGE_ESCALATION" as const,
    title: "Grants Database Access Log — {{EMPLOYEE_USER}}",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Database Query Log
  Account: {{EMPLOYEE_USER}}  (Research Grants Coordinator — assigned to Biology/Chemistry grant portfolios only)
  Records Accessed: 1,847 grant records across Engineering, Physics, and Medical
  School portfolios — none within this account's assigned scope
  Access Window: 22:40–01:15 (well outside normal working hours)

Note from HR: {{EMPLOYEE_USER}} ({{EMPLOYEE_NAME}}) submitted resignation
notice 9 days before this access occurred, effective in 2 weeks. Per
university policy, access should have been narrowed to read-only at
resignation, but no ticket was filed with IT.`,
  },
  {
    order: 2,
    type: "EVENT_LOG" as const,
    tactic: "PERSISTENCE" as const,
    title: "Mailbox Audit Log — Forwarding Rule Change",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Inbox Rule Created
  Mailbox: {{EMPLOYEE_USER}}@lakeshore.edu
  Rule Name: "Archive" (deceptively generic name)
  Action: Forward a copy of all incoming and sent mail to an external address
  Destination Domain: {{LOOKALIKE_DOMAIN}}
  Rule Visibility: Hidden from the default Outlook rules view

Assessment: mail-forwarding rules like this are a common way departing staff
preserve access to institutional correspondence after their account is
disabled.`,
  },
  {
    order: 3,
    type: "FILE_LISTING" as const,
    tactic: "EXFILTRATION" as const,
    title: "USB Transfer Log — {{PATIENT_ZERO_HOST}}",
    content: `Removable storage event log for {{PATIENT_ZERO_HOST}}:

{{ATTACK_DATE}} {{ATTACK_TIME}}  USB Mass Storage Device Connected
  Device: Generic Flash Drive (no prior connection history on this host)
  Files copied: 412 files, 6.1 GB total
    - "Unpublished_Research_Drafts/" (188 files)
    - "Grant_Financials_2024-2026/" (156 files)
    - "IRB_Protocols_Confidential/" (68 files)
  Device disconnected after 14 minutes

Classification: Bulk copy of proprietary, unpublished research and
grant-compliance-sensitive financial records to unmanaged removable media.`,
  },
  {
    order: 4,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "DLP Alert — {{PATIENT_ZERO_HOST}}",
    content: `Alert Time: {{ATTACK_TIME}} (same session as the USB transfer)
Policy Triggered: "Bulk Confidential File Copy to Removable Media"
Host: {{PATIENT_ZERO_HOST}}
User: {{EMPLOYEE_USER}}
Files Matched: 412
Severity: High
Action Taken: Logged only — this DLP policy was configured in monitor mode,
not blocking mode, so the transfer was not stopped in real time.`,
  },
  {
    order: 5,
    type: "PCAP_SUMMARY" as const,
    tactic: "EXFILTRATION" as const,
    title: "Web Proxy Summary — Personal Cloud Storage Upload",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  (2 days after the USB transfer)
Source Host: {{PATIENT_ZERO_HOST}}
Destination: consumer cloud-storage service (personal account, not
university-managed)
Upload Volume: 3.8 GB over 26 minutes
Category: Personal File Storage (should be blocked under acceptable-use
policy for confidential records, but this category was not on the block list)

Classification: A second, parallel exfiltration attempt via personal cloud
storage — the USB copy was not the only channel used.`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: null,
    title: "VPN Access Log — Post-Termination Attempt",
    content: `{{EMPLOYEE_USER}}'s last working day: per HR, effective the day after the
resignation notice period ended.

VPN Authentication Log:
  2 days AFTER last working day  Login attempt — SUCCESS
    Source IP: residential ISP (consistent with home network)
    Session Duration: 8 minutes before IT disabled the account mid-session

Assessment: offboarding did not disable {{EMPLOYEE_USER}}'s VPN and domain
credentials on their last working day. The account remained active for 2
additional days, during which a further login succeeded.`,
  },
  {
    order: 7,
    type: "MEMORY_DUMP" as const,
    tactic: "IMPACT" as const,
    title: "Forensic Disk Recovery — {{PATIENT_ZERO_HOST}}",
    content: `Recovered from unallocated disk space on {{PATIENT_ZERO_HOST}}
(files present on disk, then deleted, shortly after the USB transfer):

"Unpublished_Research_Drafts/immunotherapy_trial_results_v9.docx" (deleted)
"Grant_Financials_2024-2026/NIH_grant_884213_ledger.xlsx" (deleted)
"IRB_Protocols_Confidential/protocol_2026-0447.pdf" (deleted)

Assessment: local copies of the exfiltrated files were deliberately deleted
from the workstation after being copied out — consistent with an attempt to
reduce the evidence trail on the host itself. Recovery from unallocated
space confirms exactly what was taken.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `Day 0   {{EMPLOYEE_NAME}} submits resignation notice, effective in 2 weeks
Day 9, {{ATTACK_TIME}}  After-hours access to 1,847 out-of-scope grant records
Day 9   Hidden mail-forwarding rule created, targeting {{LOOKALIKE_DOMAIN}}
Day 11  412 files (6.1 GB) copied to a USB drive; DLP logs but does not block it
Day 13  A further 3.8 GB uploaded to personal cloud storage
Day 13  Local copies of the exfiltrated files deleted from the workstation
Day 14  Last working day — IT does not disable VPN/domain access on schedule
Day 16  A further successful VPN login occurs before the account is finally disabled mid-session
Day 20  A partner institution notices overlapping unpublished research data appearing in a competing grant application, triggering this investigation`,
  },
];

const NETWORK_NODES = [
  { id: "insider-wks", label: "{{PATIENT_ZERO_HOST}}", kind: "workstation", x: 25, y: 40 },
  { id: "grants-server", label: "{{FILE_SERVER_HOST}}", kind: "server", x: 60, y: 20 },
  { id: "mail-gw", label: "Mail Gateway", kind: "email-gateway", x: 60, y: 65 },
  { id: "vpn", label: "VPN Gateway", kind: "vpn", x: 90, y: 40 },
  { id: "dc", label: "Domain Controller", kind: "domain-controller", x: 25, y: 75 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "insider-wks", status: "suspicious", note: "Account flagged for out-of-scope access" },
  { triggerOrder: 2, nodeId: "insider-wks", status: "compromised", note: "Confirmed insider misuse of valid credentials" },
  { triggerOrder: 2, nodeId: "grants-server", status: "suspicious", note: "Accessed well beyond assigned portfolio scope" },
  { triggerOrder: 3, nodeId: "mail-gw", status: "compromised", note: "Hidden forwarding rule directing mail externally" },
  { triggerOrder: 4, nodeId: "grants-server", status: "compromised", note: "Confirmed source of the exfiltrated records" },
  { triggerOrder: 4, nodeId: "vpn", status: "suspicious", note: "Post-termination access pattern flagged" },
  { triggerOrder: 7, nodeId: "insider-wks", status: "contained", note: "Device seized for forensic imaging" },
  { triggerOrder: 7, nodeId: "grants-server", status: "contained", note: "Access scope reviewed and corrected" },
  { triggerOrder: 7, nodeId: "mail-gw", status: "contained", note: "Forwarding rule removed" },
  { triggerOrder: 7, nodeId: "vpn", status: "contained", note: "Remote access revoked entirely" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "Account disabled domain-wide, credentials invalidated" },
];

const TASKS = [
  {
    order: 1,
    title: "Identify the Insider",
    prompt: "Based on the grants database access log, which account is responsible for this incident?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{EMPLOYEE_USER}}",
    options: [] as string[],
    points: 110,
    hints: [
      { level: 1, pointCost: 20, text: "Check the account name recorded in the database query log." },
      { level: 2, pointCost: 30, text: "The same account name appears again in the mailbox audit and USB transfer artifacts." },
      { level: 3, pointCost: 40, text: "It's the account named directly in the database query log." },
    ],
  },
  {
    order: 2,
    title: "Identify the Access Vector",
    prompt: "How did this actor gain the access used throughout this incident?",
    answerType: "RADIO" as const,
    correctAnswer: "Misuse of the actor's own still-active, legitimate credentials during their resignation notice period — not external compromise",
    options: [
      "Misuse of the actor's own still-active, legitimate credentials during their resignation notice period — not external compromise",
      "A spearphishing email with a malicious macro attachment",
      "Brute-force compromise of an internet-facing RDP service",
      "Abuse of a third-party vendor's remote access tool",
    ],
    points: 110,
    hints: [
      { level: 1, pointCost: 20, text: "Look at whose account is doing all of this activity — is it a stolen identity, or the account's actual owner?" },
      { level: 2, pointCost: 30, text: "Every artifact traces back to the same named employee's own account, active because offboarding was late." },
      { level: 3, pointCost: 40, text: "It's insider misuse of valid credentials, not any form of external compromise." },
    ],
  },
  {
    order: 3,
    title: "Find the Forwarding Destination",
    prompt: "What external domain did the hidden mailbox rule forward mail to?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{LOOKALIKE_DOMAIN}}",
    options: [],
    points: 130,
    hints: [
      { level: 1, pointCost: 20, text: "Check the mailbox audit log artifact for the rule's destination." },
      { level: 2, pointCost: 30, text: "The Destination Domain field is listed directly under the rule name." },
      { level: 3, pointCost: 40, text: "It's the Destination Domain value in the mailbox audit log." },
    ],
  },
  {
    order: 4,
    title: "Identify the Exfiltration Method",
    prompt: "How was proprietary data actually removed from the university's environment?",
    answerType: "RADIO" as const,
    correctAnswer: "Bulk copy to a USB drive, followed by a second upload to personal cloud storage",
    options: [
      "Bulk copy to a USB drive, followed by a second upload to personal cloud storage",
      "A single email attachment sent to a personal address",
      "Physical printouts carried out of the building",
      "No data actually left the university's network",
    ],
    points: 150,
    hints: [
      { level: 1, pointCost: 25, text: "There are two separate exfiltration artifacts in this case, not just one." },
      { level: 2, pointCost: 35, text: "The USB transfer log and the web proxy summary each show a different exfiltration channel." },
      { level: 3, pointCost: 45, text: "Both USB and personal cloud storage were used." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes how this actor operated throughout the incident?",
    answerType: "RADIO" as const,
    correctAnswer: "T1078 – Valid Accounts",
    options: [
      "T1078 – Valid Accounts",
      "T1566 – Phishing",
      "T1110 – Brute Force",
      "T1210 – Exploitation of Remote Services",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 25, text: "No credential was stolen or guessed at any point in this incident." },
      { level: 2, pointCost: 35, text: "The actor used their own, legitimately issued account the entire time." },
      { level: 3, pointCost: 45, text: "It's Valid Accounts — T1078." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this pattern earlier next time. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "An account flagged as resigning/terminating in HR systems that continues accessing records outside its normal historical scope",
    options: [
      "An account flagged as resigning/terminating in HR systems that continues accessing records outside its normal historical scope",
      "Any employee logging in outside of 9-to-5 business hours",
      "The specific filenames that were eventually copied out",
      "The make and model of the USB drive used",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 25, text: "The real signal here is the mismatch between HR status and system access scope, not the hour of day alone." },
      { level: 2, pointCost: 35, text: "Correlating an HR resignation event with continued or expanded system access is the actionable detection." },
      { level: 3, pointCost: 45, text: "Detect on resignation/termination status combined with out-of-scope access, not just off-hours logins." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed proprietary research and financial records were exfiltrated. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Disable the account and all remote access immediately, seize the workstation for forensic imaging, and involve HR/legal for the offboarding gap",
    options: [
      "Disable the account and all remote access immediately, seize the workstation for forensic imaging, and involve HR/legal for the offboarding gap",
      "Wait until the employee's official last day to make any changes",
      "Only reset the account password and let the employee keep working",
      "Take no action since the employee already resigned and will be gone soon anyway",
    ],
    points: 190,
    hints: [
      { level: 1, pointCost: 25, text: "The account is still fully active and was used again after the intended offboarding date." },
      { level: 2, pointCost: 35, text: "Cut off access immediately, preserve the evidence on the device, and loop in HR/legal — this is a personnel and legal matter as much as a technical one." },
      { level: 3, pointCost: 45, text: "Disable access now, image the device, and involve HR/legal." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A departing employee misused still-active legitimate credentials during their notice period to access out-of-scope grant records, set up a hidden mail-forwarding rule, and exfiltrate proprietary research and financial data via USB and personal cloud storage before offboarding revoked their access",
    options: [
      "A departing employee misused still-active legitimate credentials during their notice period to access out-of-scope grant records, set up a hidden mail-forwarding rule, and exfiltrate proprietary research and financial data via USB and personal cloud storage before offboarding revoked their access",
      "An external attacker exploited an unpatched web server vulnerability",
      "Ransomware encrypted the grants database file shares",
      "A phishing email compromised the account used in this incident",
    ],
    points: 210,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the chain from the resignation notice through to the offboarding gap." },
      { level: 2, pointCost: 40, text: "The root cause statement should name the delayed offboarding and the actor's own valid credentials, not any external compromise." },
      { level: 3, pointCost: 50, text: "It's insider misuse of legitimate access during a delayed offboarding — not malware, phishing, or an external attacker." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "lakeshore-state-university" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — lakeshore-state-university not found.");
  }

  const briefing =
    "A partner institution has flagged unpublished Lakeshore State research data appearing in a competing grant " +
    "application. Nothing was hacked in the traditional sense — the trail leads to a departing employee's own, " +
    "still-active account. You are the lead investigator. Work through the evidence below to reconstruct what " +
    "happened, then produce detection content, a containment recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "edu-2026-002-insider-threat" },
    update: {
      codename: "EDU-2026-002",
      title: "Insider Data Theft",
      companyId: company.id,
      briefing,
      difficulty: "HARD",
      estimatedMinutes: 170,
      points: 1230,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "edu-2026-002-insider-threat",
      codename: "EDU-2026-002",
      title: "Insider Data Theft",
      companyId: company.id,
      briefing,
      difficulty: "HARD",
      estimatedMinutes: 170,
      points: 1230,
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

  console.log(`✓ EDU-2026-002 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
