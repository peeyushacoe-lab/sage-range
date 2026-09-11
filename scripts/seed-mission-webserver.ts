// IR-007 — Web Server Compromise, 2 phases.
//
// Phase 1: the public site was briefly defaced — but the defacement log,
// though the most obvious piece of evidence, is nearly a distraction. The
// real finding is a hidden web shell uploaded two minutes BEFORE the
// defacement, in a different directory, never removed when the defacement
// was reverted — the defacement was a side effect, not the goal.
//
// Phase 2 (final boss): with persistent access confirmed, did the attacker
// pivot to the customer database? A WAF log showing "attacks blocked" that
// morning is a decoy — it's unrelated generic bot noise, not this incident.
//
// Idempotent. Run: npx tsx scripts/seed-mission-webserver.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const CASE_SLUG = "web-server-compromise";
const CASE_TITLE = "IR-007 — Web Server Compromise";

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
    slug: "web-server-compromise-p1",
    title: "Phase 1 — The Defaced Page Isn't the Whole Story",
    briefing:
      "The public marketing site briefly showed a defacement image for about 20 minutes overnight before it was caught and reverted.",
    objective:
      "Determine what actually happened — and whether reverting the defacement actually ended the incident. The most visible symptom isn't always the most important finding.",
    phaseNumber: 1, phaseLabel: "The Defaced Page Isn't the Whole Story", isFinalPhase: false,
    suspects: [
      { id: "webshell-persistent-access", name: "Attacker retains persistent access via a web shell — defacement was a side effect", role: "" },
      { id: "defacement-only", name: "Isolated defacement, incident is over", role: "" },
      { id: "insider-marketing", name: "A marketing team member is responsible", role: "" },
    ],
    classifications: ["Web Server Compromise — persistent access", "Website Defacement (isolated)", "DDoS Attack", "Insider Threat"],
    answerSuspectId: "webshell-persistent-access",
    answerClassification: "Web Server Compromise — persistent access",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "defacement-log", label: "Web server access log — defacement", description: "The defacement HTML was uploaded at 03:10 and reverted at 03:30, twenty minutes later.", kind: "DIGITAL", isCritical: false },
      { key: "webshell-file", label: "Hidden file discovery", description: "A PHP file disguised as 'cache_helper.php' was uploaded at 03:08 — two minutes before the defacement, in an unrelated directory. It was not removed when the defacement was reverted.", kind: "DIGITAL", isCritical: true },
      { key: "vulnerable-plugin-log", label: "CMS plugin exploit log", description: "The upload matches a known exploit signature for the site's file-upload plugin, unpatched since a vulnerability was disclosed three weeks ago.", kind: "DIGITAL", isCritical: true },
      { key: "webshell-access-after-revert", label: "Post-incident access log", description: "The hidden file was accessed twice AFTER the defacement was reverted — at 03:45 and 04:20 — proving the attacker retained access after the visible incident was 'resolved.'", kind: "DIGITAL", isCritical: true },
      { key: "patch-ticket-ignored", label: "Patch ticket #2214", description: "A ticket for this exact plugin vulnerability has sat in the backlog for three weeks.", kind: "DIGITAL", isCritical: true },
      { key: "marketing-team-panic-email", label: "Internal email thread", description: "Marketing discussing how embarrassing the defacement is ahead of a launch. No technical content.", kind: "PHYSICAL", isCritical: false },
      { key: "unrelated-ssl-cert-renewal", label: "SSL renewal reminder", description: "A routine automated reminder that the site's certificate renews next month.", kind: "DIGITAL", isCritical: false },
    ],
  });

  await seedPhase({
    slug: "web-server-compromise-p2",
    title: "Phase 2 — What Did They Actually Get",
    briefing:
      "With persistent access confirmed, Security needs to know whether the attacker used that access on anything beyond the web server itself.",
    objective:
      "Determine whether customer data was actually reached — and if so, whether it was just queried or actually taken. A firewall log showing 'attacks blocked' that day isn't necessarily about this incident.",
    phaseNumber: 2, phaseLabel: "What Did They Actually Get", isFinalPhase: true,
    suspects: [
      { id: "customer-data-exfiltrated", name: "Customer data was exfiltrated — confirmed data breach", role: "" },
      { id: "db-accessed-not-exfiltrated", name: "Database was accessed but no evidence of exfiltration", role: "" },
      { id: "no-db-access", name: "No database access occurred", role: "" },
    ],
    classifications: ["Web Server Compromise — confirmed data breach", "Web Server Compromise — no data impact", "Database Misconfiguration", "False positive"],
    answerSuspectId: "customer-data-exfiltrated",
    answerClassification: "Web Server Compromise — confirmed data breach",
    answerSeverity: "CRITICAL",
    evidence: [
      { key: "db-connection-attempt", label: "Database connection log", description: "The hidden web shell was used to connect to the customer database at 04:20, using credentials found in a configuration file — the same timestamp as the second web shell access.", kind: "DIGITAL", isCritical: true },
      { key: "db-query-log-suspicious", label: "Database query log", description: "A query matching a full-table read of the customers table executed at 04:22, two minutes after the connection succeeded.", kind: "DIGITAL", isCritical: true },
      { key: "outbound-transfer-size", label: "Outbound traffic volume log", description: "Outbound traffic from the database server spiked at 04:23 to roughly the size of the entire customer table.", kind: "DIGITAL", isCritical: true },
      { key: "waf-block-log", label: "Web Application Firewall log", description: "Several generic automated bot-scanning attempts were blocked earlier that day — unrelated background noise unconnected to this incident's timeline.", kind: "DIGITAL", isCritical: false },
      { key: "customer-count-estimate", label: "Internal note", description: "An estimate that the customers table holds roughly 50,000 records. Context, not itself evidence of what happened.", kind: "PHYSICAL", isCritical: false },
    ],
  });
  console.log("web-server-compromise: both phases ready.");
  process.exit(0);
}
main();
