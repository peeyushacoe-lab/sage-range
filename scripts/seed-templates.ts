import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const templates = [
    {
      slug: "cloud-misconfiguration",
      name: "Cloud Misconfiguration Crisis",
      description:
        "A public S3 bucket is discovered containing AWS credentials. The attacker uses them to pivot through IAM roles, access production databases, and exfiltrate customer PII. Stop the breach before cloud sprawl makes containment impossible.",
      industry: "Technology",
      difficulty: "MEDIUM" as const,
      published: true,
    },
    {
      slug: "supply-chain-attack",
      name: "Supply Chain Compromise",
      description:
        "A backdoor is discovered in a widely-used npm package your company depends on. The package has 3 million weekly downloads. Assess impact, coordinate vendor disclosure, patch all systems, and navigate a PR firestorm before the press breaks the story.",
      industry: "Software Development",
      difficulty: "HARD" as const,
      published: true,
    },
    {
      slug: "data-breach",
      name: "Data Breach: SQL Injection",
      description:
        "Your WAF detected and blocked a SQL injection attempt — but logs show it succeeded 6 hours earlier. Customer PII for 450,000 accounts may have been exfiltrated. GDPR requires notification within 72 hours. The clock is ticking.",
      industry: "E-Commerce",
      difficulty: "MEDIUM" as const,
      published: true,
    },
  ];

  for (const template of templates) {
    const result = await db.scenarioTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        industry: template.industry,
        difficulty: template.difficulty,
        published: template.published,
      },
      create: {
        slug: template.slug,
        name: template.name,
        description: template.description,
        industry: template.industry,
        difficulty: template.difficulty,
        published: template.published,
      },
    });
    console.log(`Seeded template: ${result.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
