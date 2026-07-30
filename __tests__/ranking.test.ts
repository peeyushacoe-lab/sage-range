import { describe, it, expect } from "vitest";
import {
  BASE_RATING,
  RATING_FLOOR,
  kFactor,
  tierForRating,
  expectedScore,
  applyMatchResult,
  seasonCarryOver,
  assignRanks,
} from "@/lib/ranking";

describe("tierForRating", () => {
  it("maps each band to its tier", () => {
    expect(tierForRating(0)).toBe("BRONZE");
    expect(tierForRating(1199)).toBe("BRONZE");
    expect(tierForRating(1200)).toBe("SILVER");
    expect(tierForRating(1400)).toBe("GOLD");
    expect(tierForRating(1600)).toBe("PLATINUM");
    expect(tierForRating(1800)).toBe("DIAMOND");
    expect(tierForRating(2000)).toBe("MASTER");
    expect(tierForRating(9999)).toBe("MASTER");
  });

  it("is inclusive at the lower bound of every tier", () => {
    // Off-by-one here would silently demote everyone sitting exactly on a
    // threshold, which is the most visible number on their profile.
    expect(tierForRating(1200)).toBe("SILVER");
    expect(tierForRating(1199)).toBe("BRONZE");
  });

  it("never returns undefined for a negative rating", () => {
    expect(tierForRating(-500)).toBe("BRONZE");
  });
});

describe("expectedScore", () => {
  it("is even for equal ratings", () => {
    expect(expectedScore(1500, 1500)).toBeCloseTo(0.5, 10);
  });

  it("gives ~0.909 for a 400-point advantage", () => {
    expect(expectedScore(1900, 1500)).toBeCloseTo(0.909, 3);
  });

  it("is symmetric — both sides sum to 1", () => {
    expect(expectedScore(1720, 1310) + expectedScore(1310, 1720)).toBeCloseTo(1, 10);
  });
});

describe("kFactor", () => {
  it("moves provisional players fastest", () => {
    expect(kFactor(0, 1000)).toBe(40);
    expect(kFactor(9, 1000)).toBe(40);
  });

  it("settles established players", () => {
    expect(kFactor(10, 1000)).toBe(24);
  });

  it("damps the very top of the ladder hardest", () => {
    expect(kFactor(50, 2000)).toBe(16);
    expect(kFactor(50, 1999)).toBe(24);
  });
});

describe("applyMatchResult", () => {
  it("gains rating for beating an equal opponent", () => {
    const r = applyMatchResult({
      rating: 1500, opponentRating: 1500, outcome: "WIN", eventsPlayed: 20,
    });
    expect(r.delta).toBe(12); // 24 * (1 - 0.5)
    expect(r.rating).toBe(1512);
  });

  it("loses the same amount for the mirrored loss", () => {
    const r = applyMatchResult({
      rating: 1500, opponentRating: 1500, outcome: "LOSS", eventsPlayed: 20,
    });
    expect(r.rating).toBe(1488);
  });

  it("barely rewards beating a much weaker opponent", () => {
    const r = applyMatchResult({
      rating: 1900, opponentRating: 1500, outcome: "WIN", eventsPlayed: 20,
    });
    expect(r.delta).toBeGreaterThan(0);
    expect(r.delta).toBeLessThanOrEqual(3);
  });

  it("punishes losing to a much weaker opponent", () => {
    const r = applyMatchResult({
      rating: 1900, opponentRating: 1500, outcome: "LOSS", eventsPlayed: 20,
    });
    expect(r.delta).toBeLessThan(-15);
  });

  it("leaves a draw between equals unchanged", () => {
    const r = applyMatchResult({
      rating: 1500, opponentRating: 1500, outcome: "DRAW", eventsPlayed: 20,
    });
    expect(r.delta).toBe(0);
  });

  it("never falls below the floor over a long losing streak", () => {
    let rating = RATING_FLOOR + 5;
    for (let i = 0; i < 50; i++) {
      rating = applyMatchResult({
        rating, opponentRating: 2400, outcome: "LOSS", eventsPlayed: 100,
      }).rating;
      expect(rating).toBeGreaterThanOrEqual(RATING_FLOOR);
    }
    // Losing to a far stronger opponent costs ~nothing, so the rating settles
    // just above the floor rather than grinding down to it.
    expect(rating).toBeLessThanOrEqual(RATING_FLOOR + 5);
  });

  it("clamps at the floor when the drop would overshoot it", () => {
    const r = applyMatchResult({
      rating: RATING_FLOOR + 2, opponentRating: RATING_FLOOR + 2,
      outcome: "LOSS", eventsPlayed: 0,
    });
    // K=40 against an even opponent would subtract 20 and go below the floor.
    expect(r.rating).toBe(RATING_FLOOR);
    expect(r.tier).toBe("BRONZE");
  });

  it("recomputes tier alongside the rating", () => {
    const r = applyMatchResult({
      rating: 1396, opponentRating: 1500, outcome: "WIN", eventsPlayed: 5,
    });
    expect(r.rating).toBeGreaterThanOrEqual(1400);
    expect(r.tier).toBe("GOLD");
  });

  it("raises peak on a new high but keeps it through a slump", () => {
    const up = applyMatchResult({
      rating: 1500, opponentRating: 1500, outcome: "WIN", eventsPlayed: 20, peakRating: 1500,
    });
    expect(up.peakRating).toBe(1512);

    const down = applyMatchResult({
      rating: 1512, opponentRating: 1500, outcome: "LOSS", eventsPlayed: 20, peakRating: 1512,
    });
    expect(down.rating).toBeLessThan(1512);
    expect(down.peakRating).toBe(1512);
  });

  it("defaults peak to the current rating when unspecified", () => {
    const r = applyMatchResult({
      rating: 1500, opponentRating: 1500, outcome: "LOSS", eventsPlayed: 20,
    });
    expect(r.peakRating).toBe(1500);
  });

  it("returns integer ratings", () => {
    const r = applyMatchResult({
      rating: 1437, opponentRating: 1592, outcome: "WIN", eventsPlayed: 3,
    });
    expect(Number.isInteger(r.rating)).toBe(true);
  });
});

describe("seasonCarryOver", () => {
  it("halves the distance from base", () => {
    expect(seasonCarryOver(2000)).toBe(1500);
    expect(seasonCarryOver(600)).toBe(800);
  });

  it("leaves a base-rated player at base", () => {
    expect(seasonCarryOver(BASE_RATING)).toBe(BASE_RATING);
  });

  it("respects the floor", () => {
    expect(seasonCarryOver(RATING_FLOOR)).toBeGreaterThanOrEqual(RATING_FLOOR);
  });

  it("compresses the ladder — the spread shrinks", () => {
    const before = 2400 - 400;
    const after = seasonCarryOver(2400) - seasonCarryOver(400);
    expect(after).toBeLessThan(before);
  });
});

describe("assignRanks", () => {
  it("orders by rating descending", () => {
    const ranked = assignRanks([
      { id: "a", rating: 1200 },
      { id: "b", rating: 1800 },
      { id: "c", rating: 1500 },
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "c", "a"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("gives tied ratings the same rank without consuming a position", () => {
    const ranked = assignRanks([
      { id: "a", rating: 1500 },
      { id: "b", rating: 1500 },
      { id: "c", rating: 1400 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 1, 2]);
  });

  it("does not mutate the input array", () => {
    const input = [{ id: "a", rating: 1200 }, { id: "b", rating: 1800 }];
    const copy = [...input];
    assignRanks(input);
    expect(input).toEqual(copy);
  });

  it("handles an empty ladder", () => {
    expect(assignRanks([])).toEqual([]);
  });
});
