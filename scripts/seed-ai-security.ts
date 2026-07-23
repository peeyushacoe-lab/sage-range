// Seeds the first entry in a new "AI Security" category — the first lab of
// its kind in Sage Vault. Idempotent — safe to run multiple times.
// Run: npx tsx scripts/seed-ai-security.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "prompt-injection",
    title: "Prompt Injection",
    description: "Attack and defend an LLM-powered support agent — spot a direct prompt injection, uncover an indirect injection hidden in untrusted content, then pick the mitigation that actually holds up.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "AI Security",
    points: 200,
    published: true,
    flags: [
      { value: "SAGE{d1r3ct_pr0mpt_1nj3ct10n}", points: 60 },
      { value: "SAGE{1nd1r3ct_1nj3ct10n_v1a_t1ck3t}", points: 70 },
      { value: "SAGE{architectur4l_m1t1g4t10n}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Read exactly what the customer typed, then what the bot did right after." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The customer's message directly told the model to ignore its instructions — no code, no SQL, nothing technical." },
      { stage: "task_1", level: 3, pointCost: 30, text: "This is a direct prompt injection — a plain-text instruction override typed straight into the chat." },
      { stage: "task_2", level: 1, pointCost: 10, text: "No human typed anything malicious this time. Look inside the raw ticket content itself, not the chat." },
      { stage: "task_2", level: 2, pointCost: 20, text: "There's a hidden HTML comment inside the ticket body — comments aren't shown to humans reading the ticket, but the model still reads the raw text." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Quote the tool call from the log exactly: refund_tool(amount=5000, account=\"IBAN-ATTACKER-9921\")" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Ask yourself: can a system-prompt instruction ever be 100% guaranteed to override attacker-supplied text?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "Prompt-level warnings are advisory — a well-crafted injection can still talk the model out of following them." },
      { stage: "task_3", level: 3, pointCost: 30, text: "The reliable fix separates instructions from data and requires approval before high-impact tool calls, not just a stronger warning." },
    ],
  },
];

async function main() {
  for (const lab of LABS) {
    const { flags, hints, ...labData } = lab;

    const created = await db.lab.upsert({
      where: { slug: lab.slug },
      update: labData,
      create: labData,
    });

    await db.flag.deleteMany({ where: { labId: created.id } });
    await db.labHint.deleteMany({ where: { labId: created.id } });

    await db.flag.createMany({
      data: flags.map((f) => ({ labId: created.id, value: f.value, points: f.points })),
    });
    await db.labHint.createMany({
      data: hints.map((h) => ({ labId: created.id, stage: h.stage, level: h.level, pointCost: h.pointCost, text: h.text })),
    });

    console.log(`✓ ${lab.title} — ${flags.length} flags, ${hints.length} hints`);
  }
  console.log("AI Security seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
