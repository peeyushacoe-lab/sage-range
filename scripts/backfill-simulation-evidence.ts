// Backfills Evidence rows for simulation sessions completed before
// recordEvidence was wired into the simulation routes — 419 completed
// sessions existed with zero SIMULATION evidence, so every learner's skill
// profile was silently missing their simulation history until they ran a
// new one. This does NOT re-award XP/skillScore (that already happened when
// the session originally completed) — it only backfills the evidence row
// the profile is derived from.
// Idempotent — recordEvidence upserts on (userId, activity, sourceId), so
// re-running this is safe. Run: npx tsx scripts/backfill-simulation-evidence.ts

import { PrismaClient } from "@prisma/client";
import { buildDebrief } from "../src/lib/simulation/runtime/debrief";
import { getSessionRewardRecipients } from "../src/lib/simulation/team-access";

const db = new PrismaClient();

async function main() {
  const sessions = await db.simulationSession.findMany({
    where: { status: { in: ["CONTAINED", "BREACHED"] } },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
    orderBy: { startedAt: "asc" },
  });

  console.log(`Backfilling evidence for ${sessions.length} completed sessions...\n`);

  let written = 0;
  let skipped = 0;

  for (const session of sessions) {
    const timedEvents = session.events.map((e) => ({
      id: e.id, type: e.type, actor: e.actor, payload: e.payload,
      narrative: e.narrative, createdAt: e.createdAt.toISOString(),
    }));

    let tactics: string[] = [];
    let techniques: string[] = [];
    try {
      const debrief = buildDebrief(session.template.slug, timedEvents, session.status as "CONTAINED" | "BREACHED", session.score ?? 0);
      tactics = [...new Set(debrief.mitreTechniques.map((t) => t.tactic))];
      techniques = [...new Set(debrief.mitreTechniques.map((t) => t.id))];
    } catch {
      // Unrecognised/removed template — still worth recording as evidence
      // of an attempt, just with no tactic tags.
    }

    const isContained = session.status === "CONTAINED";
    const skillPoints = isContained ? Math.floor((session.score ?? 0) / 2) : 0;

    const recipients = await getSessionRewardRecipients(session.id, session.userId);
    for (const recipient of recipients) {
      if (recipient.role !== "STUDENT") continue;
      await db.evidence.upsert({
        where: { userId_activity_sourceId: { userId: recipient.id, activity: "SIMULATION", sourceId: session.id } },
        create: {
          userId: recipient.id, activity: "SIMULATION", sourceId: session.id,
          result: isContained ? "SOLVED" : "PARTIAL",
          skillPoints, slug: session.template.slug, title: session.template.name,
          score: session.score, maxScore: 100, tactics, techniques,
        },
        update: {
          result: isContained ? "SOLVED" : "PARTIAL",
          skillPoints, slug: session.template.slug, title: session.template.name,
          score: session.score, maxScore: 100, tactics, techniques,
        },
      });
      written++;
    }
    if (recipients.length === 0) skipped++;
  }

  console.log(`Done — ${written} evidence rows written across ${sessions.length} sessions (${skipped} sessions had no eligible recipient).`);
  process.exit(0);
}

main();
