// Seeds Mission Analyst's V1 scenario: "IR-001 — The Insider", a single-room
// office investigation. Evidence keys are opaque and only resolve to a
// label/description server-side (see src/lib/missions.ts) — the point of the
// whole exercise is that the client never ships the answer.
//
// Deliberately small for V1: 7 objects, 4 of them the actual story (login,
// restricted-area entry, file access, USB), 3 of them red herrings (an
// unrelated USB, a stapler, a plant) so "found evidence" isn't the same as
// "found the truth" from the very first scenario.
//
// Idempotent — upserts on (scenarioId, key). Run:
//   npx tsx scripts/seed-mission-insider.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const EVIDENCE: {
  key: string;
  label: string;
  description: string;
  kind: "PHYSICAL" | "DIGITAL";
  isCritical: boolean;
}[] = [
  {
    key: "laptop-login-log",
    label: "Workstation login history",
    description:
      "FIN-04 shows a successful login at 01:47 using Sarah Mitchell's credentials — three hours after her badge last recorded her leaving the building.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "laptop-recent-file",
    label: "Recently accessed file",
    description:
      "Project_Atlas_Final.zip was opened at 02:13 from a network share the finance team doesn't normally touch, then moved to the desktop.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "usb-under-desk",
    label: "USB drive, unlabeled",
    description:
      "Found tucked under the desk, still slightly warm. Its connection log shows it was plugged into FIN-04 at 02:18 — five minutes after Atlas_Final.zip was opened.",
    kind: "PHYSICAL",
    isCritical: true,
  },
  {
    key: "badge-reader-log",
    label: "Restricted-area badge log",
    description:
      "Server room access at 01:52 — badge ID matches Sarah Mitchell, despite her own badge showing a building exit stamped 22:40 the previous evening. Either the badge was cloned, or the exit stamp is wrong.",
    kind: "DIGITAL",
    isCritical: true,
  },
  {
    key: "usb-holiday-photos",
    label: "USB drive, labelled 'Holiday 2026'",
    description:
      "Sitting in a desk drawer two rows over. Contains only photos and a hotel booking confirmation — nothing related to this desk or this incident.",
    kind: "PHYSICAL",
    isCritical: false,
  },
  {
    key: "sticky-note-meeting",
    label: "Sticky note",
    description: "\"Meeting moved to 9:30 tomorrow — bring the Q3 numbers.\" Ordinary, dated the day before.",
    kind: "PHYSICAL",
    isCritical: false,
  },
  {
    key: "desk-plant",
    label: "Desk plant",
    description: "A slightly overwatered peace lily. Not evidence of anything except someone's ability to keep a plant alive.",
    kind: "PHYSICAL",
    isCritical: false,
  },
];

async function main() {
  const scenario = await db.missionScenario.upsert({
    where: { slug: "the-insider" },
    update: {
      title: "IR-001 — The Insider",
      briefing:
        "A member of staff reported suspicious activity overnight at CyberSage Technologies. Finance analyst Sarah Mitchell's workstation was found logged in this morning, though she wasn't scheduled to work last night.",
      objective:
        "Determine what happened, who was involved, how it happened, and what — if anything — was compromised. Support your conclusion with evidence, not assumption.",
      environment: "office-v1",
      published: true,
    },
    create: {
      slug: "the-insider",
      title: "IR-001 — The Insider",
      briefing:
        "A member of staff reported suspicious activity overnight at CyberSage Technologies. Finance analyst Sarah Mitchell's workstation was found logged in this morning, though she wasn't scheduled to work last night.",
      objective:
        "Determine what happened, who was involved, how it happened, and what — if anything — was compromised. Support your conclusion with evidence, not assumption.",
      environment: "office-v1",
      published: true,
    },
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
