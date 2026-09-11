// Seeds Mission Analyst's first case, "The Insider", as a 2-phase chain.
//
// Phase 1 "Initial Triage": the original scenario — was Sarah Mitchell
// responsible for the exfiltration, unchanged in substance.
//
// Phase 2 "Final Determination" (final boss): a twist designed to invite
// over-complication rather than resolve cleanly. David Chen's account also
// logged in around the same time (looks like a co-conspirator) — but a
// pre-approved change ticket explains it innocently. The correct call is
// still "Sarah acted alone," now with evidence she was paid for the data
// (undercutting a 'purely coerced victim' read of a threatening text also
// found) and had already resigned. Manufacturing a conspiracy because a
// twist was offered, or downgrading culpability because of the threatening
// text alone, are both the wrong reads — same "suspicious != automatically
// the conclusion" principle as phase 1's red herrings, one level up.
//
// Idempotent — upserts on slug/(scenarioId,key). Run:
//   npx tsx scripts/seed-mission-insider.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CASE_SLUG = "the-insider";
const CASE_TITLE = "IR-001 — The Insider";

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
    slug: "the-insider-p1",
    title: "Phase 1 — Initial Triage",
    briefing:
      "A member of staff reported suspicious activity overnight at CyberSage Technologies. Finance analyst Sarah Mitchell's workstation was found logged in this morning, though she wasn't scheduled to work last night.",
    objective:
      "Determine what happened, who was involved, how it happened, and what — if anything — was compromised. Support your conclusion with evidence, not assumption.",
    phaseNumber: 1,
    phaseLabel: "Initial Triage",
    isFinalPhase: false,
    suspects: [
      { id: "sarah-mitchell", name: "Sarah Mitchell", role: "Finance Analyst" },
      { id: "david-chen", name: "David Chen", role: "IT Administrator" },
      { id: "unknown-external", name: "Unknown external actor", role: "No internal identity match" },
    ],
    classifications: ["Insider Threat", "External Intrusion", "Malware Infection", "Physical Theft"],
    answerSuspectId: "sarah-mitchell",
    answerClassification: "Insider Threat",
    answerSeverity: "HIGH",
    evidence: [
      { key: "laptop-login-log", label: "Workstation login history", description: "FIN-04 shows a successful login at 01:47 using Sarah Mitchell's credentials — three hours after her badge last recorded her leaving the building.", kind: "DIGITAL", isCritical: true },
      { key: "laptop-recent-file", label: "Recently accessed file", description: "Project_Atlas_Final.zip was opened at 02:13 from a network share the finance team doesn't normally touch, then moved to the desktop.", kind: "DIGITAL", isCritical: true },
      { key: "usb-under-desk", label: "USB drive, unlabeled", description: "Found tucked under the desk, still slightly warm. Its connection log shows it was plugged into FIN-04 at 02:18 — five minutes after Atlas_Final.zip was opened.", kind: "PHYSICAL", isCritical: true },
      { key: "badge-reader-log", label: "Restricted-area badge log", description: "Server room access at 01:52 — badge ID matches Sarah Mitchell, despite her own badge showing a building exit stamped 22:40 the previous evening. Either the badge was cloned, or the exit stamp is wrong.", kind: "DIGITAL", isCritical: true },
      { key: "usb-holiday-photos", label: "USB drive, labelled 'Holiday 2026'", description: "Sitting in a desk drawer two rows over. Contains only photos and a hotel booking confirmation — nothing related to this desk or this incident.", kind: "PHYSICAL", isCritical: false },
      { key: "sticky-note-meeting", label: "Sticky note", description: "\"Meeting moved to 9:30 tomorrow — bring the Q3 numbers.\" Ordinary, dated the day before.", kind: "PHYSICAL", isCritical: false },
      { key: "desk-plant", label: "Desk plant", description: "A slightly overwatered peace lily. Not evidence of anything except someone's ability to keep a plant alive.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "the-insider-p2",
    title: "Phase 2 — Final Determination",
    briefing:
      "HR and Legal need a final determination before deciding whether to involve law enforcement. New material has surfaced: a threatening text thread recovered from Sarah's phone, and a second login on the server room's account around the same time — from David Chen, the IT administrator you cleared in Phase 1.",
    objective:
      "Decide, for the record: did Sarah act alone, was David involved, and does the threatening text change how culpable she actually was? A twist showing up doesn't mean the simple answer was wrong — but it doesn't mean it was right, either. Follow the evidence again.",
    phaseNumber: 2,
    phaseLabel: "Final Determination",
    isFinalPhase: true,
    suspects: [
      { id: "sarah-alone", name: "Sarah Mitchell acted alone", role: "" },
      { id: "sarah-david", name: "Sarah Mitchell and David Chen acted together", role: "" },
      { id: "coerced-not-culpable", name: "Sarah was coerced and is not culpable", role: "" },
    ],
    classifications: [
      "Insider Threat",
      "Insider Threat with External Coordination",
      "Coerced Insider (diminished culpability)",
      "Insufficient evidence",
    ],
    answerSuspectId: "sarah-alone",
    answerClassification: "Insider Threat",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "threatening-text", label: "Recovered text message thread", description: "An unknown contact, three days before the incident: \"You said you'd have it by Friday. Don't make me come to your office.\" No name, no company affiliation identifiable from the thread.", kind: "PHYSICAL", isCritical: true },
      { key: "david-login-overlap", label: "IT admin account login", description: "David Chen's account logged into the server room's management console at 01:50 — two minutes before the badge event attributed to Sarah.", kind: "DIGITAL", isCritical: false },
      { key: "change-ticket", label: "Change management ticket #CHG-2291", description: "Approved a week prior: routine server patching scheduled for 01:30–02:30 that night, assigned to David Chen. Matches his login exactly.", kind: "DIGITAL", isCritical: true },
      { key: "exit-interview-note", label: "HR file note", description: "Sarah submitted her resignation three days before the incident, effective in two weeks. She gave no reason beyond \"a new opportunity.\"", kind: "PHYSICAL", isCritical: true },
      { key: "bank-transfer-alert", label: "Personal account activity alert", description: "A pending outbound transfer from Sarah's personal bank account to an unfamiliar recipient, initiated two days after the incident — the amount is consistent with payment for data, not a routine expense.", kind: "DIGITAL", isCritical: true },
    ],
  });

  console.log("the-insider: both phases ready.");
  process.exit(0);
}

main();
