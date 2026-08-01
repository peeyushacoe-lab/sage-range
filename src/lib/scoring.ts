/**
 * Negative marking and attempt penalties.
 *
 * The leaderboard was trivially climbable: every scored surface awarded full
 * points regardless of how many wrong answers preceded the right one, so
 * guessing was strictly better than thinking. These rules make a wrong choice
 * cost something.
 *
 * Pure functions with no database imports, for the usual reason — this decides
 * what appears on a public leaderboard, so it is tested directly rather than
 * inferred from clicking through a quiz.
 */

// ── Quiz and assessment negative marking ───────────────────────────────────

/** A wrong answer costs this fraction of the question's points. */
export const NEGATIVE_MARK_FRACTION = 0.25;

/**
 * Whether an unanswered question is penalised.
 *
 * It is not. Negative marking exists to make guessing worse than abstaining;
 * if skipping also cost points, the rational move would be to guess anyway and
 * the mechanic would achieve nothing.
 */
export const PENALISE_SKIPPED = false;

export type MarkedQuestion = {
  id: string;
  points?: number;
  /** TEXT questions are reviewed by a human and never auto-marked. */
  requiresReview?: boolean;
};

export type MarkingOutcome = "CORRECT" | "WRONG" | "SKIPPED" | "REVIEW";

export type MarkedResult = {
  /** Points earned after penalties, floored at zero across the paper. */
  earned: number;
  /** Points available from auto-markable questions. */
  available: number;
  /** 0-100. */
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  /** Raw points lost to wrong answers, before the floor is applied. */
  penalty: number;
};

/**
 * Mark a paper with negative marking applied.
 *
 * The total is floored at zero rather than allowed to go negative: a single
 * disastrous quiz should not drag down a learner's whole profile, and a
 * negative score on a percentage scale is not meaningful to display.
 */
export function markWithPenalty(
  questions: readonly MarkedQuestion[],
  outcomes: Readonly<Record<string, MarkingOutcome>>,
  fraction: number = NEGATIVE_MARK_FRACTION,
): MarkedResult {
  let earned = 0;
  let available = 0;
  let penalty = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  for (const q of questions) {
    const points = q.points ?? 1;
    if (q.requiresReview) continue;

    available += points;
    const outcome = outcomes[q.id] ?? "SKIPPED";

    if (outcome === "CORRECT") {
      earned += points;
      correct++;
    } else if (outcome === "WRONG") {
      const cost = points * fraction;
      penalty += cost;
      earned -= cost;
      wrong++;
    } else {
      skipped++;
      if (PENALISE_SKIPPED) {
        const cost = points * fraction;
        penalty += cost;
        earned -= cost;
      }
    }
  }

  const flooredEarned = Math.max(0, earned);
  const score = available === 0 ? 0 : Math.round((flooredEarned / available) * 100);

  return {
    earned: Math.round(flooredEarned * 100) / 100,
    available,
    score,
    correct,
    wrong,
    skipped,
    penalty: Math.round(penalty * 100) / 100,
  };
}

// ── Attempt penalties for task-based content ───────────────────────────────

/** Each wrong submission costs this fraction of the item's points. */
export const WRONG_ATTEMPT_FRACTION = 0.15;

/**
 * An item never falls below this fraction of its face value, however many
 * wrong attempts were made.
 *
 * Without a floor, a learner who struggled and then genuinely solved something
 * would earn nothing, which punishes persistence rather than guessing. The
 * floor keeps the item worth finishing while still ranking a clean solve well
 * above a brute-forced one.
 */
export const MIN_AWARD_FRACTION = 0.25;

/** Wrong attempts beyond this stop adding penalty — the floor is reached. */
export function awardAfterPenalty(
  basePoints: number,
  wrongAttempts: number,
  opts: { wrongFraction?: number; minFraction?: number } = {},
): number {
  const wrongFraction = opts.wrongFraction ?? WRONG_ATTEMPT_FRACTION;
  const minFraction = opts.minFraction ?? MIN_AWARD_FRACTION;

  if (basePoints <= 0) return 0;
  const wrong = Math.max(0, Math.floor(wrongAttempts));

  const penaltyFraction = Math.min(1, wrong * wrongFraction);
  const raw = basePoints * (1 - penaltyFraction);
  const floor = basePoints * minFraction;

  return Math.round(Math.max(floor, raw));
}

/** How much a learner forfeited, for display in a debrief. */
export function forfeited(basePoints: number, wrongAttempts: number): number {
  return Math.max(0, basePoints - awardAfterPenalty(basePoints, wrongAttempts));
}

// ── Difficulty weighting ───────────────────────────────────────────────────

/**
 * Multiplier applied to an item's face value by difficulty.
 *
 * Climbing the leaderboard on easy content should be slow; the gap between
 * EASY and INSANE is deliberately wide so that depth beats volume.
 */
export const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  EASY: 1,
  MEDIUM: 1.5,
  HARD: 2.5,
  INSANE: 4,
};

export function weightedPoints(basePoints: number, difficulty: string): number {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;
  return Math.round(basePoints * multiplier);
}
