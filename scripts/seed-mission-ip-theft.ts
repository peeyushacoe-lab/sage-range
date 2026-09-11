// IR-006 — Intellectual Property Theft, 2 phases.
//
// Phase 1: a departing engineer downloaded a disproportionate volume of
// source code right before leaving. Trap: sentiment/gossip evidence
// ("he was frustrated about the reorg") feels like it supports the
// conclusion but proves nothing on its own — the competitor-offer email and
// the personal-cloud upload timing are what actually establish intent.
//
// Phase 2 (final boss): does the evidence support an actual legal claim
// (trade secret misappropriation), or just suspicious access? A denial
// from the departed engineer's lawyer is weighed, not treated as
// neutralizing the technical evidence.
//
// Idempotent. Run: npx tsx scripts/seed-mission-ip-theft.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CASE_SLUG = "ip-theft";
const CASE_TITLE = "IR-006 — Intellectual Property Theft";

type EvidenceSeed = { key: string; label: string; description: string; kind: "PHYSICAL" | "DIGITAL"; isCritical: boolean };

async function seedPhase(opts: {
  slug: string; title: string; briefing: string; objective: string;
  phaseNumber: number; phaseLabel: string; isFinalPhase: boolean;
  suspects: { id: string; name: string; role: string }[]; classifications: string[];
  answerSuspectId: string; answerClassification: string; answerSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: EvidenceSeed[];
}) {
  const content = {
    title: opts.title, briefing: opts.briefing, objective: opts.objective,
    environment: "office-v1", published: true,
    caseSlug: CASE_SLUG, caseTitle: CASE_TITLE, phaseNumber: opts.phaseNumber, phaseLabel: opts.phaseLabel, isFinalPhase: opts.isFinalPhase,
    suspects: opts.suspects, classifications: opts.classifications,
    answerSuspectId: opts.answerSuspectId, answerClassification: opts.answerClassification, answerSeverity: opts.answerSeverity,
  };
  const scenario = await db.missionScenario.upsert({ where: { slug: opts.slug }, update: content, create: { slug: opts.slug, ...content } });
  let created = 0, updated = 0;
  for (const e of opts.evidence) {
    const existing = await db.missionEvidence.findUnique({ where: { scenarioId_key: { scenarioId: scenario.id, key: e.key } } });
    await db.missionEvidence.upsert({
      where: { scenarioId_key: { scenarioId: scenario.id, key: e.key } },
      update: { label: e.label, description: e.description, kind: e.kind, isCritical: e.isCritical },
      create: { scenarioId: scenario.id, key: e.key, label: e.label, description: e.description, kind: e.kind, isCritical: e.isCritical },
    });
    existing ? updated++ : created++;
  }
  console.log(`  ${opts.slug}: evidence ${created} created, ${updated} updated (${opts.evidence.length} total)`);
}

async function main() {
  await seedPhase({
    slug: "ip-theft-p1",
    title: "Phase 1 — The Departing Engineer",
    briefing:
      "Lead engineer Marcus Webb resigned two weeks ago. On his last Friday, IT flagged unusually large downloads from the source code repository — more than his entire prior six months combined.",
    objective:
      "Determine whether this was routine backup activity or intellectual property theft, and how confident you can be. A note about someone's mood isn't evidence of what they actually did.",
    phaseNumber: 1, phaseLabel: "The Departing Engineer", isFinalPhase: false,
    suspects: [
      { id: "marcus-webb", name: "Marcus Webb", role: "Former Lead Engineer" },
      { id: "it-offboarding-team", name: "IT offboarding process failure only, no individual responsible", role: "" },
      { id: "unknown", name: "Cannot be determined", role: "" },
    ],
    classifications: ["Intellectual Property Theft", "Authorized Data Backup", "Insider Threat (Non-IP)", "Process Failure Only"],
    answerSuspectId: "marcus-webb",
    answerClassification: "Intellectual Property Theft",
    answerSeverity: "HIGH",
    evidence: [
      { key: "repo-download-log", label: "Repository access log", description: "Marcus downloaded 40+ repositories in a single session on his last Friday — more than his entire prior six months of activity combined.", kind: "DIGITAL", isCritical: true },
      { key: "personal-cloud-upload", label: "Personal cloud upload log", description: "Immediately after the downloads, his laptop shows an upload to a personal Google Drive account of roughly the same data volume.", kind: "DIGITAL", isCritical: true },
      { key: "offer-letter-email", label: "Archived email", description: "A personal email accidentally CC'd to a work list a week before his resignation references a 'signing bonus' from a named competitor.", kind: "DIGITAL", isCritical: true },
      { key: "exit-checklist-incomplete", label: "Offboarding checklist", description: "Marcus's repository access was not revoked until three days AFTER his last day — the gap that allowed the late downloads to happen at all.", kind: "DIGITAL", isCritical: true },
      { key: "team-lead-note", label: "Manager's note", description: "\"Marcus seemed frustrated about the reorg lately.\" A mood observation, not tied to any specific date or action.", kind: "PHYSICAL", isCritical: false },
      { key: "routine-backup-policy", label: "Company IT policy excerpt", description: "Company policy permits engineers to keep local backups of repositories they're assigned to, for offline work.", kind: "DIGITAL", isCritical: false },
      { key: "slack-farewell-message", label: "Team chat message", description: "A friendly farewell message from teammates on his last day. Unrelated.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "ip-theft-p2",
    title: "Phase 2 — Confirm the Damage",
    briefing:
      "Legal wants to know before deciding whether to pursue action: has the code actually been used, or is it just sitting in a personal drive?",
    objective:
      "Assess whether there's a strong basis for a trade secret misappropriation claim, or just suspicious access and timing. A denial from his lawyer doesn't cancel out technical evidence.",
    phaseNumber: 2, phaseLabel: "Confirm the Damage", isFinalPhase: true,
    suspects: [
      { id: "strong-case-misappropriation", name: "Strong evidence of trade secret misappropriation — pursue legal action", role: "" },
      { id: "insufficient-for-legal-action", name: "Access and timing alone — insufficient for a legal claim", role: "" },
      { id: "no-evidence-of-use", name: "No evidence the code was actually used", role: "" },
    ],
    classifications: ["Intellectual Property Theft — confirmed use", "Intellectual Property Theft — unconfirmed use", "Civil dispute, no criminal basis", "Insufficient evidence"],
    answerSuspectId: "strong-case-misappropriation",
    answerClassification: "Intellectual Property Theft — confirmed use",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "competitor-job-start-date", label: "Public profile update", description: "Marcus's public profile shows he started at the named competitor just four days after resigning.", kind: "PHYSICAL", isCritical: false },
      { key: "competitor-product-similarity-report", label: "Engineering comparison report", description: "The competitor's newly announced feature shares unusually specific implementation details — variable naming patterns and a distinctive algorithm approach — matching the stolen repositories.", kind: "DIGITAL", isCritical: true },
      { key: "personal-drive-still-populated", label: "Forensic preservation record", description: "A legal hold on the personal Google Drive folder confirms it still contains the original files, unedited, timestamped from the download day.", kind: "DIGITAL", isCritical: true },
      { key: "marcus-lawyer-statement", label: "Legal correspondence", description: "Marcus's lawyer states the downloaded repositories were \"for a personal project\" and denies any wrongdoing.", kind: "PHYSICAL", isCritical: false },
      { key: "unrelated-press-release", label: "Press clipping", description: "An older press release about the competitor's funding round. Unrelated.", kind: "PHYSICAL", isCritical: false },
    ],
  });
  console.log("ip-theft: both phases ready.");
  process.exit(0);
}
main();
