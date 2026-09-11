// IR-008 — Supply-Chain / Vendor Compromise, 2 phases.
//
// Phase 1: a trusted monitoring vendor's own build system was compromised,
// and the malicious update was delivered through the legitimate,
// auto-trusted update channel to 340 machines. Trap: a cluster of "my
// laptop is slow" tickets looks like corroborating symptom evidence, but
// most predate the update window — an old unrelated performance issue.
//
// Phase 2 (final boss): three domain admin workstations were among the
// affected machines — the worst-case scenario. The correct read requires
// actually checking whether credentials were harvested (they weren't) and
// whether the beacon was blocked in time (it was) rather than assuming the
// worst because admin machines were merely *touched*.
//
// Idempotent. Run: npx tsx scripts/seed-mission-supplychain.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CASE_SLUG = "supply-chain-compromise";
const CASE_TITLE = "IR-008 — Supply-Chain Compromise";

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
    slug: "supply-chain-compromise-p1",
    title: "Phase 1 — The Trusted Update",
    briefing:
      "The endpoint monitoring agent 'SentriMon,' installed company-wide, pushed an automatic update overnight. Several machines started behaving oddly afterward.",
    objective:
      "Determine what actually happened and who's responsible. A trusted, automatic update channel is not the same as a safe one.",
    phaseNumber: 1, phaseLabel: "The Trusted Update", isFinalPhase: false,
    suspects: [
      { id: "vendor-supply-chain", name: "The vendor's build system was compromised — a supply-chain attack", role: "" },
      { id: "internal-it", name: "Internal IT misconfigured the update policy", role: "" },
      { id: "specific-employee", name: "A specific employee is responsible", role: "" },
    ],
    classifications: ["Supply-Chain Compromise", "Malware Infection (direct)", "Insider Threat", "False Positive / Vendor Bug"],
    answerSuspectId: "vendor-supply-chain",
    answerClassification: "Supply-Chain Compromise",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "update-package-hash-mismatch", label: "Update package hash check", description: "The installed SentriMon update's file hash does not match the vendor's officially published hash for that version.", kind: "DIGITAL", isCritical: true },
      { key: "vendor-advisory", label: "Vendor security advisory", description: "Published this morning: the vendor confirms their build server was compromised and a malicious update was distributed for a six-hour window overnight — matching the timing exactly.", kind: "DIGITAL", isCritical: true },
      { key: "affected-machine-count", label: "Internal inventory report", description: "340 machines received the tainted update before it was caught.", kind: "DIGITAL", isCritical: true },
      { key: "anomalous-process-spawn", label: "Process monitoring log", description: "On affected machines, the SentriMon agent spawned an unexpected child process shortly after updating — matching the vendor's description of the payload's behavior.", kind: "DIGITAL", isCritical: true },
      { key: "unaffected-machine-note", label: "IT configuration note", description: "Machines with auto-update disabled under an older policy were not affected.", kind: "DIGITAL", isCritical: false },
      { key: "helpdesk-tickets-slow-laptop", label: "Helpdesk ticket cluster", description: "Several 'my laptop is slow' tickets from that week — most timestamped before the update window, tied to a known older performance issue.", kind: "PHYSICAL", isCritical: false },
      { key: "office-snack-order", label: "Office supply order", description: "A routine snack restocking order. Unrelated.", kind: "PHYSICAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "supply-chain-compromise-p2",
    title: "Phase 2 — Did It Reach Anything That Matters",
    briefing:
      "340 machines is a wide blast radius. Before this can be closed, leadership needs to know whether anything with real access was touched — specifically, whether any domain admin workstations were among them.",
    objective:
      "Assess the worst-case risk properly: don't assume the worst just because admin machines were touched, and don't assume safety just because the initial payload looked minor. Check what actually happened.",
    phaseNumber: 2, phaseLabel: "Did It Reach Anything That Matters", isFinalPhase: true,
    suspects: [
      { id: "reconnaissance-only-contained", name: "Reconnaissance-only payload, contained before credential harvesting could occur", role: "" },
      { id: "credentials-compromised", name: "Domain admin credentials were compromised", role: "" },
      { id: "full-domain-compromise", name: "Full domain compromise occurred", role: "" },
    ],
    classifications: ["Supply-Chain Compromise — contained", "Supply-Chain Compromise — domain compromised", "Advanced Persistent Threat — active", "Insufficient evidence"],
    answerSuspectId: "reconnaissance-only-contained",
    answerClassification: "Supply-Chain Compromise — contained",
    answerSeverity: "HIGH",
    evidence: [
      { key: "affected-privileged-host-list", label: "Privileged host cross-reference", description: "Three domain admin workstations were among the 340 affected machines.", kind: "DIGITAL", isCritical: true },
      { key: "payload-behavior-analysis", label: "Updated vendor advisory", description: "The vendor's follow-up analysis describes the payload as a reconnaissance/beacon tool, with no credential-harvesting capability identified.", kind: "DIGITAL", isCritical: true },
      { key: "admin-workstation-credential-check", label: "Forensic check — admin workstations", description: "A targeted check on the three admin workstations found no evidence of credential-dumping activity (no LSASS access pattern, no unusual authentication events).", kind: "DIGITAL", isCritical: true },
      { key: "beacon-traffic-blocked", label: "Firewall block log", description: "Outbound beacon traffic from all 340 machines was blocked within the vendor's disclosed six-hour window, using indicators the vendor provided.", kind: "DIGITAL", isCritical: true },
      { key: "unrelated-helpdesk-vpn-issue", label: "Helpdesk ticket", description: "An unrelated VPN connectivity complaint from a remote employee that week.", kind: "PHYSICAL", isCritical: false },
    ],
  });
  console.log("supply-chain-compromise: both phases ready.");
  process.exit(0);
}
main();
