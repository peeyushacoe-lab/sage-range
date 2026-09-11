// IR-005 — Privileged Account Abuse, 2 phases.
//
// Phase 1: a privileged admin account granted a contractor permanent
// Domain Admin rights overnight. Trap: it's tempting to blame the real
// admin (R. Osei) since it's his account — but he was on a flight with no
// connectivity, and the contractor who received the rights wasn't even
// on-site. The account itself was compromised via a spoofed MFA approval.
//
// Phase 2 (final boss): the grant is still active and someone is actively
// using it — this isn't a historical incident to write up, it's a live one.
//
// Idempotent. Run: npx tsx scripts/seed-mission-privileged.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CASE_SLUG = "privileged-account-abuse";
const CASE_TITLE = "IR-005 — Privileged Account Abuse";

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
    slug: "privileged-account-abuse-p1",
    title: "Phase 1 — Whose Access Is This",
    briefing:
      "The privileged service account 'svc-admin-ops' granted a contractor, J. Wells, permanent Domain Admin rights at 02:14 last night — far outside any normal onboarding process.",
    objective:
      "Determine whether the real admin misused his access, or whether the account itself was compromised. An account acting at 2 AM doesn't mean its owner was awake.",
    phaseNumber: 1, phaseLabel: "Whose Access Is This", isFinalPhase: false,
    suspects: [
      { id: "compromised-admin-account", name: "svc-admin-ops account compromised (not R. Osei)", role: "" },
      { id: "r-osei", name: "R. Osei", role: "IT Administrator — account owner" },
      { id: "contractor-wells", name: "J. Wells", role: "Contractor — recipient of the grant" },
    ],
    classifications: ["Privileged Account Compromise", "Insider Threat (Admin)", "Third-Party/Contractor Abuse", "Configuration Error"],
    answerSuspectId: "compromised-admin-account",
    answerClassification: "Privileged Account Compromise",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "permission-change-log", label: "Permission change log", description: "svc-admin-ops granted 'Contractor - J. Wells' permanent Domain Admin rights at 02:14.", kind: "DIGITAL", isCritical: true },
      { key: "admin-mfa-log", label: "MFA approval log", description: "The MFA prompt for svc-admin-ops at 02:10 was approved from a mobile device never previously associated with this account — R. Osei's registered device shows no notification received.", kind: "DIGITAL", isCritical: true },
      { key: "admin-out-of-office", label: "R. Osei's calendar", description: "R. Osei was on an overnight flight at 02:10, per his calendar and confirmed boarding record — no in-flight connectivity.", kind: "PHYSICAL", isCritical: true },
      { key: "contractor-badge-log", label: "J. Wells' badge log", description: "No building access recorded for J. Wells that night — she wasn't on-site when the grant was made in her name.", kind: "PHYSICAL", isCritical: true },
      { key: "helpdesk-callback-record", label: "Mobile provider security log", description: "A call impersonating IT support requested a SIM swap on R. Osei's number three days earlier. The request was REJECTED by the provider's verification process.", kind: "DIGITAL", isCritical: false },
      { key: "late-night-badge-entries", label: "Overnight badge log", description: "Routine cleaning staff badge entries between 01:00 and 03:00. Normal for a weeknight.", kind: "PHYSICAL", isCritical: false },
      { key: "printer-toner-request", label: "Supply request", description: "A routine toner cartridge request submitted the same day. Unrelated.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "privileged-account-abuse-p2",
    title: "Phase 2 — Undo the Damage",
    briefing:
      "With the compromise confirmed, Security needs the full scope before this can be closed: were other accounts touched, and is the malicious access still live?",
    objective:
      "Assess whether this is a historical incident to document, or a live one that still needs stopping right now.",
    phaseNumber: 2, phaseLabel: "Undo the Damage", isFinalPhase: true,
    suspects: [
      { id: "access-still-live-active-abuse", name: "Access grant is still active and being actively used", role: "" },
      { id: "revoked-no-further-activity", name: "Access was already revoked, no further activity", role: "" },
      { id: "isolated-to-wells", name: "Isolated to J. Wells' account only", role: "" },
    ],
    classifications: ["Privileged Account Compromise — active exploitation", "Privileged Account Compromise — contained", "Contractor Account Misuse", "False alarm"],
    answerSuspectId: "access-still-live-active-abuse",
    answerClassification: "Privileged Account Compromise — active exploitation",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "additional-grants-log", label: "Extended permission change log", description: "Beyond J. Wells, two other dormant accounts also received elevated rights in the same session, at 02:16 and 02:18 — a broader pattern of seeding access.", kind: "DIGITAL", isCritical: true },
      { key: "wells-account-still-active", label: "Current access status", description: "As of this morning's review, J. Wells' Domain Admin grant has NOT been revoked — it is still active.", kind: "DIGITAL", isCritical: true },
      { key: "login-attempt-using-wells", label: "Login attempt log", description: "A login using J. Wells' newly-elevated credentials occurred at 06:40 from an unfamiliar external IP address — after the grant, someone is actively using it.", kind: "DIGITAL", isCritical: true },
      { key: "wells-notified-unaware", label: "J. Wells' statement", description: "Contacted by phone, J. Wells confirms she hasn't logged in in weeks and has no idea her account was touched.", kind: "PHYSICAL", isCritical: false },
      { key: "legit-onboarding-ticket", label: "Onboarding ticket #3390", description: "A legitimate, approved onboarding ticket for a different contractor, filed the same week. Different name, different request.", kind: "DIGITAL", isCritical: false },
    ],
  });
  console.log("privileged-account-abuse: both phases ready.");
  process.exit(0);
}
main();
