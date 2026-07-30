import { describe, it, expect } from "vitest";
import {
  nextPowerOfTwo,
  roundCount,
  seedOrder,
  buildSingleEliminationBracket,
  nextSlot,
  propagateWinners,
  type Seeded,
} from "@/lib/bracket";

const entrants = (n: number): Seeded[] =>
  Array.from({ length: n }, (_, i) => ({ entrantId: `e${i + 1}`, seed: i + 1 }));

describe("nextPowerOfTwo", () => {
  it("returns exact powers unchanged", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(8)).toBe(8);
    expect(nextPowerOfTwo(16)).toBe(16);
  });

  it("rounds up otherwise", () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
    expect(nextPowerOfTwo(17)).toBe(32);
  });

  it("handles degenerate input", () => {
    expect(nextPowerOfTwo(0)).toBe(1);
  });
});

describe("roundCount", () => {
  it("counts rounds to a single winner", () => {
    expect(roundCount(2)).toBe(1);
    expect(roundCount(4)).toBe(2);
    expect(roundCount(8)).toBe(3);
    expect(roundCount(16)).toBe(4);
  });

  it("rounds a partial field up to its bracket size", () => {
    expect(roundCount(5)).toBe(3);  // padded to 8
    expect(roundCount(12)).toBe(4); // padded to 16
  });

  it("is zero for a field that cannot play", () => {
    expect(roundCount(1)).toBe(0);
    expect(roundCount(0)).toBe(0);
  });
});

describe("seedOrder", () => {
  it("produces the standard 8-entry order", () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("produces the standard 4-entry order", () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
  });

  it("pairs top seed against bottom seed", () => {
    const order = seedOrder(16);
    expect([order[0], order[1]]).toEqual([1, 16]);
  });

  it("keeps seeds 1 and 2 apart until the final", () => {
    // They must land in opposite halves of the bracket.
    for (const size of [4, 8, 16, 32]) {
      const order = seedOrder(size);
      expect(order.indexOf(1)).toBeLessThan(size / 2);
      expect(order.indexOf(2)).toBeGreaterThanOrEqual(size / 2);
    }
  });

  it("contains every seed exactly once", () => {
    const order = seedOrder(16);
    expect(new Set(order).size).toBe(16);
    expect([...order].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
  });

  it("rejects a non-power-of-two size", () => {
    expect(() => seedOrder(6)).toThrow(/power of two/);
  });
});

describe("buildSingleEliminationBracket", () => {
  it("returns nothing for a field too small to play", () => {
    expect(buildSingleEliminationBracket([])).toEqual([]);
    expect(buildSingleEliminationBracket(entrants(1))).toEqual([]);
  });

  it("builds a full 8-entrant bracket with no byes", () => {
    const matches = buildSingleEliminationBracket(entrants(8));
    expect(matches.filter((m) => m.round === 1)).toHaveLength(4);
    expect(matches.filter((m) => m.round === 2)).toHaveLength(2);
    expect(matches.filter((m) => m.round === 3)).toHaveLength(1);
    expect(matches).toHaveLength(7); // n-1 matches decide n entrants
    expect(matches.every((m) => m.round > 1 || m.winnerId === null)).toBe(true);
  });

  it("pairs 1v8 and 4v5 in the opening round", () => {
    const r1 = buildSingleEliminationBracket(entrants(8)).filter((m) => m.round === 1);
    expect([r1[0].entrantAId, r1[0].entrantBId]).toEqual(["e1", "e8"]);
    expect([r1[1].entrantAId, r1[1].entrantBId]).toEqual(["e4", "e5"]);
  });

  it("gives byes to the top seeds when the field is short", () => {
    // 5 entrants padded to 8: seeds 6,7,8 are absent.
    const matches = buildSingleEliminationBracket(entrants(5));
    const r1 = matches.filter((m) => m.round === 1);
    expect(r1).toHaveLength(4);

    const byes = r1.filter((m) => m.winnerId !== null);
    expect(byes).toHaveLength(3);
    // Seed 1 must be among those advancing for free.
    expect(byes.map((b) => b.winnerId)).toContain("e1");
  });

  it("never pre-resolves a match with two real entrants", () => {
    const matches = buildSingleEliminationBracket(entrants(5));
    for (const m of matches.filter((x) => x.round === 1)) {
      if (m.entrantAId && m.entrantBId) expect(m.winnerId).toBeNull();
    }
  });

  it("gives every match a unique round/position", () => {
    const matches = buildSingleEliminationBracket(entrants(12));
    const keys = matches.map((m) => `${m.round}:${m.position}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("places every entrant exactly once in round 1", () => {
    for (const n of [2, 3, 5, 8, 12, 16]) {
      const r1 = buildSingleEliminationBracket(entrants(n)).filter((m) => m.round === 1);
      const placed = r1.flatMap((m) => [m.entrantAId, m.entrantBId]).filter(Boolean);
      expect(new Set(placed).size).toBe(n);
    }
  });
});

describe("nextSlot", () => {
  it("feeds adjacent matches into one slot each", () => {
    expect(nextSlot(1, 1, 3)).toEqual({ round: 2, position: 1, slot: "A" });
    expect(nextSlot(1, 2, 3)).toEqual({ round: 2, position: 1, slot: "B" });
    expect(nextSlot(1, 3, 3)).toEqual({ round: 2, position: 2, slot: "A" });
    expect(nextSlot(1, 4, 3)).toEqual({ round: 2, position: 2, slot: "B" });
  });

  it("returns null for the final", () => {
    expect(nextSlot(3, 1, 3)).toBeNull();
  });
});

describe("propagateWinners", () => {
  it("advances a reported winner into the next round", () => {
    const matches = buildSingleEliminationBracket(entrants(8));
    matches[0].winnerId = "e1"; // round 1, position 1

    const out = propagateWinners(matches);
    const r2p1 = out.find((m) => m.round === 2 && m.position === 1)!;
    expect(r2p1.entrantAId).toBe("e1");
    expect(r2p1.entrantBId).toBeNull();
    expect(r2p1.winnerId).toBeNull(); // opponent not decided yet
  });

  it("fills both slots once both feeders are decided", () => {
    const matches = buildSingleEliminationBracket(entrants(8));
    matches[0].winnerId = "e1";
    matches[1].winnerId = "e4";

    const r2p1 = propagateWinners(matches).find((m) => m.round === 2 && m.position === 1)!;
    expect(r2p1.entrantAId).toBe("e1");
    expect(r2p1.entrantBId).toBe("e4");
    expect(r2p1.winnerId).toBeNull();
  });

  it("carries round-1 byes forward automatically", () => {
    const matches = propagateWinners(buildSingleEliminationBracket(entrants(5)));
    // Seed 1 had a bye, so it should already occupy a round-2 slot.
    const round2 = matches.filter((m) => m.round === 2);
    const seeded = round2.flatMap((m) => [m.entrantAId, m.entrantBId]);
    expect(seeded).toContain("e1");
  });

  it("does not mutate the input", () => {
    const matches = buildSingleEliminationBracket(entrants(8));
    matches[0].winnerId = "e1";
    const snapshot = JSON.stringify(matches);
    propagateWinners(matches);
    expect(JSON.stringify(matches)).toBe(snapshot);
  });

  it("drives a full 8-entrant bracket to a single champion", () => {
    let matches = buildSingleEliminationBracket(entrants(8));
    const totalRounds = 3;

    for (let round = 1; round <= totalRounds; round++) {
      matches = matches.map((m) =>
        m.round === round && m.entrantAId && !m.winnerId
          ? { ...m, winnerId: m.entrantAId } // higher seed always wins
          : m,
      );
      matches = propagateWinners(matches);
    }

    const final = matches.find((m) => m.round === totalRounds)!;
    expect(final.winnerId).toBe("e1");
  });
});
