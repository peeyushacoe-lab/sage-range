// Wires Learning Path capstones to the new Incident Simulations.
//
// IMPORTANT: prisma/seed.ts already seeds 5 Learning Paths (ctf-starter,
// web-security-essentials, soc-analyst-fundamentals, advanced-forensics,
// red-team-fundamentals). This script does NOT create competing duplicates —
// it extends the two that are the best thematic fit for a capstone
// (soc-analyst-fundamentals, advanced-forensics) with a couple of extra,
// non-overlapping labs and sets their capstoneSimulationSlug, then adds
// exactly ONE genuinely new path (Threat Hunter Path) for the one skill
// area — proactive hunting / detection engineering — nothing existing
// already covers.
//
// Requires prisma/seed.ts (for the base labs + soc-analyst-fundamentals /
// advanced-forensics paths) and the three incident-simulation seed scripts
// to have been run first.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-learning-paths.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function setPathLabs(slug: string, labSlugs: string[]) {
  const path = await db.learningPath.findUnique({ where: { slug } });
  if (!path) {
    console.warn(`⚠ Learning path "${slug}" not found — run prisma/seed.ts first. Skipping.`);
    return null;
  }

  const labs = await db.lab.findMany({ where: { slug: { in: labSlugs } }, select: { id: true, slug: true } });
  const labIdBySlug = new Map(labs.map((l) => [l.slug, l.id]));
  const missing = labSlugs.filter((s) => !labIdBySlug.has(s));
  if (missing.length > 0) {
    console.warn(`⚠ ${slug}: missing labs in DB, skipping them: ${missing.join(", ")}`);
  }

  await db.pathLab.deleteMany({ where: { pathId: path.id } });
  let order = 1;
  for (const s of labSlugs) {
    const labId = labIdBySlug.get(s);
    if (!labId) continue;
    await db.pathLab.create({ data: { pathId: path.id, labId, order: order++ } });
  }
  return path;
}

async function main() {
  // ── Extend existing paths with capstone unlocks ──────────────────────────
  await setPathLabs("soc-analyst-fundamentals", [
    "phishing-analysis",
    "soc-alert-investigation",
    "network-forensics-101",
    "windows-log-analysis",
    "incident-severity-classification",
  ]);
  await db.learningPath.update({
    where: { slug: "soc-analyst-fundamentals" },
    data: { capstoneSimulationSlug: "fin-2026-004-ransomware" },
  });
  console.log("✓ soc-analyst-fundamentals → capstone fin-2026-004-ransomware");

  await setPathLabs("advanced-forensics", [
    "malware-triage",
    "memory-forensics",
    "windows-registry-analysis",
    "browser-forensics",
    "dfir-timeline-creation",
    "mft-analysis",
    "usb-forensics",
  ]);
  await db.learningPath.update({
    where: { slug: "advanced-forensics" },
    data: { capstoneSimulationSlug: "hosp-2026-001-ransomware" },
  });
  console.log("✓ advanced-forensics → capstone hosp-2026-001-ransomware");

  // ── New path: no existing path covers proactive hunting / detection
  // engineering, so this one is additive rather than duplicative. ─────────
  const threatHunter = await db.learningPath.upsert({
    where: { slug: "threat-hunter-path" },
    update: {
      title: "Threat Hunter Path",
      description:
        "Proactive detection and hunting skills: MITRE ATT&CK mapping, IOC hunting, Sigma rule authoring, and " +
        "tracking lateral movement and persistence before an incident even gets reported. Finish every lab to " +
        "unlock the GOV-2026-003 capstone — a quiet, low-and-slow intrusion with no ransom note to tip you off.",
      order: 5,
      published: true,
      capstoneSimulationSlug: "gov-2026-003-apt-intrusion",
    },
    create: {
      slug: "threat-hunter-path",
      title: "Threat Hunter Path",
      description:
        "Proactive detection and hunting skills: MITRE ATT&CK mapping, IOC hunting, Sigma rule authoring, and " +
        "tracking lateral movement and persistence before an incident even gets reported. Finish every lab to " +
        "unlock the GOV-2026-003 capstone — a quiet, low-and-slow intrusion with no ransom note to tip you off.",
      order: 5,
      published: true,
      capstoneSimulationSlug: "gov-2026-003-apt-intrusion",
    },
  });
  const labs = await db.lab.findMany({
    where: {
      slug: {
        in: [
          "mitre-attack-mapping",
          "ioc-hunting",
          "sigma-rule-creation",
          "persistence-detection",
          "threat-hunting-lateral-movement",
          "detection-logic-building",
        ],
      },
    },
    select: { id: true, slug: true },
  });
  const labIdBySlug = new Map(labs.map((l) => [l.slug, l.id]));
  await db.pathLab.deleteMany({ where: { pathId: threatHunter.id } });
  let order = 1;
  for (const s of [
    "mitre-attack-mapping",
    "ioc-hunting",
    "sigma-rule-creation",
    "persistence-detection",
    "threat-hunting-lateral-movement",
    "detection-logic-building",
  ]) {
    const labId = labIdBySlug.get(s);
    if (!labId) continue;
    await db.pathLab.create({ data: { pathId: threatHunter.id, labId, order: order++ } });
  }
  console.log(`✓ Threat Hunter Path (${order - 1} labs) → capstone gov-2026-003-apt-intrusion`);

  // ── Round 2: the remaining 7 Boss Fight capstones ────────────────────────

  async function upsertPath(opts: {
    slug: string;
    title: string;
    description: string;
    order: number;
    capstoneSimulationSlug: string;
    labSlugs: string[];
  }) {
    const path = await db.learningPath.upsert({
      where: { slug: opts.slug },
      update: {
        title: opts.title,
        description: opts.description,
        order: opts.order,
        published: true,
        capstoneSimulationSlug: opts.capstoneSimulationSlug,
      },
      create: {
        slug: opts.slug,
        title: opts.title,
        description: opts.description,
        order: opts.order,
        published: true,
        capstoneSimulationSlug: opts.capstoneSimulationSlug,
      },
    });
    const pathLabs = await db.lab.findMany({ where: { slug: { in: opts.labSlugs } }, select: { id: true, slug: true } });
    const byPathSlug = new Map(pathLabs.map((l) => [l.slug, l.id]));
    const missing = opts.labSlugs.filter((s) => !byPathSlug.has(s));
    if (missing.length > 0) console.warn(`⚠ ${opts.slug}: missing labs, skipping: ${missing.join(", ")}`);
    await db.pathLab.deleteMany({ where: { pathId: path.id } });
    let o = 1;
    for (const s of opts.labSlugs) {
      const labId = byPathSlug.get(s);
      if (!labId) continue;
      await db.pathLab.create({ data: { pathId: path.id, labId, order: o++ } });
    }
    console.log(`✓ ${opts.title} (${o - 1} labs) → capstone ${opts.capstoneSimulationSlug}`);
  }

  await upsertPath({
    slug: "incident-responder-path",
    title: "Incident Responder Path",
    description:
      "Broad incident-response skills spanning both external attacks and insider risk: alert triage, log " +
      "correlation, severity classification, and insider-threat investigation. Finish every lab to unlock the " +
      "EDU-2026-002 capstone — a case with no malware at all, just a departing employee's own valid credentials.",
    order: 6,
    capstoneSimulationSlug: "edu-2026-002-insider-threat",
    labSlugs: [
      "soc-alert-investigation",
      "windows-log-analysis",
      "event-correlation",
      "insider-threat-investigation",
      "insider-data-theft",
      "incident-severity-classification",
    ],
  });

  await upsertPath({
    slug: "detection-engineer-path",
    title: "Detection Engineer Path",
    description:
      "Build and tune detections across SIEM platforms: Sigma rule authoring, Splunk and Sentinel translation, " +
      "detection validation, and tuning out false positives. Finish every lab to unlock the MFG-2026-004 capstone " +
      "— an IT-to-OT pivot that lives or dies on one well-designed detection rule.",
    order: 7,
    capstoneSimulationSlug: "mfg-2026-004-ot-compromise",
    labSlugs: [
      "detection-tuning",
      "sigma-to-splunk",
      "sigma-to-sentinel",
      "detection-validation",
      "splunk-detection-hunt",
      "detection-logic-building",
    ],
  });

  await upsertPath({
    slug: "cloud-security-analyst-path",
    title: "Cloud Security Analyst Path",
    description:
      "IAM misconfigurations, CloudTrail/Azure log analysis, and cloud incident response across AWS, Azure, and GCP. " +
      "Finish every lab to unlock the CLOUD-2026-001 capstone — a breach that starts in a GitHub commit, not a " +
      "network.",
    order: 8,
    capstoneSimulationSlug: "cloud-2026-001-storage-key-breach",
    labSlugs: [
      "cloud-iam-misconfiguration",
      "azure-rbac-misconfiguration",
      "gcp-iam-permissions",
      "cloudtrail-analysis",
      "azure-logs-analysis",
      "cloud-incident-response",
    ],
  });

  await upsertPath({
    slug: "threat-intelligence-analyst-path",
    title: "Threat Intelligence Analyst Path",
    description:
      "WHOIS/IOC correlation, threat actor profiling, and campaign attribution using the MITRE ATT&CK Navigator. " +
      "Finish every lab to unlock the BEC-2026-002 capstone — tracing a wire-fraud incident back to its " +
      "AiTM phishing infrastructure.",
    order: 9,
    capstoneSimulationSlug: "bec-2026-002-wire-fraud",
    labSlugs: [
      "whois-analysis",
      "ioc-correlation",
      "threat-actor-profiling",
      "mitre-navigator",
      "malware-family-research",
      "campaign-attribution",
    ],
  });

  // Extend two more existing paths (from prisma/seed.ts) with capstones —
  // same non-duplicative approach as soc-analyst-fundamentals/advanced-forensics.
  await setPathLabs("red-team-fundamentals", [
    "privilege-escalation",
    "active-directory-101",
    "kerberoasting",
    "dcsync-attack",
    "golden-ticket-attack",
  ]);
  await db.learningPath.update({
    where: { slug: "red-team-fundamentals" },
    data: { capstoneSimulationSlug: "identity-2026-001-domain-takeover" },
  });
  console.log("✓ red-team-fundamentals → capstone identity-2026-001-domain-takeover");

  await setPathLabs("web-security-essentials", [
    "sql-injection-101",
    "xss-fundamentals",
    "ssrf-attack",
    "advanced-xss",
  ]);
  await db.learningPath.update({
    where: { slug: "web-security-essentials" },
    data: { capstoneSimulationSlug: "supply-2026-001-web-skimmer" },
  });
  console.log("✓ web-security-essentials → capstone supply-2026-001-web-skimmer");

  // RET-2026-005 (POS malware) is intentionally left without a Learning Path
  // gate — ctf-starter is a beginner on-ramp and forcing an INSANE capstone
  // onto it would be a poor difficulty fit. It's still fully playable
  // standalone from the /incidents index.
  console.log("Note: ret-2026-005-pos-malware has no Learning Path capstone — playable standalone from /incidents.");

  console.log("Learning Paths capstone wiring complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
