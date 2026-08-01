/**
 * Seed the labs added to close catalogue gaps.
 *
 * The catalogue was heavily weighted towards Incident Response, Web Security
 * and Threat Intelligence, with only one lab each in Network Analysis, Memory
 * Analysis and Email Security, and a single INSANE-difficulty lab.
 *
 * These are task-based labs: completion is tracked through LabResponse stages
 * registered in _content/index.tsx, so they need no Flag rows — the lab page
 * only renders the flag form for labs without task stages.
 *
 * Idempotent: upserts on slug.
 *
 * Usage: npm run seed:new-labs
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "pcap-triage",
    title: "PCAP Triage — Finding the Flow That Matters",
    description:
      "Three hours of capture, seven conversations, one host misbehaving. Work from conversation statistics rather than packet bytes, the way real triage starts.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Network Analysis",
    points: 150,
  },
  {
    slug: "linux-persistence-hunt",
    title: "Linux Persistence Hunt",
    description:
      "A web server has been rebuilt twice and the attacker keeps returning. Three persistence mechanisms survive across cron, systemd and a shell profile. Find all three.",
    type: "BLUE_TEAM" as const,
    difficulty: "HARD" as const,
    category: "Linux Security",
    points: 200,
  },
  {
    slug: "email-header-forensics",
    title: "Email Header Forensics",
    description:
      "£48,200 was nearly paid to a new bank account. Decide whether the invoice is genuine using the headers alone — SPF, DKIM, DMARC, the Received chain and a lookalike domain.",
    type: "BLUE_TEAM" as const,
    difficulty: "EASY" as const,
    category: "Email Security",
    points: 100,
  },
  {
    slug: "pe-static-analysis",
    title: "PE Static Analysis — Verdict Without Execution",
    description:
      "An unknown binary landed in a user's Temp directory. You cannot run it and the commander wants a verdict in ten minutes. Entropy, imports and strings are all you have.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Malware Analysis",
    points: 150,
  },
  {
    slug: "memory-process-hunt",
    title: "Memory Process Hunt — Injection and Masquerading",
    description:
      "Triage a memory image for process injection. An impossible parent, a masqueraded path, and unbacked RWX memory in the one process you least want it in.",
    type: "BLUE_TEAM" as const,
    difficulty: "HARD" as const,
    category: "Memory Analysis",
    points: 200,
  },
  {
    slug: "build-pipeline-compromise",
    title: "Build Pipeline Compromise",
    description:
      "Release 2.8.0 shipped to 40,000 customers. The build is green and signed, and nothing looks wrong in isolation. Prove what happened by correlating four sources.",
    type: "BLUE_TEAM" as const,
    difficulty: "INSANE" as const,
    category: "Detection Engineering",
    points: 350,
  },
];

async function main() {
  console.log("\nSeeding new labs\n");

  let created = 0;
  let updated = 0;

  for (const lab of LABS) {
    const existing = await db.lab.findUnique({ where: { slug: lab.slug } });

    await db.lab.upsert({
      where: { slug: lab.slug },
      create: { ...lab, published: true },
      update: {
        title: lab.title,
        description: lab.description,
        type: lab.type,
        difficulty: lab.difficulty,
        category: lab.category,
        points: lab.points,
        published: true,
      },
    });

    if (existing) updated++;
    else created++;
    console.log(`  ${existing ? "updated" : "created"}  ${lab.slug.padEnd(28)} ${lab.difficulty.padEnd(7)} ${lab.category}`);
  }

  const total = await db.lab.count({ where: { published: true } });
  const byDifficulty = await db.lab.groupBy({
    by: ["difficulty"],
    where: { published: true },
    _count: true,
  });

  console.log(`\n${created} created, ${updated} updated. ${total} published labs total.`);
  console.log(
    "Difficulty spread: " +
      byDifficulty.map((d) => `${d.difficulty} ${d._count}`).join(", "),
  );
  console.log("");

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("New lab seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
