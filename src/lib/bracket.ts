/**
 * Single-elimination bracket construction and progression.
 *
 * Pure functions, no database imports. Bracket maths is unusually easy to get
 * subtly wrong — byes, non-power-of-two fields and winner propagation are the
 * classic failure points — so all of it lives here behind unit tests.
 */

export type Seeded = { entrantId: string; seed: number };

export type BracketMatch = {
  round: number;
  position: number;
  entrantAId: string | null;
  entrantBId: string | null;
  /** Pre-resolved when one side has a bye in round 1. */
  winnerId: string | null;
};

/** Smallest power of two greater than or equal to n (minimum 1). */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  return 2 ** Math.ceil(Math.log2(n));
}

/** Number of rounds needed to reduce `entrantCount` to a single winner. */
export function roundCount(entrantCount: number): number {
  if (entrantCount <= 1) return 0;
  return Math.log2(nextPowerOfTwo(entrantCount));
}

/**
 * Standard seeding order for a bracket of `size` (a power of two).
 *
 * Produces the classic pairing where the strongest and weakest seeds meet
 * first and the top two seeds can only meet in the final: for size 8 the
 * order is [1,8,4,5,2,7,3,6], read as consecutive pairs.
 */
export function seedOrder(size: number): number[] {
  if (size < 1 || (size & (size - 1)) !== 0) {
    throw new Error(`seedOrder requires a power of two, received ${size}`);
  }

  let order = [1];
  while (order.length < size) {
    const round = order.length * 2 + 1;
    const next: number[] = [];
    for (const seed of order) {
      next.push(seed, round - seed);
    }
    order = next;
  }
  return order;
}

/**
 * Build every match of a single-elimination bracket.
 *
 * Entrants are padded up to a power of two with byes. A round-1 match against
 * a bye is emitted with its winner already set, so the top seeds advance
 * without a phantom fixture needing to be played.
 */
export function buildSingleEliminationBracket(
  entrants: readonly Seeded[],
): BracketMatch[] {
  if (entrants.length < 2) return [];

  const ordered = [...entrants].sort((a, b) => a.seed - b.seed);
  const size = nextPowerOfTwo(ordered.length);

  // seedNumber -> entrantId, with absent seeds meaning a bye.
  const bySeed = new Map<number, string>();
  ordered.forEach((e, i) => bySeed.set(i + 1, e.entrantId));

  const order = seedOrder(size);
  const matches: BracketMatch[] = [];

  // Round 1 from the seeding order, two seeds per match.
  for (let i = 0; i < order.length; i += 2) {
    const a = bySeed.get(order[i]) ?? null;
    const b = bySeed.get(order[i + 1]) ?? null;
    matches.push({
      round: 1,
      position: i / 2 + 1,
      entrantAId: a,
      entrantBId: b,
      // Exactly one side missing is a bye; both missing stays empty.
      winnerId: a && !b ? a : b && !a ? b : null,
    });
  }

  // Later rounds are empty shells filled in as winners are reported.
  const totalRounds = roundCount(ordered.length);
  for (let round = 2; round <= totalRounds; round++) {
    const count = size / 2 ** round;
    for (let position = 1; position <= count; position++) {
      matches.push({
        round,
        position,
        entrantAId: null,
        entrantBId: null,
        winnerId: null,
      });
    }
  }

  return matches;
}

/**
 * Where a winner goes next.
 *
 * Two adjacent matches feed one match in the following round; the lower
 * position takes slot A, the higher takes slot B. Returns null for the final,
 * which has nowhere to advance to.
 */
export function nextSlot(
  round: number,
  position: number,
  totalRounds: number,
): { round: number; position: number; slot: "A" | "B" } | null {
  if (round >= totalRounds) return null;
  return {
    round: round + 1,
    position: Math.ceil(position / 2),
    slot: position % 2 === 1 ? "A" : "B",
  };
}

/**
 * Propagate every already-decided result through the bracket.
 *
 * Applied repeatedly so a chain of byes advances a seed through several rounds
 * in one pass. Returns a new array; the input is not mutated.
 */
export function propagateWinners(matches: readonly BracketMatch[]): BracketMatch[] {
  const totalRounds = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const byKey = new Map<string, BracketMatch>();
  const result = matches.map((m) => ({ ...m }));
  for (const m of result) byKey.set(`${m.round}:${m.position}`, m);

  for (let round = 1; round < totalRounds; round++) {
    for (const match of result.filter((m) => m.round === round)) {
      if (!match.winnerId) continue;

      const target = nextSlot(match.round, match.position, totalRounds);
      if (!target) continue;

      const next = byKey.get(`${target.round}:${target.position}`);
      if (!next) continue;

      if (target.slot === "A") next.entrantAId = match.winnerId;
      else next.entrantBId = match.winnerId;

      // A bye carried into the next round decides that match too.
      if (next.entrantAId && !next.entrantBId && isByeAdvance(result, next, "B")) {
        next.winnerId = next.entrantAId;
      } else if (next.entrantBId && !next.entrantAId && isByeAdvance(result, next, "A")) {
        next.winnerId = next.entrantBId;
      }
    }
  }

  return result;
}

/**
 * True when the feeder match for `slot` can never supply an entrant, i.e. both
 * of its sides were byes. Distinguishes "opponent will arrive later" from
 * "there is no opponent".
 */
function isByeAdvance(
  matches: readonly BracketMatch[],
  match: BracketMatch,
  slot: "A" | "B",
): boolean {
  const feederPosition = match.position * 2 - (slot === "A" ? 1 : 0);
  const feeder = matches.find(
    (m) => m.round === match.round - 1 && m.position === feederPosition,
  );
  if (!feeder) return false;
  return !feeder.entrantAId && !feeder.entrantBId;
}
