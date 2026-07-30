/**
 * Elo rating and tier derivation for ranked seasons.
 *
 * Pure functions, no database imports — the ladder is the most visible number
 * on the platform and a silent arithmetic error is hard to notice and painful
 * to reverse once ratings have drifted.
 */

import type { Tier } from "@prisma/client";

/** Every player starts here; also the floor a new season resets toward. */
export const BASE_RATING = 1000;

/** Ratings never fall below this, so a losing streak cannot go negative. */
export const RATING_FLOOR = 100;

/**
 * Lower bound of each tier, highest first. Order matters: `tierForRating`
 * returns the first tier whose threshold the rating meets.
 */
const TIER_THRESHOLDS: ReadonlyArray<readonly [Tier, number]> = [
  ["MASTER", 2000],
  ["DIAMOND", 1800],
  ["PLATINUM", 1600],
  ["GOLD", 1400],
  ["SILVER", 1200],
  ["BRONZE", 0],
] as const;

/**
 * Provisional players move fast so they reach their true rating quickly;
 * established players move slowly so the top of the ladder stays stable.
 */
export function kFactor(eventsPlayed: number, rating: number): number {
  if (eventsPlayed < 10) return 40;
  if (rating >= 2000) return 16;
  return 24;
}

/** Tier for a rating. Values below the lowest threshold fall back to BRONZE. */
export function tierForRating(rating: number): Tier {
  for (const [tier, floor] of TIER_THRESHOLDS) {
    if (rating >= floor) return tier;
  }
  return "BRONZE";
}

/**
 * Probability that `rating` beats `opponentRating`, per the standard Elo
 * logistic curve. Equal ratings give 0.5; a 400-point edge gives ~0.909.
 */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export type RatingOutcome = "WIN" | "LOSS" | "DRAW";

export type RatingUpdate = {
  rating: number;
  tier: Tier;
  delta: number;
  peakRating: number;
};

/**
 * Apply one result to a player's rating.
 *
 * `peakRating` only ever rises, so a player's best-ever placing survives a
 * later slump.
 */
export function applyMatchResult(params: {
  rating: number;
  opponentRating: number;
  outcome: RatingOutcome;
  eventsPlayed: number;
  peakRating?: number;
}): RatingUpdate {
  const { rating, opponentRating, outcome, eventsPlayed } = params;
  const peak = params.peakRating ?? rating;

  const actual = outcome === "WIN" ? 1 : outcome === "DRAW" ? 0.5 : 0;
  const k = kFactor(eventsPlayed, rating);

  const raw = rating + k * (actual - expectedScore(rating, opponentRating));
  const next = Math.max(RATING_FLOOR, Math.round(raw));

  return {
    rating: next,
    tier: tierForRating(next),
    delta: next - rating,
    peakRating: Math.max(peak, next),
  };
}

/**
 * Rating carried into the next season: pulled toward BASE_RATING so the ladder
 * recompresses, while still rewarding a strong previous season.
 */
export function seasonCarryOver(finalRating: number): number {
  const carried = BASE_RATING + (finalRating - BASE_RATING) / 2;
  return Math.max(RATING_FLOOR, Math.round(carried));
}

/**
 * Assign dense ranks (1,2,2,3) over rated players, highest rating first.
 * Ties share a rank rather than consuming positions, so two players on 1500
 * are both 2nd and the next player is 3rd.
 */
export function assignRanks<T extends { rating: number }>(
  players: readonly T[],
): Array<T & { rank: number }> {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);

  let rank = 0;
  let previousRating: number | null = null;

  return sorted.map((player) => {
    if (player.rating !== previousRating) {
      rank += 1;
      previousRating = player.rating;
    }
    return { ...player, rank };
  });
}
