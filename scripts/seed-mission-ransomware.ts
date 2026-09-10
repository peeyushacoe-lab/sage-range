// Seeds Mission Analyst's second scenario: "IR-002 — Night Shift Ransomware".
//
// The analytical trap: the AV alert (the thing that LOOKS like the incident)
// fired on WS-014 at 23:10 and was quarantined — but encryption didn't start
// until 23:47, on a DIFFERENT workstation (WS-022). The quarantined file was
// a decoy/unrelated detection; the real patient zero is the phishing
// attachment opened on WS-022 at 22:58, which the quarantine alert doesn't
// even mention. A player who stops at "found the alert, that's patient
// zero" gets the suspect wrong even with several real pieces of evidence
// logged — the trap is in the sequence, not in finding things.
//
// Idempotent — upserts on (scenarioId, key). Run:
//   npx tsx scripts/seed-mission-ransomware.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SUSPECTS = [
  { id: "ws022-mreyes", name: "M. Reyes (WS-022)", role: "Accounts Payable" },
  { id: "ws014-jchen", name: "J. Chen (WS-014)", role: "Accounts Payable" },
  { id: "unknown", name: "Cannot be determined from available evidence", role: "" },
];

const CLASSIFICATIONS = ["Ransomware", "Insider Threat", "Phishing (no execution)", "Hardware Failure"];

const EVIDENCE: {
  key: string;
  label: string;
  description: string;
  kind: "PHYSICAL" | "DIGITAL";
  isCritical: boolean;
}[] = [
  {
    key: "ws-quarantine-alert",
    label: "Antivirus quarantine alert",
    description:
      "WS-014 (J. Chen): a suspicious executable was detected and quarantined at 23:10. No further activity on this host afterward — the quarantine worked.",
    kind: "DIGITAL",
    isCritical: false, // deliberately the trap: real, but not the incident
  },
  {
    key: "phishing-attachment",
    label: "Email attachment log",
    description:
      "WS-022 (M. Reyes): a macro-enabled 'Overdue_Invoice.xlsm' attachment was opened at 22:58, twelve minutes before the quarantine alert fired on a different machine.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "network-spread-log",
    label: "File share activity log",
    description:
      "Mass file-rename activity (consistent with encryption) began on the Finance file share at 23:47, originating from WS-022's mapped drive session — not WS-014's.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "backup-snapshot",
    label: "Backup system status",
    description:
      "The 22:00 backup snapshot completed successfully and is unaffected — it predates the 22:58 attachment open, so full recovery without paying is possible.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "printer-error",
    label: "Printer error log",
    description: "A paper jam on the 3rd-floor printer at 23:00. Unrelated to any system on the network.",
    kind: "PHYSICAL",
    isCritical: false,
  },
  {
    key: "helpdesk-ticket",
    label: "Helpdesk ticket #4471",
    description: "A routine password-reset request submitted at 14:30 that afternoon — hours before any of this started.",
    kind: "DIGITAL",
    isCritical: false,
  },
  {
    key: "coffee-machine-log",
    label: "Smart coffee machine connection log",
    description: "The break-room coffee machine reconnected to guest wifi at 23:05 after a router reboot. IoT noise, not a lead.",
    kind: "PHYSICAL",
    isCritical: false,
  },
];

async function main() {
  const content = {
    title: "IR-002 — Night Shift Ransomware",
    briefing:
      "File shares across the Finance department were found encrypted this morning. Backups appear intact, but the entry point and true patient zero aren't obvious — the first alert that fired isn't necessarily where this started.",
    objective:
      "Identify the actual patient zero, how the ransomware got in, and whether this needs to be treated as a data-loss event or a recoverable one. The most obvious alert may not be the most important one.",
    environment: "office-v1",
    published: true,
    suspects: SUSPECTS,
    classifications: CLASSIFICATIONS,
    answerSuspectId: "ws022-mreyes",
    answerClassification: "Ransomware",
    // Real business impact, but backups are intact and spread was contained
    // to one file share — High, not Critical.
    answerSeverity: "HIGH" as const,
  };

  const scenario = await db.missionScenario.upsert({
    where: { slug: "night-shift-ransomware" },
    update: content,
    create: { slug: "night-shift-ransomware", ...content },
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
