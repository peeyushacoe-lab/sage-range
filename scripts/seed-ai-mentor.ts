/**
 * Seed script for AI Mentor system
 * Creates demo hints, quality scores, and sequences
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface LabWithHints {
  id: string;
  title: string;
  slug: string;
}

const STAGES = [
  "reconnaissance",
  "enumeration",
  "exploitation",
  "privilege_escalation",
  "persistence",
  "covering_tracks",
];

async function main() {
  console.log("[AI Mentor Seed] Starting...");

  // Find existing labs to add hints to
  const labs = await db.lab.findMany({
    where: { published: true },
    take: 15,
  });

  if (labs.length === 0) {
    console.warn(
      "[AI Mentor Seed] No published labs found. Skipping hint creation."
    );
    return;
  }

  console.log(`[AI Mentor Seed] Found ${labs.length} labs to seed`);

  let hintsCreated = 0;
  let qualitiesCreated = 0;

  // For each lab, create 2-3 hints per stage
  for (const lab of labs) {
    for (const stage of STAGES.slice(0, 3)) {
      // Use first 3 stages
      for (let level = 1; level <= 2; level++) {
        // 2 hints per stage
        const hint = await db.labHint.upsert({
          where: { labId_stage_level: { labId: lab.id, stage, level } },
          create: {
            labId: lab.id,
            stage,
            level,
            text: getHintText(stage, level),
            pointCost: 10 + level * 5,
          },
          update: {},
        });

        // Create quality record with realistic scores
        const avgScore = getRandomScore();
        const totalRatings = Math.floor(Math.random() * 50) + 5; // 5-55 ratings

        await db.mentorHintQuality.upsert({
          where: { hintId: hint.id },
          create: {
            hintId: hint.id,
            avgScore,
            totalRatings,
            helpfulCount: Math.floor((totalRatings * avgScore) / 10),
            notHelpfulCount: totalRatings - Math.floor((totalRatings * avgScore) / 10),
            submissionRate: Math.random() * 80 + 10, // 10-90%
            inferredDifficulty: getRandomDifficulty(),
          },
          update: {
            avgScore,
            totalRatings,
          },
        });

        hintsCreated++;
        qualitiesCreated++;
      }
    }
  }

  // Create some UsedHint entries for quality recalculation testing
  const demoUsers = await db.user.findMany({
    where: { role: "STUDENT" },
    take: 5,
  });

  if (demoUsers.length > 0) {
    const randomLab = labs[Math.floor(Math.random() * labs.length)];
    const randomHints = await db.labHint.findMany({
      where: { labId: randomLab.id },
      take: 3,
    });

    for (const user of demoUsers) {
      for (const hint of randomHints) {
        await db.usedHint.upsert({
          where: { userId_hintId: { userId: user.id, hintId: hint.id } },
          create: {
            userId: user.id,
            hintId: hint.id,
            qualityScore: Math.floor(Math.random() * 10),
            wasHelpful: Math.random() > 0.3,
            contextDifficulty: ["EASY", "MEDIUM", "HARD", "INSANE"][
              Math.floor(Math.random() * 4)
            ] as any,
            submissionLater: Math.random() > 0.4, // 60% solve after hint
            timeThenSolvedSec: Math.floor(Math.random() * 900 + 300), // 5-20 min
          },
          update: {},
        });
      }
    }

    console.log(`[AI Mentor Seed] Created UsedHint entries for ${demoUsers.length} users`);
  }

  // Create some MentorHintSequence entries for testing
  if (demoUsers.length > 0 && labs.length > 0) {
    for (const user of demoUsers.slice(0, 3)) {
      const lab = labs[Math.floor(Math.random() * labs.length)];
      const stage = STAGES[Math.floor(Math.random() * STAGES.length)];

      const expiresAt = new Date(
        Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000
      );

      await db.mentorHintSequence.upsert({
        where: {
          userId_labId_stage: { userId: user.id, labId: lab.id, stage },
        },
        create: {
          userId: user.id,
          labId: lab.id,
          stage,
          shownHints: [],
          lastShownAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          expiresAt,
        },
        update: {},
      });
    }

    console.log(
      `[AI Mentor Seed] Created MentorHintSequence entries for ${Math.min(3, demoUsers.length)} users`
    );
  }

  console.log(
    `[AI Mentor Seed] ✓ Complete! Created ${hintsCreated} hints and ${qualitiesCreated} quality records`
  );
}

function getHintText(stage: string, level: number): string {
  const hints: Record<string, string[]> = {
    reconnaissance: [
      "Start by performing a DNS lookup to identify the target's mail servers and infrastructure",
      "Use OSINT techniques like Shodan and Censys to discover exposed services",
    ],
    enumeration: [
      "Run nmap with service version detection to identify running services",
      "Check for default credentials on discovered services before attempting brute force",
    ],
    exploitation: [
      "Research CVEs for the identified service versions using NVD database",
      "Try SQL injection on input fields with common payloads",
    ],
    privilege_escalation: [
      "Check sudo privileges with `sudo -l` (might not require password)",
      "Look for SUID binaries that might have known vulnerabilities",
    ],
    persistence: [
      "Create a cron job to maintain access",
      "Add SSH keys to authorized_keys for persistent access",
    ],
    covering_tracks: [
      "Clear bash history with `history -c && history -w`",
      "Remove log entries related to your exploitation activities",
    ],
  };

  return hints[stage]?.[level - 1] || "No hint available";
}

function getRandomScore(): number {
  // Biased towards higher scores (realistic for good hints)
  const rand = Math.random();
  if (rand < 0.3) return Math.random() * 3 + 2; // Low: 2-5
  if (rand < 0.7) return Math.random() * 3 + 5; // Medium: 5-8
  return Math.random() * 2 + 8; // High: 8-10
}

function getRandomDifficulty(): string {
  const rand = Math.random();
  if (rand < 0.2) return "EASY";
  if (rand < 0.5) return "MEDIUM";
  if (rand < 0.8) return "HARD";
  return "INSANE";
}

main()
  .catch((error) => {
    console.error("[AI Mentor Seed] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
