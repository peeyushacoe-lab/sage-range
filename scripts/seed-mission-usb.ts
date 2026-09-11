// IR-004 — The Dropped Drive (physical USB / "BadUSB" drop attack), 2 phases.
//
// Phase 1: an employee (a victim of social engineering, not a culprit)
// plugged in a USB drive found in the parking lot. Trap: the drive's
// "CONFIDENTIAL Salary Review" label baits you toward reading this as a
// targeted insider leak; it's actually generic bait for an opportunistic
// drop attack, and the parking-lot camera evidence is what actually
// establishes deliberate external placement.
//
// Phase 2 (final boss): the attacker staged data and attempted lateral
// movement, but containment happened before any confirmed exfiltration —
// the trap is concluding "they tried, so assume they succeeded."
//
// Idempotent. Run: npx tsx scripts/seed-mission-usb.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CASE_SLUG = "dropped-drive";
const CASE_TITLE = "IR-004 — The Dropped Drive";

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
    slug: "dropped-drive-p1",
    title: "Phase 1 — The Dropped Drive",
    briefing:
      "Marketing employee Tom Blake plugged in a USB drive he found in the parking lot this morning, labeled 'Q3 Salary Review — CONFIDENTIAL.' His workstation started behaving oddly within minutes.",
    objective:
      "Determine what actually happened, who's responsible, and how serious it is. A tempting label doesn't tell you who the target was.",
    phaseNumber: 1, phaseLabel: "The Dropped Drive", isFinalPhase: false,
    suspects: [
      { id: "external-attacker", name: "External attacker via physical drop", role: "" },
      { id: "tom-blake", name: "Tom Blake", role: "Marketing" },
      { id: "unknown-employee", name: "An unidentified employee planted it deliberately", role: "" },
    ],
    classifications: ["Physical Media Attack (USB Drop)", "Insider Threat", "Phishing", "Malware Infection (email-borne)"],
    answerSuspectId: "external-attacker",
    answerClassification: "Physical Media Attack (USB Drop)",
    answerSeverity: "HIGH",
    evidence: [
      { key: "usb-insertion-log", label: "USB device history", description: "WS-045 (Tom Blake): a USB device with a serial number not in IT inventory was inserted at 08:47.", kind: "DIGITAL", isCritical: true },
      { key: "autorun-script-log", label: "Script execution log", description: "A PowerShell script ran automatically at 08:48 — one minute after insertion, before Tom could have manually opened anything. Consistent with keystroke-injection ('BadUSB') hardware, not a normal file.", kind: "DIGITAL", isCritical: true },
      { key: "security-camera-still", label: "Parking lot camera still", description: "08:15 — an unfamiliar vehicle parked near the entrance; someone is seen crouching near the walkway before leaving. No face visible, but the placement looks deliberate, not lost.", kind: "PHYSICAL", isCritical: true },
      { key: "outbound-c2-beacon", label: "Outbound connection log", description: "WS-045 began contacting an external IP every 5 minutes starting 08:50 — a command-and-control beacon pattern.", kind: "DIGITAL", isCritical: true },
      { key: "usb-drive-label", label: "Recovered USB drive", description: "Labeled 'Q3 Salary Review — CONFIDENTIAL' in marker. Generic bait wording — nothing about it is specific to Tom, Marketing, or any real document.", kind: "PHYSICAL", isCritical: false },
      { key: "tom-blake-statement", label: "Tom Blake's statement", description: "\"I thought IT must have dropped it and wanted to return it — I plugged it in to see whose it was.\"", kind: "PHYSICAL", isCritical: false },
      { key: "break-room-notice", label: "Break room flyer", description: "A reminder about Friday's office potluck. Unrelated.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "dropped-drive-p2",
    title: "Phase 2 — Contain the Beacon",
    briefing:
      "With the C2 beacon confirmed, IT needs to know whether the attacker actually got anywhere before WS-045 was isolated.",
    objective:
      "Determine whether data actually left the network or the attacker was stopped mid-attempt. Trying and succeeding aren't the same thing.",
    phaseNumber: 2, phaseLabel: "Contain the Beacon", isFinalPhase: true,
    suspects: [
      { id: "contained-no-exfil", name: "Contained before exfiltration — no data left the network", role: "" },
      { id: "exfil-occurred", name: "Data was successfully exfiltrated", role: "" },
      { id: "multiple-hosts-compromised", name: "Multiple hosts were compromised", role: "" },
    ],
    classifications: ["Physical Media Attack — contained", "Physical Media Attack — data breach confirmed", "Advanced Persistent Threat", "Insufficient evidence"],
    answerSuspectId: "contained-no-exfil",
    answerClassification: "Physical Media Attack — contained",
    answerSeverity: "HIGH",
    evidence: [
      { key: "network-scan-log", label: "Internal network scan log", description: "WS-045 ran an internal network scan at 09:10, twenty minutes after the beacon started — reconnaissance for further movement.", kind: "DIGITAL", isCritical: true },
      { key: "second-host-auth-attempt", label: "Failed authentication log", description: "A login attempt from WS-045 against the file server, using Tom's own (non-admin) credentials, failed at 09:15 — his account lacked the access needed to pivot.", kind: "DIGITAL", isCritical: true },
      { key: "data-staging-folder", label: "Hidden folder discovery", description: "A hidden folder was created on WS-045 at 09:20, containing copies of several local documents — staged, but no outbound transfer of this folder was ever logged.", kind: "DIGITAL", isCritical: true },
      { key: "isolation-timestamp", label: "Network isolation record", description: "IT isolated WS-045 from the network at 09:35 — fifteen minutes after staging began, before any outbound transfer of the staged folder was recorded.", kind: "DIGITAL", isCritical: true },
      { key: "it-inventory-audit-note", label: "IT inventory audit note", description: "A routine hardware inventory audit was already scheduled for that week, unrelated to this incident.", kind: "PHYSICAL", isCritical: false },
    ],
  });
  console.log("dropped-drive: both phases ready.");
  process.exit(0);
}
main();
