import { db } from "./db";
import { Difficulty } from "@prisma/client";

const HINT_COOLDOWN_MIN = 5; // 5 minutes between hints per stage
const REPLAY_EXPIRY_DAYS = 90;

/**
 * Select best hint for a lab stage based on quality scores
 */
export async function getRecommendedHint(
  labId: string,
  stage: string,
  difficulty: Difficulty,
  attemptCount?: number
) {
  const hints = await db.labHint.findMany({
    where: { labId, stage },
    include: {
      lab: true,
      used: {
        where: { user: { role: "STUDENT" } },
        select: { qualityScore: true },
      },
    },
  });

  if (hints.length === 0) {
    return null;
  }

  // Filter by difficulty if multiple hints exist
  let candidateHints = hints;
  if (attemptCount && attemptCount > 2) {
    // After 2 attempts, allow harder hints
    candidateHints = hints.filter((h) => h.level <= 3);
  }

  if (candidateHints.length === 0) {
    candidateHints = hints;
  }

  // Sort by quality score (highest first)
  const hintWithQuality = await Promise.all(
    candidateHints.map(async (hint) => {
      const quality = await db.mentorHintQuality.findUnique({
        where: { hintId: hint.id },
      });
      return {
        ...hint,
        quality,
        avgScore: quality?.avgScore ?? 5.0,
      };
    })
  );

  hintWithQuality.sort((a, b) => b.avgScore - a.avgScore);

  return hintWithQuality[0];
}

/**
 * Check if hint was shown recently (within 5 minute cooldown)
 */
export async function checkHintFrequencyLimit(
  userId: string,
  labId: string,
  stage: string
): Promise<{ allowed: boolean; nextEligibleAt?: Date }> {
  const sequence = await db.mentorHintSequence.findUnique({
    where: { userId_labId_stage: { userId, labId, stage } },
  });

  if (!sequence) {
    return { allowed: true };
  }

  const cooldownMs = HINT_COOLDOWN_MIN * 60 * 1000;
  const now = new Date();
  const timeSinceLastHint = now.getTime() - sequence.lastShownAt.getTime();

  if (timeSinceLastHint < cooldownMs) {
    const nextEligibleAt = new Date(sequence.lastShownAt.getTime() + cooldownMs);
    return { allowed: false, nextEligibleAt };
  }

  return { allowed: true };
}

/**
 * Log hint shown to user, update frequency tracking
 */
export async function logHintShown(
  userId: string,
  labId: string,
  stage: string,
  hintId: string
) {
  const expiresAt = new Date(Date.now() + REPLAY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.mentorHintSequence.upsert({
    where: { userId_labId_stage: { userId, labId, stage } },
    create: {
      userId,
      labId,
      stage,
      shownHints: [hintId],
      lastShownAt: new Date(),
      expiresAt,
    },
    update: {
      shownHints: { push: hintId },
      lastShownAt: new Date(),
      expiresAt,
    },
  });
}

/**
 * Submit hint feedback and update quality scores
 */
export async function submitHintFeedback(
  usedHintId: string,
  score: number,
  wasHelpful: boolean
) {
  // Validate score
  if (score < 0 || score > 10 || !Number.isInteger(score)) {
    throw new Error("Invalid score: must be 0-10");
  }

  // Find and update UsedHint
  const usedHint = await db.usedHint.findUnique({
    where: { id: usedHintId },
    include: { hint: true, user: true },
  });

  if (!usedHint) {
    throw new Error("UsedHint not found");
  }

  // Update UsedHint with feedback
  const updated = await db.usedHint.update({
    where: { id: usedHintId },
    data: {
      qualityScore: score,
      wasHelpful,
    },
  });

  // Recompute quality scores for this hint
  await recomputeHintQuality(usedHint.hint.id);

  return updated;
}

/**
 * Recompute MentorHintQuality from all UsedHint entries
 */
export async function recomputeHintQuality(hintId: string) {
  const usedHints = await db.usedHint.findMany({
    where: { hintId },
  });

  if (usedHints.length === 0) {
    return;
  }

  // Calculate avgScore
  const ratedHints = usedHints.filter((h) => h.qualityScore !== null);
  const avgScore =
    ratedHints.length > 0
      ? ratedHints.reduce((sum, h) => sum + (h.qualityScore || 0), 0) / ratedHints.length
      : 5.0;

  // Count helpful/not helpful
  const helpfulCount = usedHints.filter((h) => h.wasHelpful === true).length;
  const notHelpfulCount = usedHints.filter((h) => h.wasHelpful === false).length;

  // Calculate submission rate
  const solvedAfterHint = usedHints.filter((h) => h.submissionLater).length;
  const submissionRate = (solvedAfterHint / usedHints.length) * 100;

  // Infer difficulty from contextDifficulty
  const difficulties = usedHints
    .filter((h) => h.contextDifficulty)
    .map((h) => h.contextDifficulty || "MEDIUM");
  const inferredDifficulty =
    difficulties.length > 0
      ? difficulties.sort().shift() || "MEDIUM"
      : "MEDIUM";

  await db.mentorHintQuality.upsert({
    where: { hintId },
    create: {
      hintId,
      avgScore,
      totalRatings: ratedHints.length,
      helpfulCount,
      notHelpfulCount,
      submissionRate,
      inferredDifficulty,
    },
    update: {
      avgScore,
      totalRatings: ratedHints.length,
      helpfulCount,
      notHelpfulCount,
      submissionRate,
      inferredDifficulty,
    },
  });
}

/**
 * Get all hints for a lab, grouped by stage with quality stats
 */
export async function getHintsByLab(labId: string) {
  const hints = await db.labHint.findMany({
    where: { labId },
    include: {
      used: {
        select: { qualityScore: true },
      },
    },
    orderBy: [{ stage: "asc" }, { level: "asc" }],
  });

  const hintsWithQuality = await Promise.all(
    hints.map(async (hint) => {
      const quality = await db.mentorHintQuality.findUnique({
        where: { hintId: hint.id },
      });
      return {
        id: hint.id,
        text: hint.text,
        level: hint.level,
        stage: hint.stage,
        pointCost: hint.pointCost,
        quality: quality || {
          avgScore: 5.0,
          helpfulCount: 0,
          submissionRate: 0,
        },
      };
    })
  );

  // Group by stage
  const grouped: Record<string, typeof hintsWithQuality> = {};
  hintsWithQuality.forEach((hint) => {
    if (!grouped[hint.stage]) {
      grouped[hint.stage] = [];
    }
    grouped[hint.stage].push(hint);
  });

  return grouped;
}

/**
 * Get top quality hints (leaderboard)
 */
export async function getTopQualityHints(limit = 50) {
  const hints = await db.mentorHintQuality.findMany({
    where: { totalRatings: { gte: 10 } }, // Only hints with >=10 ratings
    orderBy: { avgScore: "desc" },
    take: limit,
  });

  // Fetch full hint details
  const detailed = await Promise.all(
    hints.map(async (quality) => {
      const hint = await db.labHint.findUnique({
        where: { id: quality.hintId },
        include: { lab: true },
      });
      return {
        hintId: quality.hintId,
        labName: hint?.lab.title || "Unknown",
        stage: hint?.stage || "unknown",
        avgScore: quality.avgScore,
        helpfulCount: quality.helpfulCount,
        submissionRate: quality.submissionRate,
        totalRatings: quality.totalRatings,
      };
    })
  );

  return detailed;
}

/**
 * Get hints eligible for replay (>90 days since last shown)
 */
export async function getReplayEligibleHints(userId: string) {
  const sequences = await db.mentorHintSequence.findMany({
    where: {
      userId,
      expiresAt: { lte: new Date() }, // 90+ days have passed
    },
    include: {
      lab: {
        include: {
          hints: true,
        },
      },
    },
  });

  const eligible = sequences.map((seq) => ({
    labId: seq.labId,
    labTitle: seq.lab.title,
    stage: seq.stage,
    hintCount: seq.lab.hints.filter((h) => h.stage === seq.stage).length,
  }));

  return eligible;
}

/**
 * Expand hint expiry after user rates hint (reset 90-day timer)
 */
export async function expandHintExpiryAfterFeedback(
  userId: string,
  labId: string,
  stage: string
) {
  const newExpiresAt = new Date(Date.now() + REPLAY_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.mentorHintSequence.upsert({
    where: { userId_labId_stage: { userId, labId, stage } },
    create: {
      userId,
      labId,
      stage,
      shownHints: [],
      lastShownAt: new Date(),
      expiresAt: newExpiresAt,
    },
    update: {
      expiresAt: newExpiresAt,
    },
  });
}

/**
 * Background job: Recompute all hint quality scores daily
 */
export async function recomputeAllHintQualityScores() {
  const allHints = await db.labHint.findMany();

  for (const hint of allHints) {
    await recomputeHintQuality(hint.id);
  }

  console.log(`[AI Mentor] Recomputed quality scores for ${allHints.length} hints`);
}

/**
 * Background job: Clean up expired hint sequences (>90 days)
 */
export async function cleanupExpiredHintSequences() {
  const result = await db.mentorHintSequence.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  console.log(`[AI Mentor] Cleaned up ${result.count} expired hint sequences`);
}

/**
 * Mark hint as helpful after solution (for tracking submission rate)
 */
export async function markHintHelpfulAfterSolution(
  userId: string,
  hintId: string,
  timeTakenSec: number
) {
  const usedHint = await db.usedHint.findUnique({
    where: { userId_hintId: { userId, hintId } },
  });

  if (!usedHint) {
    throw new Error("UsedHint not found");
  }

  await db.usedHint.update({
    where: { id: usedHint.id },
    data: {
      submissionLater: true,
      timeThenSolvedSec: timeTakenSec,
    },
  });

  // Recompute quality to update submission rate
  await recomputeHintQuality(hintId);
}
