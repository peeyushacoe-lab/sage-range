// Seeds Mission Analyst's third case, "Phishing -> Account Compromise", as a
// 2-phase chain.
//
// Phase 1 "Who's Actually Responsible": the trap is instinct, not a hidden
// fact — the fraudulent request came from Priya's own account, so the pull
// is to blame her. She's the victim; the attacker is external.
//
// Phase 2 "Contain the Campaign" (final boss): did the payment actually go
// out, and is this attacker still active elsewhere? A second phishing
// email hit Payroll forty minutes later from the same spoofed domain — the
// correct read is a targeted campaign against at least two people, not an
// isolated incident. A decoy (the fraudulent account's name superficially
// resembling a real vendor) invites treating this as a legitimate billing
// dispute rather than fraud.
//
// Idempotent — upserts on slug/(scenarioId,key). Run:
//   npx tsx scripts/seed-mission-bec.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CASE_SLUG = "phishing-account-compromise";
const CASE_TITLE = "IR-003 — Phishing → Account Compromise";

type EvidenceSeed = { key: string; label: string; description: string; kind: "PHYSICAL" | "DIGITAL"; isCritical: boolean };

async function seedPhase(opts: {
  slug: string;
  title: string;
  briefing: string;
  objective: string;
  phaseNumber: number;
  phaseLabel: string;
  isFinalPhase: boolean;
  suspects: { id: string; name: string; role: string }[];
  classifications: string[];
  answerSuspectId: string;
  answerClassification: string;
  answerSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: EvidenceSeed[];
}) {
  const content = {
    title: opts.title,
    briefing: opts.briefing,
    objective: opts.objective,
    environment: "office-v1",
    published: true,
    caseSlug: CASE_SLUG,
    caseTitle: CASE_TITLE,
    phaseNumber: opts.phaseNumber,
    phaseLabel: opts.phaseLabel,
    isFinalPhase: opts.isFinalPhase,
    suspects: opts.suspects,
    classifications: opts.classifications,
    answerSuspectId: opts.answerSuspectId,
    answerClassification: opts.answerClassification,
    answerSeverity: opts.answerSeverity,
  };

  const scenario = await db.missionScenario.upsert({
    where: { slug: opts.slug },
    update: content,
    create: { slug: opts.slug, ...content },
  });

  let created = 0;
  let updated = 0;
  for (const e of opts.evidence) {
    const existing = await db.missionEvidence.findUnique({ where: { scenarioId_key: { scenarioId: scenario.id, key: e.key } } });
    await db.missionEvidence.upsert({
      where: { scenarioId_key: { scenarioId: scenario.id, key: e.key } },
      update: { label: e.label, description: e.description, kind: e.kind, isCritical: e.isCritical },
      create: { scenarioId: scenario.id, key: e.key, label: e.label, description: e.description, kind: e.kind, isCritical: e.isCritical },
    });
    if (existing) updated++;
    else created++;
  }
  console.log(`  ${opts.slug}: evidence ${created} created, ${updated} updated (${opts.evidence.length} total)`);
}

async function main() {
  await seedPhase({
    slug: "phishing-account-compromise-p1",
    title: "Phase 1 — Who's Actually Responsible",
    briefing:
      "Accounts Payable flagged an unusual request to change a vendor's bank details before releasing a large invoice payment. The request came from Priya Nair's own email account — but that doesn't necessarily mean it came from Priya.",
    objective:
      "Determine how the account was actually compromised, who is actually responsible, and whether the fraudulent payment request went out before or after the compromise. Don't assume the account owner is the culprit just because the email is theirs.",
    phaseNumber: 1,
    phaseLabel: "Who's Actually Responsible",
    isFinalPhase: false,
    suspects: [
      { id: "external-attacker", name: "External attacker (unidentified)", role: "No internal identity match" },
      { id: "priya-nair", name: "Priya Nair", role: "Accounts Payable — account owner" },
      { id: "it-helpdesk", name: "IT Helpdesk staff", role: "Internal" },
    ],
    classifications: ["Business Email Compromise", "Insider Threat", "Ransomware", "Malware Infection"],
    answerSuspectId: "external-attacker",
    answerClassification: "Business Email Compromise",
    answerSeverity: "HIGH",
    evidence: [
      { key: "phishing-email", label: "Suspicious email", description: "A message spoofing 'IT-Helpdesk@cybersage-support.com' (not the real internal domain) asked Priya Nair to 're-verify her password' via a linked form. Sent 09:14, clicked 09:19.", kind: "DIGITAL", isCritical: true },
      { key: "login-anomaly", label: "Login anomaly report", description: "Priya's mailbox was accessed from an IP address geolocated outside the country at 09:31 — twelve minutes after the phishing link was clicked, while her badge shows her still in the building.", kind: "DIGITAL", isCritical: true },
      { key: "mailbox-rule", label: "Hidden inbox rule", description: "A rule created at 09:33 silently moves any email containing 'invoice' or 'payment' to a rarely-checked folder — created minutes after the anomalous login, and not something Priya set up herself.", kind: "DIGITAL", isCritical: true },
      { key: "vendor-email-change", label: "Sent email — bank detail change request", description: "At 10:02, an email was sent from Priya's account to Accounts Payable requesting the bank details for an upcoming vendor invoice be updated to a new account, before the mailbox rule would have hidden any reply questioning it.", kind: "DIGITAL", isCritical: true },
      { key: "password-reset-log", label: "Password reset history", description: "Priya's last self-service password reset was three weeks earlier, for an unrelated expired-password prompt. Routine.", kind: "DIGITAL", isCritical: false },
      { key: "vpn-log-normal", label: "VPN connection log", description: "Priya's laptop connected to the corporate VPN at 08:55 that morning from her usual home IP address, as it does most weekdays.", kind: "DIGITAL", isCritical: false },
      { key: "parking-note", label: "Sticky note", description: "\"Car park pass expires Friday — renew!\" Not related to anything.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "phishing-account-compromise-p2",
    title: "Phase 2 — Contain the Campaign",
    briefing:
      "Before this can be closed out, two things need confirming: whether the fraudulent payment actually went out, and whether Priya's account was the attacker's only target.",
    objective:
      "Confirm the financial outcome and the true scope of the campaign. A fraudulent account number that happens to resemble a real vendor's name is not the same thing as a legitimate billing dispute.",
    phaseNumber: 2,
    phaseLabel: "Contain the Campaign",
    isFinalPhase: true,
    suspects: [
      { id: "single-target", name: "Isolated to Priya Nair's account", role: "" },
      { id: "two-target", name: "Targeted campaign hitting at least two employees", role: "" },
      { id: "org-wide-breach", name: "Organization-wide breach", role: "" },
    ],
    classifications: [
      "Business Email Compromise — targeted campaign",
      "Business Email Compromise — isolated incident",
      "Internal fraud",
      "False alarm — legitimate vendor change",
    ],
    answerSuspectId: "two-target",
    answerClassification: "Business Email Compromise — targeted campaign",
    answerSeverity: "HIGH",
    evidence: [
      { key: "payment-hold-log", label: "Payment approval log", description: "Accounts Payable's dual-approval policy flagged the request before release — the payment was placed on hold pending verification and was never paid out.", kind: "DIGITAL", isCritical: true },
      { key: "second-phishing-attempt", label: "Second phishing email", description: "The same spoofed domain sent an identical 're-verify your password' email to an employee in Payroll, forty minutes after the one Priya received.", kind: "DIGITAL", isCritical: true },
      { key: "payroll-employee-no-click", label: "Payroll employee's report", description: "The Payroll employee did not click the link and instead reported the email to IT Security immediately.", kind: "DIGITAL", isCritical: false },
      { key: "sender-domain-registration", label: "Domain registration lookup", description: "The spoofed domain was registered two days before the campaign began — consistent with a premeditated, targeted attack rather than an opportunistic one.", kind: "DIGITAL", isCritical: true },
      { key: "bank-account-reused", label: "Fraudulent account details", description: "The requested replacement bank account is held under a name similar to, but not matching, the real vendor's legal name.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  console.log("phishing-account-compromise: both phases ready.");
  process.exit(0);
}

main();
