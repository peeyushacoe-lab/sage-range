// Seeds Mission Analyst's second case, "Night Shift Ransomware", as a
// 2-phase chain.
//
// Phase 1 "Patient Zero": the AV alert that actually fired is a decoy on
// the wrong workstation; the real patient zero is a phishing attachment
// opened on a different machine twelve minutes earlier.
//
// Phase 2 "Full Scope Assessment" (final boss): now that patient zero is
// known, does the picture get worse? DNS evidence shows staged outbound
// traffic BEFORE encryption began — double extortion, not just encryption —
// and the encrypted share touched HR as well as Finance. A ransom-note
// screenshot is a deliberate distractor: dramatic, but it doesn't change the
// technical scope assessment, and citing it as if it does should cost
// points the same way citing any other red herring would.
//
// Idempotent — upserts on slug/(scenarioId,key). Run:
//   npx tsx scripts/seed-mission-ransomware.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const CASE_SLUG = "night-shift-ransomware";
const CASE_TITLE = "IR-002 — Night Shift Ransomware";

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
    slug: "night-shift-ransomware-p1",
    title: "Phase 1 — Patient Zero",
    briefing:
      "File shares across the Finance department were found encrypted this morning. Backups appear intact, but the entry point and true patient zero aren't obvious — the first alert that fired isn't necessarily where this started.",
    objective:
      "Identify the actual patient zero, how the ransomware got in, and whether this needs to be treated as a data-loss event or a recoverable one. The most obvious alert may not be the most important one.",
    phaseNumber: 1,
    phaseLabel: "Patient Zero",
    isFinalPhase: false,
    suspects: [
      { id: "ws022-mreyes", name: "M. Reyes (WS-022)", role: "Accounts Payable" },
      { id: "ws014-jchen", name: "J. Chen (WS-014)", role: "Accounts Payable" },
      { id: "unknown", name: "Cannot be determined from available evidence", role: "" },
    ],
    classifications: ["Ransomware", "Insider Threat", "Phishing (no execution)", "Hardware Failure"],
    answerSuspectId: "ws022-mreyes",
    answerClassification: "Ransomware",
    answerSeverity: "HIGH",
    evidence: [
      { key: "ws-quarantine-alert", label: "Antivirus quarantine alert", description: "WS-014 (J. Chen): a suspicious executable was detected and quarantined at 23:10. No further activity on this host afterward — the quarantine worked.", kind: "DIGITAL", isCritical: false },
      { key: "phishing-attachment", label: "Email attachment log", description: "WS-022 (M. Reyes): a macro-enabled 'Overdue_Invoice.xlsm' attachment was opened at 22:58, twelve minutes before the quarantine alert fired on a different machine.", kind: "DIGITAL", isCritical: true },
      { key: "network-spread-log", label: "File share activity log", description: "Mass file-rename activity (consistent with encryption) began on the Finance file share at 23:47, originating from WS-022's mapped drive session — not WS-014's.", kind: "DIGITAL", isCritical: true },
      { key: "backup-snapshot", label: "Backup system status", description: "The 22:00 backup snapshot completed successfully and is unaffected — it predates the 22:58 attachment open, so full recovery without paying is possible.", kind: "DIGITAL", isCritical: true },
      { key: "printer-error", label: "Printer error log", description: "A paper jam on the 3rd-floor printer at 23:00. Unrelated to any system on the network.", kind: "PHYSICAL", isCritical: false },
      { key: "helpdesk-ticket", label: "Helpdesk ticket #4471", description: "A routine password-reset request submitted at 14:30 that afternoon — hours before any of this started.", kind: "DIGITAL", isCritical: false },
      { key: "coffee-machine-log", label: "Smart coffee machine connection log", description: "The break-room coffee machine reconnected to guest wifi at 23:05 after a router reboot. IoT noise, not a lead.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "night-shift-ransomware-p2",
    title: "Phase 2 — Full Scope Assessment",
    briefing:
      "Recovery planning is underway, but two questions remain before the incident can be closed: did the attacker take a copy of anything before encrypting it, and is the damage really contained to Finance?",
    objective:
      "Assess the true scope and whether this is encryption-only or a double-extortion incident. A ransom note demanding payment is dramatic, but it isn't evidence of scope by itself — the network logs are.",
    phaseNumber: 2,
    phaseLabel: "Full Scope Assessment",
    isFinalPhase: true,
    suspects: [
      { id: "finance-only", name: "Contained to the Finance department", role: "" },
      { id: "finance-hr", name: "Spread to Finance and HR departments", role: "" },
      { id: "org-wide", name: "Organization-wide compromise", role: "" },
    ],
    classifications: [
      "Ransomware with data exfiltration (double extortion)",
      "Ransomware, encryption only",
      "Contained malware, no encryption",
      "False positive",
    ],
    answerSuspectId: "finance-hr",
    answerClassification: "Ransomware with data exfiltration (double extortion)",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "dns-exfil-log", label: "Outbound DNS traffic log", description: "Unusual DNS TXT-record queries to an unfamiliar domain at 23:20 — between the attachment opening at 22:58 and encryption starting at 23:47. Consistent with data being staged out before encryption began.", kind: "DIGITAL", isCritical: true },
      { key: "hr-share-log", label: "HR file share activity log", description: "The same mass file-rename pattern seen on the Finance share also hit the HR department's share, starting 23:52 — five minutes after Finance.", kind: "DIGITAL", isCritical: true },
      { key: "legal-share-untouched", label: "Legal file share status", description: "Legal's share, hosted on the same file server, shows no rename activity and remains fully accessible.", kind: "DIGITAL", isCritical: false },
      { key: "ransom-note-screenshot", label: "Ransom note screenshot", description: "A photo of the on-screen ransom note demanding payment within 48 hours. Text is generic — no specific threat about the exfiltrated data is made in it.", kind: "PHYSICAL", isCritical: false },
      { key: "immutable-backup-confirmation", label: "Offline backup confirmation", description: "A separate, offline/immutable backup — distinct from the 22:00 snapshot — is confirmed intact and was never network-accessible during the incident.", kind: "DIGITAL", isCritical: true },
    ],
  });

  console.log("night-shift-ransomware: both phases ready.");
  process.exit(0);
}

main();
