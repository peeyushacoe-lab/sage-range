/**
 * Grading for verified skill assessments and mock interviews.
 *
 * Pure functions, no database imports. These decide whether a credential is
 * issued, so the scoring rules are kept isolated and tested rather than
 * scattered through route handlers.
 */

import { NEGATIVE_MARK_FRACTION } from "@/lib/scoring";

export type AssessmentQuestion = {
  id: string;
  /** SINGLE picks one option; MULTI requires the exact set. */
  type: "SINGLE" | "MULTI" | "TEXT";
  /** Index or indices of the correct option(s). Unused for TEXT. */
  answer?: number | number[];
  points?: number;
};

export type AssessmentResponses = Record<string, unknown>;

export type GradedAssessment = {
  /** 0-100 percentage of available points earned. */
  score: number;
  earned: number;
  available: number;
  passed: boolean;
  /** Question ids answered correctly. */
  correct: string[];
  /** Question ids answered incorrectly or skipped. */
  incorrect: string[];
  /** Question ids left unanswered. Subset of `incorrect`, never penalised. */
  skipped: string[];
  /** Points deducted for wrong answers, before the score is floored at zero. */
  penalty: number;
  /** TEXT questions needing a human, excluded from the automatic score. */
  requiresReview: string[];
};

function sameSet(a: readonly number[], b: readonly number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Grade an attempt.
 *
 * TEXT questions cannot be graded automatically, so they are excluded from
 * both earned and available points. Scoring them as zero would make a
 * text-heavy assessment unpassable no matter how well the candidate did.
 */
export function gradeAssessment(
  questions: readonly AssessmentQuestion[],
  responses: AssessmentResponses,
  passingScore: number,
): GradedAssessment {
  const correct: string[] = [];
  const incorrect: string[] = [];
  const skipped: string[] = [];
  const requiresReview: string[] = [];

  let earned = 0;
  let available = 0;
  let penalty = 0;

  for (const q of questions) {
    const points = q.points ?? 1;
    const given = responses[q.id];

    if (q.type === "TEXT") {
      requiresReview.push(q.id);
      continue;
    }

    available += points;

    if (given === undefined || given === null) {
      // Unanswered, not wrong. Penalising a skip would make guessing the
      // rational move and defeat the point of negative marking.
      incorrect.push(q.id);
      skipped.push(q.id);
      continue;
    }

    let isCorrect = false;
    if (q.type === "SINGLE") {
      isCorrect = typeof given === "number" && given === q.answer;
    } else if (q.type === "MULTI") {
      const expected = Array.isArray(q.answer) ? q.answer : [];
      isCorrect = Array.isArray(given) && sameSet(given as number[], expected);
    }

    if (isCorrect) {
      earned += points;
      correct.push(q.id);
    } else {
      // Negative marking: a wrong answer costs a fraction of the question's
      // points, so guessing scores worse than leaving it blank.
      const cost = points * NEGATIVE_MARK_FRACTION;
      penalty += cost;
      earned -= cost;
      incorrect.push(q.id);
    }
  }

  // Floored at zero: a negative percentage is not meaningful to display, and
  // one bad paper should not drag a learner's whole profile down.
  const flooredEarned = Math.max(0, earned);

  // An assessment made entirely of TEXT questions has nothing to auto-score.
  const score = available === 0 ? 0 : Math.round((flooredEarned / available) * 100);

  return {
    score,
    earned: Math.round(flooredEarned * 100) / 100,
    available,
    passed: available > 0 && score >= passingScore,
    correct,
    incorrect,
    skipped,
    penalty: Math.round(penalty * 100) / 100,
    requiresReview,
  };
}

/** Whether an attempt ran past its time limit, with a small grace allowance. */
export function isExpired(
  startedAt: Date,
  timeLimitSec: number,
  now: Date = new Date(),
  graceSec = 30,
): boolean {
  const elapsed = (now.getTime() - startedAt.getTime()) / 1000;
  return elapsed > timeLimitSec + graceSec;
}

/** Seconds left on an attempt, floored at zero. */
export function remainingSeconds(
  startedAt: Date,
  timeLimitSec: number,
  now: Date = new Date(),
): number {
  const elapsed = (now.getTime() - startedAt.getTime()) / 1000;
  return Math.max(0, Math.floor(timeLimitSec - elapsed));
}

/**
 * Human-readable, reasonably unguessable credential code, e.g.
 * SV-DETECTION-2026-7QK4RM.
 */
export function credentialCode(domain: string, issuedAt: Date = new Date()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const slug = domain.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "GENERAL";
  return `SV-${slug}-${issuedAt.getUTCFullYear()}-${suffix}`;
}

/** Expiry for a newly issued credential; null means it never expires. */
export function credentialExpiry(
  validityDays: number | null | undefined,
  issuedAt: Date = new Date(),
): Date | null {
  if (!validityDays || validityDays <= 0) return null;
  const expires = new Date(issuedAt);
  expires.setUTCDate(expires.getUTCDate() + validityDays);
  return expires;
}

/**
 * Weighted score for a mock interview.
 *
 * Unanswered questions count as zero because skipping is a real interview
 * outcome, unlike an unmarked free-text question in an assessment.
 */
export function scoreInterview(
  questions: readonly { id: string; weight?: number }[],
  answerScores: Record<string, number | null | undefined>,
): number {
  if (questions.length === 0) return 0;

  let weighted = 0;
  let totalWeight = 0;

  for (const q of questions) {
    const weight = q.weight ?? 1;
    totalWeight += weight;
    const s = answerScores[q.id];
    if (typeof s === "number") {
      weighted += Math.max(0, Math.min(100, s)) * weight;
    }
  }

  return totalWeight === 0 ? 0 : Math.round(weighted / totalWeight);
}
