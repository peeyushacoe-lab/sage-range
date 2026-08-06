/**
 * Playing out a season, for seeded and demo ladders.
 *
 * Written because the phase-3 seed used to assign a rating and a win/loss
 * record from two independent formulas — rating rising with the player index,
 * wins falling with it. The live ladder ended up with a top-rated player
 * holding one win and eleven losses, and nothing in the code disagreed,
 * because nothing required the two numbers to relate.
 *
 * The fix is structural rather than arithmetic: never state a rating and a
 * record separately. Give each player a hidden skill, decide matches by that
 * skill, and move ratings only through applyMatchResult — the same function
 * the real ladder uses. Every visible number is then a consequence of the same
 * process, so they cannot contradict each other.
 *
 * Pure and deterministic. No database imports, and no Math.random, so a seeded
 * ladder is reproducible rather than different on every run.
 */

import { BASE_RATING, applyMatchResult, expectedScore } from "@/lib/ranking";

/**
 * Matches each player gets, on average — roughly a 12-week season.
 *
 * Elo moves slowly from a flat start, and it is zero-sum: the pool's mean stays
 * at BASE_RATING however long it runs. A closed field therefore spreads across
 * two or three tiers rather than all six, which is the honest outcome. The old
 * seeded ladder showed four DIAMOND players in a ten-day-old season, and that
 * was one of the tells that its numbers were invented.
 */
export const DEFAULT_MATCHES_PER_PLAYER = 40;

/**
 * Small deterministic PRNG (mulberry32).
 *
 * Exported so callers can seed anything else that must line up with a
 * simulated ladder.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Standing = {
  rating: number;
  peakRating: number;
  wins: number;
  losses: number;
};

export type SimulationOptions = {
  /** Fixed seed. The same seed and count always produce the same ladder. */
  seed: number;
  matchesPerPlayer?: number;
};

/**
 * Play a season between `count` players.
 *
 * Returns standings in player order, not ladder order — the caller pairs them
 * with its own list of users, and re-sorting here would silently misalign them.
 */
export function simulateSeason(count: number, opts: SimulationOptions): Standing[] {
  if (count <= 0) return [];

  const rng = mulberry32(opts.seed);
  const matchesPer = opts.matchesPerPlayer ?? DEFAULT_MATCHES_PER_PLAYER;

  const standings: Standing[] = Array.from({ length: count }, () => ({
    rating: BASE_RATING,
    peakRating: BASE_RATING,
    wins: 0,
    losses: 0,
  }));

  // A single player has nobody to play, and inventing a record for them would
  // reintroduce exactly the inconsistency this module exists to prevent.
  if (count < 2) return standings;

  // Latent skill: wide enough to separate the field, noisy enough that the
  // finishing order is not simply the input order.
  const skill = Array.from({ length: count }, (_, i) => {
    const spread = i / (count - 1);
    return 850 + spread * 1250 + (rng() - 0.5) * 220;
  });

  // Shuffle, so skill does not track the caller's ordering. Without this the
  // seed's user list — sorted by account age — would hand the oldest account
  // the worst record every time, which reads as a judgement about a real
  // person rather than the arbitrary assignment it is.
  for (let i = skill.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [skill[i], skill[j]] = [skill[j], skill[i]];
  }

  const totalMatches = Math.round((count * matchesPer) / 2);

  for (let m = 0; m < totalMatches; m++) {
    const a = Math.floor(rng() * count);
    let b = Math.floor(rng() * count);
    if (a === b) b = (b + 1) % count;

    const aWins = rng() < expectedScore(skill[a], skill[b]);

    // Both sides are rated against each other's pre-match values, matching
    // recordMatchResult. Updating one first would let the second player be
    // rated against a rating that already moved because of this same match.
    const ratingA = standings[a].rating;
    const ratingB = standings[b].rating;

    const updA = applyMatchResult({
      rating: ratingA,
      opponentRating: ratingB,
      outcome: aWins ? "WIN" : "LOSS",
      eventsPlayed: standings[a].wins + standings[a].losses,
      peakRating: standings[a].peakRating,
    });
    const updB = applyMatchResult({
      rating: ratingB,
      opponentRating: ratingA,
      outcome: aWins ? "LOSS" : "WIN",
      eventsPlayed: standings[b].wins + standings[b].losses,
      peakRating: standings[b].peakRating,
    });

    standings[a] = {
      rating: updA.rating,
      peakRating: updA.peakRating,
      wins: standings[a].wins + (aWins ? 1 : 0),
      losses: standings[a].losses + (aWins ? 0 : 1),
    };
    standings[b] = {
      rating: updB.rating,
      peakRating: updB.peakRating,
      wins: standings[b].wins + (aWins ? 0 : 1),
      losses: standings[b].losses + (aWins ? 1 : 0),
    };
  }

  return standings;
}

/**
 * Spearman rank correlation between rating order and win-rate order.
 *
 * The single number that would have caught the original bug: the broken seed
 * produced a correlation of roughly -1, since rating rose exactly as the record
 * worsened. A healthy ladder sits well above zero.
 */
export function ratingRecordCorrelation(standings: readonly Standing[]): number {
  const played = standings.filter((s) => s.wins + s.losses > 0);
  const n = played.length;
  if (n < 2) return 1;

  const byRating = rankOrder(played.map((s) => s.rating));
  const byWinRate = rankOrder(played.map((s) => s.wins / (s.wins + s.losses)));

  const d2 = byRating.reduce((sum, r, i) => sum + (r - byWinRate[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

/** Average ranks, so ties do not bias the correlation. */
function rankOrder(values: readonly number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);

  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) j++;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = shared;
    i = j + 1;
  }
  return ranks;
}
