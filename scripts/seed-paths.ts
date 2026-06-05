import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const paths = [
    {
      slug: "ctf-starter",
      title: "CTF Starter Pack",
      description: "Your first steps into Capture the Flag. Learn source recon, encoding, and credential hygiene.",
      order: 0,
      published: true,
      labs: [{ slug: "welcome-ctf", order: 1 }],
    },
    {
      slug: "web-security-essentials",
      title: "Web Security Essentials",
      description: "Learn to identify and exploit the most common web vulnerabilities — SQL injection, authentication bypass, and blind injection.",
      order: 1,
      published: true,
      labs: [{ slug: "sql-injection-101", order: 1 }],
    },
    {
      slug: "soc-fundamentals",
      title: "SOC Analyst Fundamentals",
      description: "Master alert triage, incident response, and threat containment — the core skill set every blue team analyst needs.",
      order: 2,
      published: true,
      labs: [{ slug: "soc-alert-investigation", order: 1 }],
    },
  ];

  for (const pathData of paths) {
    const path = await db.learningPath.upsert({
      where: { slug: pathData.slug },
      update: {
        title: pathData.title,
        description: pathData.description,
        order: pathData.order,
        published: pathData.published,
      },
      create: {
        slug: pathData.slug,
        title: pathData.title,
        description: pathData.description,
        order: pathData.order,
        published: pathData.published,
      },
    });

    for (const labEntry of pathData.labs) {
      const lab = await db.lab.findUnique({ where: { slug: labEntry.slug } });
      if (!lab) {
        console.warn(`Lab not found: ${labEntry.slug}`);
        continue;
      }

      await db.pathLab.upsert({
        where: { pathId_labId: { pathId: path.id, labId: lab.id } },
        update: { order: labEntry.order },
        create: { pathId: path.id, labId: lab.id, order: labEntry.order },
      });
    }

    console.log(`Seeded path: ${path.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
