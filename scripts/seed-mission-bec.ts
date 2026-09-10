// Seeds Mission Analyst's third scenario: "IR-003 — Phishing → Account
// Compromise" (business email compromise).
//
// The analytical trap here is different from the other two: the employee
// whose account was used is the VICTIM, not the perpetrator — picking them
// as "responsible" is the wrong instinct a real analyst has to resist
// (mirrors the platform's existing "suspicious != malicious" principle from
// the original design notes). The actual technique to notice is the hidden
// inbox rule that hid the attacker's follow-up traffic from the real user —
// that's the piece that turns "account compromise" into "we nearly wired
// money to the wrong account."
//
// Idempotent — upserts on (scenarioId, key). Run:
//   npx tsx scripts/seed-mission-bec.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SUSPECTS = [
  { id: "external-attacker", name: "External attacker (unidentified)", role: "No internal identity match" },
  { id: "priya-nair", name: "Priya Nair", role: "Accounts Payable — account owner" },
  { id: "it-helpdesk", name: "IT Helpdesk staff", role: "Internal" },
];

const CLASSIFICATIONS = ["Business Email Compromise", "Insider Threat", "Ransomware", "Malware Infection"];

const EVIDENCE: {
  key: string;
  label: string;
  description: string;
  kind: "PHYSICAL" | "DIGITAL";
  isCritical: boolean;
}[] = [
  {
    key: "phishing-email",
    label: "Suspicious email",
    description:
      "A message spoofing 'IT-Helpdesk@cybersage-support.com' (not the real internal domain) asked Priya Nair to 're-verify her password' via a linked form. Sent 09:14, clicked 09:19.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "login-anomaly",
    label: "Login anomaly report",
    description:
      "Priya's mailbox was accessed from an IP address geolocated outside the country at 09:31 — twelve minutes after the phishing link was clicked, while her badge shows her still in the building.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "mailbox-rule",
    label: "Hidden inbox rule",
    description:
      "A rule created at 09:33 silently moves any email containing 'invoice' or 'payment' to a rarely-checked folder — created minutes after the anomalous login, and not something Priya set up herself.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "vendor-email-change",
    label: "Sent email — bank detail change request",
    description:
      "At 10:02, an email was sent from Priya's account to Accounts Payable requesting the bank details for an upcoming vendor invoice be updated to a new account before the mailbox rule would have hidden any reply questioning it.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "password-reset-log",
    label: "Password reset history",
    description: "Priya's last self-service password reset was three weeks earlier, for an unrelated expired-password prompt. Routine.",
    kind: "DIGITAL",
    isCritical: false,
  },
  {
    key: "vpn-log-normal",
    label: "VPN connection log",
    description: "Priya's laptop connected to the corporate VPN at 08:55 that morning from her usual home IP address, as it does most weekdays.",
    kind: "DIGITAL",
    isCritical: false,
  },
  {
    key: "parking-note",
    label: "Sticky note",
    description: "\"Car park pass expires Friday — renew!\" Not related to anything.",
    kind: "PHYSICAL",
    isCritical: false,
  },
];

async function main() {
  const content = {
    title: "IR-003 — Phishing → Account Compromise",
    briefing:
      "Accounts Payable flagged an unusual request to change a vendor's bank details before releasing a large invoice payment. The request came from Priya Nair's own email account — but that doesn't necessarily mean it came from Priya.",
    objective:
      "Determine how the account was actually compromised, who is actually responsible, and whether the fraudulent payment request went out before or after the compromise. Don't assume the account owner is the culprit just because the email is theirs.",
    environment: "office-v1",
    published: true,
    suspects: SUSPECTS,
    classifications: CLASSIFICATIONS,
    answerSuspectId: "external-attacker",
    answerClassification: "Business Email Compromise",
    // Reached the "request to change bank details" stage — a near-miss on
    // real financial loss, even though it was caught before payment.
    answerSeverity: "HIGH" as const,
  };

  const scenario = await db.missionScenario.upsert({
    where: { slug: "phishing-account-compromise" },
    update: content,
    create: { slug: "phishing-account-compromise", ...content },
  });

  let created = 0;
  let updated = 0;
  for (const e of EVIDENCE) {
    const existing = await db.missionEvidence.findUnique({
      where: { scenarioId_key: { scenarioId: scenario.id, key: e.key } },
    });
    await db.missionEvidence.upsert({
      where: { scenarioId_key: { scenarioId: scenario.id, key: e.key } },
      update: { label: e.label, description: e.description, kind: e.kind, isCritical: e.isCritical },
      create: { scenarioId: scenario.id, key: e.key, label: e.label, description: e.description, kind: e.kind, isCritical: e.isCritical },
    });
    if (existing) updated++;
    else created++;
  }

  console.log(`Scenario "${scenario.slug}" ready. Evidence: ${created} created, ${updated} updated (${EVIDENCE.length} total).`);
  process.exit(0);
}

main();
