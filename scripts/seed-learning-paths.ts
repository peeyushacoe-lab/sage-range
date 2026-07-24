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

  console.log("Learning Paths capstone wiring complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
