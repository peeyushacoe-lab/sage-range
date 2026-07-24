// Seeds Boss Fight simulation: BEC-2026-002 — Business Email Compromise &
// Wire Fraud, inside the Meridian Finance Group CompanyEnvironment (its
// second simulation, alongside the ransomware-flavored FIN-2026-004).
// Requires scripts/seed-companies.ts to have been run first.
//
// Another non-malware story: adversary-in-the-middle phishing steals a
// session token (bypassing MFA), which is used purely for identity/email
// fraud — no host compromise, no C2 beacon in the traditional sense. Tasks
// are written specifically for this story.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-bec-2026-002.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "EMAIL" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Phishing Email — {{EMPLOYEE_USER}}@meridianfg.com",
    content: `From: "Microsoft 365 Security" <no-reply@{{LOOKALIKE_DOMAIN}}>
To: {{EMPLOYEE_USER}}@meridianfg.com
Sent: {{ATTACK_DATE}} {{ATTACK_TIME}}
Subject: Action required: unusual sign-in activity on your account

We noticed a sign-in attempt from a new device. If this wasn't you, secure
your account now by verifying your identity.

[Verify My Account] → hxxps://{{C2_DOMAIN}}/login

--- Note from IT: this link goes to a reverse-proxy phishing kit that
presents a real-looking Microsoft 365 login page, captures the entered
credentials AND the session token/MFA approval in real time, then relays
them straight into an active session — the user is fully logged into the
real tenant and never notices anything wrong. ---`,
  },
  {
    order: 2,
    type: "EVENT_LOG" as const,
    tactic: null,
    title: "Entra ID Sign-In Log — {{EMPLOYEE_USER}}",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Sign-in — SUCCESS
  Authentication: Password + MFA satisfied (token-based, no fresh MFA prompt)
  Source IP: {{C2_IP}} (geolocates outside {{EMPLOYEE_NAME}}'s normal working region)
  Session: continues from the same session token used moments earlier by
  the legitimate user — consistent with session token theft rather than a
  fresh credential-based login.

Risk Signal: "Impossible travel" — the same account shows activity from two
geographically distant locations within minutes of each other.`,
  },
  {
    order: 3,
    type: "PCAP_SUMMARY" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Web Proxy Log — Credential Harvesting Relay",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}
Source: {{EMPLOYEE_USER}}'s workstation
Destination: {{C2_DOMAIN}} ({{C2_IP}})
Request: GET /login, followed by POST with form-encoded credential data
Classification: Adversary-in-the-middle (AiTM) reverse-proxy phishing kit —
sits between the victim and the real Microsoft 365 login, relaying traffic
both ways and capturing the resulting authenticated session cookie.`,
  },
  {
    order: 4,
    type: "EVENT_LOG" as const,
    tactic: "PERSISTENCE" as const,
    title: "Mailbox Audit Log — Hidden Inbox Rule",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Inbox Rule Created
  Mailbox: {{EMPLOYEE_USER}}@meridianfg.com
  Rule Name: "." (single period — deliberately inconspicuous)
  Condition: Sender contains "vendor-payments" OR "accounts-payable"
  Action: Move to folder "RSS Feeds" (a folder the user never checks) and
  mark as read
  Rule Visibility: Hidden from the default Outlook rules view

Assessment: this rule intercepts and hides any reply from the real vendor
or internal AP team questioning the wire instruction below, buying the
attacker time before the fraud is noticed.`,
  },
  {
    order: 5,
    type: "EMAIL" as const,
    tactic: null,
    title: "Fraudulent Wire Instruction — Sent to Accounts Payable",
    content: `From: {{EMPLOYEE_USER}}@meridianfg.com  (sent from the real, compromised account)
To: ap-team@meridianfg.com
Sent: {{ATTACK_DATE}} {{ATTACK_TIME}}
Subject: URGENT — Updated banking details for [Vendor] — process today's payment

Hi team,

Please note our banking details have changed effective immediately. Please
route today's scheduled payment of $486,000 to the new account below
instead of the one on file. This is time-sensitive — please confirm once
sent.

[New account/routing details — redacted]

Thanks,
{{EMPLOYEE_NAME}}`,
  },
  {
    order: 6,
    type: "FILE_LISTING" as const,
    tactic: "IMPACT" as const,
    title: "Wire Transfer Record — Treasury System",
    content: `Transaction ID: WT-{{ATTACK_DATE}}-0417
Amount: $486,000.00
Originating Account: Meridian Finance Group Operating Account
Destination: account matching the details in the fraudulent email above
(does not match the vendor's account on file prior to this incident)
Status: SENT — funds have left the originating account
Initiated By: ap-team (acting in good faith on the instruction received)`,
  },
  {
    order: 7,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "Identity Protection Risk Alert",
    content: `Alert Time: {{ATTACK_TIME}} (fired several hours AFTER the wire was sent)
Alert: "Anonymous IP address" and "Impossible travel" risk detections
User: {{EMPLOYEE_USER}}
Risk Level: High
Action Taken: Alert generated only — no automatic session revocation or
account lockout policy was configured to act on high-risk sign-ins.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Phishing email received, link clicked, credentials and session token captured via AiTM relay
+2 min   Attacker signs in using the stolen session — MFA already satisfied, no fresh prompt
+5 min   Hidden inbox rule created to intercept vendor/AP replies
+18 min  Fraudulent wire instruction sent from the real, compromised account to Accounts Payable
+40 min  AP team processes the payment in good faith — $486,000 sent to the attacker-controlled account
Several hours later  Identity Protection fires a high-risk sign-in alert — too late to stop the wire
Next day  The real vendor calls asking why they haven't been paid, surfacing the fraud`,
  },
];

const NETWORK_NODES = [
  { id: "phishing-relay", label: "{{C2_DOMAIN}} (AiTM Relay)", kind: "internet", x: 10, y: 20 },
  { id: "exec-account", label: "{{EMPLOYEE_USER}} (Identity)", kind: "workstation", x: 40, y: 20 },
  { id: "mail-gw", label: "Mail Gateway", kind: "email-gateway", x: 40, y: 65 },
  { id: "entra", label: "Entra ID", kind: "domain-controller", x: 70, y: 20 },
  { id: "ap-system", label: "Accounts Payable System", kind: "server", x: 70, y: 65 },
  { id: "bank", label: "Wire Transfer / Receiving Bank", kind: "internet", x: 95, y: 45 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "exec-account", status: "suspicious", note: "Identity flagged as the likely compromised account" },
  { triggerOrder: 2, nodeId: "phishing-relay", status: "compromised", note: "AiTM relay used to steal the session token" },
  { triggerOrder: 2, nodeId: "exec-account", status: "compromised", note: "Session token stolen — MFA bypassed" },
  { triggerOrder: 4, nodeId: "mail-gw", status: "compromised", note: "Hidden inbox rule concealing vendor/AP replies discovered" },
  { triggerOrder: 6, nodeId: "ap-system", status: "compromised", note: "Fraudulent wire instruction received and acted upon" },
  { triggerOrder: 6, nodeId: "bank", status: "suspicious", note: "Funds redirected; recall attempt pending" },
  { triggerOrder: 7, nodeId: "exec-account", status: "contained", note: "Sessions revoked, password and MFA reset" },
  { triggerOrder: 7, nodeId: "mail-gw", status: "contained", note: "Hidden inbox rule removed" },
  { triggerOrder: 7, nodeId: "phishing-relay", status: "contained", note: "Domain blocked at the web proxy" },
  { triggerOrder: 7, nodeId: "ap-system", status: "contained", note: "Callback verification now required for banking-detail changes" },
  { triggerOrder: 7, nodeId: "entra", status: "contained", note: "High-risk sign-in policy configured to auto-revoke sessions" },
  { triggerOrder: 7, nodeId: "bank", status: "contained", note: "Recall requested with the receiving bank" },
];

const TASKS = [
  {
    order: 1,
    title: "Identify the Compromised Account",
    prompt: "Based on the phishing email and sign-in log, which account was compromised?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{EMPLOYEE_USER}}",
    options: [] as string[],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check who the phishing email was addressed to." },
      { level: 2, pointCost: 30, text: "The same account name appears again in the sign-in log and mailbox audit log." },
      { level: 3, pointCost: 40, text: "It's the account named in the phishing email's To: field." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "What technique gave the attacker access to this account, despite MFA being enabled?",
    answerType: "RADIO" as const,
    correctAnswer: "Adversary-in-the-middle (AiTM) phishing that stole an active session token, bypassing MFA entirely",
    options: [
      "Adversary-in-the-middle (AiTM) phishing that stole an active session token, bypassing MFA entirely",
      "Simple password guessing with no MFA involved",
      "Brute-force compromise of an internet-facing RDP service",
      "Abuse of a third-party vendor's remote access tool",
    ],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "The sign-in log shows MFA was satisfied without a fresh prompt — how is that possible?" },
      { level: 2, pointCost: 30, text: "The web proxy log shows a reverse-proxy relay sitting between the user and the real login page." },
      { level: 3, pointCost: 40, text: "It's AiTM session-token theft, which is why MFA didn't stop it." },
    ],
  },
  {
    order: 3,
    title: "Find the Phishing Relay Domain",
    prompt: "What domain hosted the credential-harvesting relay?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{C2_DOMAIN}}",
    options: [],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Check the phishing email's link and the web proxy log — the same domain appears in both." },
      { level: 2, pointCost: 30, text: "It's the destination hostname in the web proxy log." },
      { level: 3, pointCost: 40, text: "It's the domain the phishing link and proxy log both point to." },
    ],
  },
  {
    order: 4,
    title: "Identify the Concealment Mechanism",
    prompt: "How did the attacker delay discovery of the fraud after sending the wire instruction?",
    answerType: "RADIO" as const,
    correctAnswer: "A hidden inbox rule that automatically moved vendor and Accounts Payable reply emails out of the inbox",
    options: [
      "A hidden inbox rule that automatically moved vendor and Accounts Payable reply emails out of the inbox",
      "Deleting the Sent Items folder entirely",
      "Changing the account's display name",
      "Disabling the mailbox entirely",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Check the mailbox audit log for anything created around the time of the fraudulent email." },
      { level: 2, pointCost: 35, text: "A rule with a deliberately inconspicuous name, targeting vendor/AP senders, is the concealment method." },
      { level: 3, pointCost: 45, text: "It's the hidden inbox rule redirecting vendor/AP replies to an unused folder." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes how this attacker obtained account access?",
    answerType: "RADIO" as const,
    correctAnswer: "T1557 – Adversary-in-the-Middle",
    options: [
      "T1557 – Adversary-in-the-Middle",
      "T1566 – Phishing (credential harvesting only, no session theft)",
      "T1110 – Brute Force",
      "T1078 – Valid Accounts (Cloud)",
    ],
    points: 180,
    hints: [
      { level: 1, pointCost: 25, text: "A standard phishing credential-harvest wouldn't explain how MFA was bypassed." },
      { level: 2, pointCost: 35, text: "A reverse-proxy relay that captures the live session in real time is specifically AiTM." },
      { level: 3, pointCost: 45, text: "It's Adversary-in-the-Middle — T1557." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this pattern earlier next time. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A high-risk sign-in (impossible travel / anonymous IP) occurring in close proximity to a new inbox rule creation on the same mailbox",
    options: [
      "A high-risk sign-in (impossible travel / anonymous IP) occurring in close proximity to a new inbox rule creation on the same mailbox",
      "Any sign-in from outside the country, regardless of other context",
      "The specific wording used in the fraudulent wire email",
      "The dollar amount of the wire transfer alone",
    ],
    points: 180,
    hints: [
      { level: 1, pointCost: 25, text: "Two separate signals both fired in this incident — the value is in correlating them together." },
      { level: 2, pointCost: 35, text: "A risky sign-in plus a suspicious new mailbox rule, close together in time, is a strong BEC indicator." },
      { level: 3, pointCost: 45, text: "Correlate the risky sign-in with the new inbox rule creation, not either signal alone." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed $486,000 was wired to a fraudulent account. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Revoke all active sessions and reset credentials/MFA for the account, remove the hidden inbox rule, and immediately contact the bank to attempt a wire recall",
    options: [
      "Revoke all active sessions and reset credentials/MFA for the account, remove the hidden inbox rule, and immediately contact the bank to attempt a wire recall",
      "Wait to see if the vendor confirms receipt before doing anything",
      "Only change the account's display name",
      "Disable the entire company email system for all employees",
    ],
    points: 200,
    hints: [
      { level: 1, pointCost: 30, text: "Every minute matters for a wire recall — speed is critical on that front." },
      { level: 2, pointCost: 40, text: "You need to lock down the identity, remove the attacker's concealment mechanism, and race the bank's cutoff for a recall." },
      { level: 3, pointCost: 50, text: "Revoke sessions/reset credentials, remove the hidden rule, and request a wire recall immediately." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "An adversary-in-the-middle phishing attack stole a session token and bypassed MFA, allowing the attacker to send a fraudulent wire instruction from a legitimate, compromised executive account and conceal the fraud with a hidden inbox rule",
    options: [
      "An adversary-in-the-middle phishing attack stole a session token and bypassed MFA, allowing the attacker to send a fraudulent wire instruction from a legitimate, compromised executive account and conceal the fraud with a hidden inbox rule",
      "A disgruntled employee intentionally redirected the wire transfer",
      "Ransomware encrypted the treasury system's file shares",
      "A brute-forced RDP session was used to access the treasury system directly",
    ],
    points: 220,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the chain from the phishing email through to the wire transfer record." },
      { level: 2, pointCost: 40, text: "The root cause statement should name AiTM session theft as entry and the fraudulent wire as impact." },
      { level: 3, pointCost: 50, text: "Entry via AiTM session theft, concealment via a hidden inbox rule, impact is the fraudulent wire — not an insider, ransomware, or RDP compromise." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "meridian-finance-group" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — meridian-finance-group not found.");
  }

  const briefing =
    "A vendor is calling Meridian Finance Group asking why they haven't been paid — Accounts Payable insists the " +
    "wire went out on time. The trail leads to a compromised executive email account, not a compromised system. " +
    "You are the lead investigator. Work through the evidence below to reconstruct the fraud, then produce " +
    "detection content, a containment recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "bec-2026-002-wire-fraud" },
    update: {
      codename: "BEC-2026-002",
      title: "Business Email Compromise & Wire Fraud",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 180,
      points: 1280,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "bec-2026-002-wire-fraud",
      codename: "BEC-2026-002",
      title: "Business Email Compromise & Wire Fraud",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 180,
      points: 1280,
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

  console.log(`✓ BEC-2026-002 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
