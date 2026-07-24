// Seeds Boss Fight simulation: IDENTITY-2026-001 — Active Directory Domain
// Takeover, inside the Lakeshore State University CompanyEnvironment (its
// second simulation, alongside the insider-threat-flavored EDU-2026-002).
// Requires scripts/seed-companies.ts to have been run first.
//
// A full identity-attack chain: credential stuffing → Kerberoasting →
// DCSync → Golden Ticket. Maps conceptually to the existing kerberoasting,
// dcsync-attack, and golden-ticket-attack labs. Tasks are written
// specifically for this attack chain rather than reusing the malware/C2
// template.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-identity-2026-001.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "EVENT_LOG" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Student VPN Authentication Log — {{PATIENT_ZERO_HOST}}",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  VPN Login — SUCCESS
  Account: {{EMPLOYEE_USER}} (student account, open residential network)
  Source IP: external, consistent with an automated credential-stuffing tool
  rather than a single manual login attempt
  Password: matched a credential found in an unrelated public breach dump

Note from IT: student accounts are on the open, high-churn residential
network, segmented from the hardened ADMIN.LSU.EDU domain by a single
firewall boundary. This account has no elevated privileges of its own.`,
  },
  {
    order: 2,
    type: "EVENT_LOG" as const,
    tactic: "PRIVILEGE_ESCALATION" as const,
    title: "Kerberos Service Ticket Request Log",
    content: `EventID 4769 (Kerberos Service Ticket Requested) x 34, within 90 seconds
  Requesting Account: {{EMPLOYEE_USER}}
  Ticket Encryption Type: 0x17 (RC4-HMAC — crackable offline if the SPN
  account's password is weak)
  Service Principal Names requested: 34 distinct SPNs across the
  ADMIN.LSU.EDU domain, including registrar and financial-aid service
  accounts

Assessment: requesting service tickets for dozens of SPNs in rapid
succession, all using the weaker RC4 encryption type, is the signature of
Kerberoasting — harvesting tickets to crack offline rather than
authenticating directly.`,
  },
  {
    order: 3,
    type: "FILE_LISTING" as const,
    tactic: null,
    title: "Post-Incident Password Complexity Audit",
    content: `Account: {{ADMIN_ACCOUNT}}  (service account, SPN: registrar-svc/ADMIN.LSU.EDU)
Password Length: 9 characters
Password Composition: dictionary word + 2 digits (no special characters)
Last Changed: 4 years, 2 months before this incident
Crack Time Estimate (offline, consumer GPU): under 6 hours

Assessment: this service account's Kerberoasted ticket would have been
crackable well within the timeframe of this incident.`,
  },
  {
    order: 4,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Directory Service Access Log — Replication Request",
    content: `EventID 4662 (Directory Service Access) + EventID 5136 (Directory Service Changes)
  Operation: DsGetNCChanges (directory replication request)
  Requesting Account: {{ADMIN_ACCOUNT}}
  Source Host: {{PATIENT_ZERO_HOST}}  (a student-network workstation — NOT
  a domain controller)
  Target: full domain NC replication, including the KRBTGT account

Assessment: only domain controllers should ever issue a legitimate
DsGetNCChanges request. A replication request originating from a
student-network workstation, using a compromised service account, is
consistent with a DCSync attack extracting every credential in the domain
— including the KRBTGT account used to sign Kerberos tickets.`,
  },
  {
    order: 5,
    type: "EVENT_LOG" as const,
    tactic: "PERSISTENCE" as const,
    title: "Kerberos Ticket-Granting-Ticket (TGT) Anomaly Report",
    content: `Ticket Lifetime Anomaly Detected:
  Account presented: registrar-admin@ADMIN.LSU.EDU (Domain Admin group member)
  TGT Lifetime: 10 years (default domain policy is 10 hours)
  Signed by: KRBTGT account (validates cryptographically — the ticket is
  not tampered with, it was forged using the real KRBTGT hash)
  Used to authenticate to: 6 hosts this account has never accessed in its
  entire prior history, across both the student and admin-domain networks

Assessment: an abnormally long-lived, cryptographically valid TGT for a
Domain Admin-equivalent account is the signature of a forged Golden
Ticket — usable for authentication indefinitely, even after a normal
password reset, until KRBTGT itself is reset.`,
  },
  {
    order: 6,
    type: "PCAP_SUMMARY" as const,
    tactic: null,
    title: "Kerberos Ticket Request Volume Report",
    content: `Baseline: registrar-svc/ADMIN.LSU.EDU normally receives 2-5 service ticket
requests per day from its own application server.

{{ATTACK_DATE}}: 34 service ticket requests within 90 seconds, all
originating from {{PATIENT_ZERO_HOST}} rather than the application server.

Following days: repeated authentications using the anomalously long-lived
TGT described in the previous artifact, spread across 6 hosts.`,
  },
  {
    order: 7,
    type: "FILE_LISTING" as const,
    tactic: "IMPACT" as const,
    title: "Systems Accessed Using the Forged Ticket",
    content: `Authenticated sessions using the Golden Ticket (registrar-admin@ADMIN.LSU.EDU):

  {{FILE_SERVER_HOST}}  — Registrar records system (student transcripts, enrollment)
  Financial Aid database — read access to FAFSA-linked award records
  HR/Payroll admin console — read access only, no changes made
  Domain Controller — full directory read access (consistent with the
  DCSync operation)

Assessment: broad read access across registrar, financial aid, and payroll
systems — no confirmed data modification, but full read exposure of
FERPA-protected student records and financial aid data.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Credential-stuffed login succeeds against a student VPN account ({{EMPLOYEE_USER}})
+15 min  34 Kerberos service tickets requested in 90 seconds (Kerberoasting)
Following hours  {{ADMIN_ACCOUNT}}'s ticket cracked offline (weak, 4-year-old password)
+1 day  DCSync replication request issued from a student workstation using {{ADMIN_ACCOUNT}}, extracting KRBTGT and all domain credentials
+1 day  A Golden Ticket is forged for a Domain Admin-equivalent account, valid for 10 years
Following days  The forged ticket is used to authenticate to registrar, financial aid, and payroll systems across 6 hosts
Detection  Ticket-lifetime anomaly detection flags the 10-year TGT, triggering this investigation`,
  },
];

const NETWORK_NODES = [
  { id: "student-net", label: "{{PATIENT_ZERO_HOST}} (Student Network)", kind: "workstation", x: 15, y: 40 },
  { id: "fw", label: "Student/Admin Segmentation Boundary", kind: "firewall", x: 45, y: 40 },
  { id: "dc", label: "ADMIN.LSU.EDU Domain Controller", kind: "domain-controller", x: 75, y: 20 },
  { id: "registrar", label: "{{FILE_SERVER_HOST}} (Registrar/Financial Aid)", kind: "server", x: 75, y: 65 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "student-net", status: "suspicious", note: "Credential-stuffed login flagged" },
  { triggerOrder: 2, nodeId: "student-net", status: "compromised", note: "Confirmed as the attacker's foothold account" },
  { triggerOrder: 3, nodeId: "fw", status: "suspicious", note: "Kerberoasting traffic crossing toward the hardened domain" },
  { triggerOrder: 4, nodeId: "dc", status: "suspicious", note: "Service account credentials cracked and in active use" },
  { triggerOrder: 5, nodeId: "dc", status: "compromised", note: "DCSync used to extract KRBTGT and all domain credentials" },
  { triggerOrder: 5, nodeId: "registrar", status: "compromised", note: "Accessed via the forged Golden Ticket" },
  { triggerOrder: 7, nodeId: "student-net", status: "contained", note: "Account disabled, device reviewed" },
  { triggerOrder: 7, nodeId: "fw", status: "contained", note: "Segmentation rules tightened between student and admin domains" },
  { triggerOrder: 7, nodeId: "dc", status: "contained", note: "KRBTGT password reset twice — all Golden Tickets invalidated" },
  { triggerOrder: 7, nodeId: "registrar", status: "contained", note: "Access reviewed; no confirmed data modification found" },
];

const TASKS = [
  {
    order: 1,
    title: "Identify the Initial Foothold Account",
    prompt: "Based on the VPN authentication log, which account gave the attacker their initial foothold?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{EMPLOYEE_USER}}",
    options: [] as string[],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check the account named in the VPN authentication log." },
      { level: 2, pointCost: 30, text: "The same account requests all 34 Kerberos service tickets in the next artifact." },
      { level: 3, pointCost: 40, text: "It's the account named in the VPN authentication log." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "How did the attacker obtain this account's credentials?",
    answerType: "RADIO" as const,
    correctAnswer: "Credential stuffing using a password reused from an unrelated public breach",
    options: [
      "Credential stuffing using a password reused from an unrelated public breach",
      "Spearphishing email with a malicious macro attachment",
      "Brute-force compromise of an internet-facing RDP service",
      "Abuse of a third-party vendor's remote access tool",
    ],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check the note in the VPN authentication log about how the password matched." },
      { level: 2, pointCost: 30, text: "The login pattern and password match are both consistent with automated credential stuffing." },
      { level: 3, pointCost: 40, text: "It's credential stuffing with a reused, breached password." },
    ],
  },
  {
    order: 3,
    title: "Identify the Escalation Technique",
    prompt: "How did the attacker move from a low-privilege student account toward domain-level access?",
    answerType: "RADIO" as const,
    correctAnswer: "Kerberoasting — requesting service tickets for multiple SPNs and cracking a weak service account password offline",
    options: [
      "Kerberoasting — requesting service tickets for multiple SPNs and cracking a weak service account password offline",
      "Directly guessing the Domain Admin password",
      "Exploiting an unpatched web application vulnerability",
      "Physically accessing the domain controller",
    ],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Look at the rapid burst of Kerberos service ticket requests." },
      { level: 2, pointCost: 30, text: "Requesting many SPN tickets with RC4 encryption in quick succession is the Kerberoasting signature." },
      { level: 3, pointCost: 40, text: "It's Kerberoasting, followed by offline password cracking." },
    ],
  },
  {
    order: 4,
    title: "Find the Compromised Service Account",
    prompt: "Which service account's password was cracked and reused throughout the rest of this attack?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{ADMIN_ACCOUNT}}",
    options: [],
    points: 150,
    hints: [
      { level: 1, pointCost: 25, text: "Check the password complexity audit and the directory service access log — the same account appears in both." },
      { level: 2, pointCost: 35, text: "It's the account named in the password complexity audit artifact." },
      { level: 3, pointCost: 45, text: "It's the same account that later issues the DCSync-style replication request." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes the directory replication request used to extract KRBTGT?",
    answerType: "RADIO" as const,
    correctAnswer: "T1003.006 – OS Credential Dumping: DCSync",
    options: [
      "T1003.006 – OS Credential Dumping: DCSync",
      "T1558.003 – Steal or Forge Kerberos Tickets: Kerberoasting",
      "T1110 – Brute Force",
      "T1078 – Valid Accounts (Cloud)",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 25, text: "This is a different step than the Kerberoasting one you already identified." },
      { level: 2, pointCost: 35, text: "A directory replication request (DsGetNCChanges) issued from a non-DC host is the DCSync signature specifically." },
      { level: 3, pointCost: 45, text: "It's DCSync — T1003.006." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this kind of persistence earlier next time. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A Kerberos TGT with a lifetime far exceeding domain policy, or a directory replication request originating from a host that is not a domain controller",
    options: [
      "A Kerberos TGT with a lifetime far exceeding domain policy, or a directory replication request originating from a host that is not a domain controller",
      "Any successful Kerberos authentication, regardless of ticket lifetime",
      "The specific username of the student account involved",
      "The total number of students on the residential network",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 25, text: "Two separate signals in this incident are both individually detectable — think about ticket lifetime and replication source." },
      { level: 2, pointCost: 35, text: "A 10-year TGT and a DsGetNCChanges request from a workstation are both abnormal on their own." },
      { level: 3, pointCost: 45, text: "Detect on abnormal TGT lifetime or replication requests from non-DC hosts." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed a forged Golden Ticket has been used across 6 hosts. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Reset the KRBTGT account password twice in succession to invalidate every forged ticket, rotate the compromised service account's credentials, and disable the initial student account",
    options: [
      "Reset the KRBTGT account password twice in succession to invalidate every forged ticket, rotate the compromised service account's credentials, and disable the initial student account",
      "Reset the KRBTGT password only once — a single reset is sufficient",
      "Only disable the student account; the service account is fine to leave as-is",
      "Take the entire domain offline indefinitely rather than resetting any credentials",
    ],
    points: 190,
    hints: [
      { level: 1, pointCost: 25, text: "A Golden Ticket stays valid even after a single KRBTGT reset, because of how Windows retains the previous KRBTGT password hash." },
      { level: 2, pointCost: 35, text: "KRBTGT must be reset twice, back to back, to fully invalidate every forged ticket — and every credential the attacker touched needs rotating." },
      { level: 3, pointCost: 45, text: "Reset KRBTGT twice, rotate the service account, and disable the student account — a single reset or partial action isn't enough." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A credential-stuffed student account was used to Kerberoast and crack a weak service account password, which was then used to DCSync domain credentials and forge a long-lived Golden Ticket granting persistent Domain Admin-equivalent access",
    options: [
      "A credential-stuffed student account was used to Kerberoast and crack a weak service account password, which was then used to DCSync domain credentials and forge a long-lived Golden Ticket granting persistent Domain Admin-equivalent access",
      "A phishing email compromised a domain administrator's workstation directly",
      "Ransomware encrypted the registrar's file shares",
      "An unpatched web application allowed direct remote code execution against the domain controller",
    ],
    points: 220,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the full chain: student account → Kerberoasting → DCSync → Golden Ticket." },
      { level: 2, pointCost: 40, text: "The root cause statement should name every step of the escalation chain, ending in persistent domain-level access." },
      { level: 3, pointCost: 50, text: "Credential stuffing → Kerberoasting → DCSync → Golden Ticket — not phishing, ransomware, or direct RCE." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "lakeshore-state-university" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — lakeshore-state-university not found.");
  }

  const briefing =
    "Lakeshore State University's identity monitoring has flagged a Kerberos ticket with a 10-year lifetime — far " +
    "beyond domain policy — being used to authenticate as a Domain Admin-equivalent account across systems it has " +
    "never touched before. You are the lead investigator. Work through the evidence below to reconstruct the full " +
    "escalation chain, then produce detection content, a containment recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "identity-2026-001-domain-takeover" },
    update: {
      codename: "IDENTITY-2026-001",
      title: "Active Directory Domain Takeover",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 190,
      points: 1300,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "identity-2026-001-domain-takeover",
      codename: "IDENTITY-2026-001",
      title: "Active Directory Domain Takeover",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 190,
      points: 1300,
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

  console.log(`✓ IDENTITY-2026-001 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
