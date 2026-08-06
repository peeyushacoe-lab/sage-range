import { describe, it, expect } from "vitest";
import {
  simulateSeason,
  ratingRecordCorrelation,
  mulberry32,
  type Standing,
} from "@/lib/ladder-simulation";
import { BASE_RATING, RATING_FLOOR, tierForRating } from "@/lib/ranking";
import { assignRanks } from "@/lib/ranking";

const SEED = 20260727;
const sim = (count: number, seed = SEED) => simulateSeason(count, { seed });

describe("ladder simulation — determinism", () => {
  it("produces the same ladder for the same seed", () => {
    expect(sim(12)).toEqual(sim(12));
  });

  it("produces a different ladder for a different seed", () => {
    expect(sim(12, 1)).not.toEqual(sim(12, 2));
  });

  it("returns standings in player order, not ladder order", () => {
    // The caller zips these against its own user list. Sorting here would
    // silently give every player someone else's record.
    const standings = sim(20);
    const ratings = standings.map((s) => s.rating);
    const sorted = [...ratings].sort((a, b) => b - a);
    expect(ratings).not.toEqual(sorted);
  });

  it("gives a well-distributed PRNG", () => {
    const rng = mulberry32(SEED);
    const draws = Array.from({ length: 2000 }, () => rng());
    expect(Math.min(...draws)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...draws)).toBeLessThan(1);
    const mean = draws.reduce((a, b) => a + b, 0) / draws.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe("ladder simulation — internal consistency", () => {
  /**
   * The regression test. The old seed assigned rating and record from
   * independent formulas pointing opposite ways, so the top-rated player had
   * one win and eleven losses. Nothing threw; the ladder simply lied.
   */
  it("ranks players in an order their records support", () => {
    const standings = sim(20);
    const correlation = ratingRecordCorrelation(standings);
    expect(correlation).toBeGreaterThan(0.6);
  });

  it("scores the old broken pattern as the contradiction it was", () => {
    // rating rising as the record worsens — exactly what shipped.
    const broken: Standing[] = Array.from({ length: 10 }, (_, i) => ({
      rating: 900 + i * 130,
      peakRating: 900 + i * 130,
      wins: 12 - i,
      losses: i,
    }));
    expect(ratingRecordCorrelation(broken)).toBeLessThan(-0.9);
  });

  it("puts the best record at or near the top of the ladder", () => {
    const standings = sim(20);
    const bestRecord = [...standings].sort(
      (a, b) => b.wins / (b.wins + b.losses || 1) - a.wins / (a.wins + a.losses || 1),
    )[0];
    const ladder = assignRanks(standings.map((s, i) => ({ ...s, i })));
    const placing = ladder.findIndex((p) => p.rating === bestRecord.rating);
    expect(placing).toBeLessThan(5);
  });

  it("never reports a peak below the current rating", () => {
    for (const s of sim(24)) {
      expect(s.peakRating).toBeGreaterThanOrEqual(s.rating);
    }
  });

  it("lets someone finish below their peak", () => {
    // If peak always equalled rating, the column would be decorative — and
    // that equality was one of the tells that the old data was fabricated.
    const standings = sim(24);
    expect(standings.some((s) => s.peakRating > s.rating)).toBe(true);
  });

  it("plays every player and counts their matches honestly", () => {
    for (const s of sim(20)) {
      const played = s.wins + s.losses;
      expect(played).toBeGreaterThan(0);
      expect(Number.isInteger(played)).toBe(true);
    }
  });

  it("conserves results — every win is somebody's loss", () => {
    const standings = sim(20);
    const wins = standings.reduce((n, s) => n + s.wins, 0);
    const losses = standings.reduce((n, s) => n + s.losses, 0);
    expect(wins).toBe(losses);
  });

  it("does not give every player an identical match count", () => {
    // The old data had all ten on exactly 12 events, which is not what a
    // season of real play looks like.
    const played = sim(20).map((s) => s.wins + s.losses);
    expect(new Set(played).size).toBeGreaterThan(1);
  });

  it("keeps ratings inside the bounds the rating engine promises", () => {
    for (const s of sim(24)) {
      expect(s.rating).toBeGreaterThanOrEqual(RATING_FLOOR);
      expect(s.rating).toBeLessThan(3000);
    }
  });

  it("does not lay ratings out on a straight line", () => {
    // An arithmetic progression is the signature of generated data.
    const sorted = sim(20).map((s) => s.rating).sort((a, b) => b - a);
    const gaps = sorted.slice(1).map((r, i) => sorted[i] - r);
    expect(new Set(gaps).size).toBeGreaterThan(3);
  });
});

describe("ladder simulation — spread", () => {
  it("separates the field rather than leaving everyone at base rating", () => {
    const ratings = sim(20).map((s) => s.rating);
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeGreaterThan(200);
  });

  it("populates more than one tier", () => {
    // Two or three, not six. Elo is zero-sum, so a closed pool's mean stays at
    // BASE_RATING and the field cannot all climb. A seeded ladder claiming a
    // row of DIAMOND players is claiming something the maths does not allow.
    const tiers = new Set(sim(24).map((s) => tierForRating(s.rating)));
    expect(tiers.size).toBeGreaterThanOrEqual(2);
  });
});

describe("ladder simulation — edge cases", () => {
  it("returns nothing for an empty field", () => {
    expect(sim(0)).toEqual([]);
  });

  it("leaves a lone player unrated rather than inventing a record", () => {
    const [only] = sim(1);
    expect(only).toEqual({
      rating: BASE_RATING,
      peakRating: BASE_RATING,
      wins: 0,
      losses: 0,
    });
  });

  it("handles two players without pairing anyone against themselves", () => {
    const standings = sim(2);
    expect(standings).toHaveLength(2);
    expect(standings[0].wins + standings[0].losses).toBeGreaterThan(0);
    expect(standings[0].wins).toBe(standings[1].losses);
  });

  it("treats an unplayed field as trivially consistent", () => {
    expect(ratingRecordCorrelation([])).toBe(1);
    expect(ratingRecordCorrelation(sim(1))).toBe(1);
  });
});
