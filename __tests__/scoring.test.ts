import { describe, it, expect } from "vitest";
import {
  markWithPenalty,
  awardAfterPenalty,
  forfeited,
  weightedPoints,
  NEGATIVE_MARK_FRACTION,
  MIN_AWARD_FRACTION,
  WRONG_ATTEMPT_FRACTION,
  type MarkedQuestion,
  type MarkingOutcome,
} from "@/lib/scoring";

const q = (id: string, points = 1, requiresReview = false): MarkedQuestion => ({
  id,
  points,
  requiresReview,
});

const outcomes = (o: Record<string, MarkingOutcome>) => o;

describe("markWithPenalty", () => {
  const paper = [q("a"), q("b"), q("c"), q("d")];

  it("awards full marks for a clean paper", () => {
    const r = markWithPenalty(
      paper,
      outcomes({ a: "CORRECT", b: "CORRECT", c: "CORRECT", d: "CORRECT" }),
    );
    expect(r.score).toBe(100);
    expect(r.penalty).toBe(0);
  });

  it("subtracts for a wrong answer", () => {
    const r = markWithPenalty(
      paper,
      outcomes({ a: "CORRECT", b: "CORRECT", c: "CORRECT", d: "WRONG" }),
    );
    // 3 correct - 0.25 = 2.75 of 4
    expect(r.earned).toBe(2.75);
    expect(r.score).toBe(69);
    expect(r.wrong).toBe(1);
  });

  it("makes guessing worse than skipping", () => {
    const guessed = markWithPenalty(
      paper,
      outcomes({ a: "CORRECT", b: "CORRECT", c: "WRONG", d: "WRONG" }),
    );
    const skipped = markWithPenalty(
      paper,
      outcomes({ a: "CORRECT", b: "CORRECT", c: "SKIPPED", d: "SKIPPED" }),
    );
    // This is the whole point of the mechanic.
    expect(guessed.score).toBeLessThan(skipped.score);
  });

  it("does not penalise skipping", () => {
    const r = markWithPenalty(paper, outcomes({ a: "CORRECT" }));
    expect(r.penalty).toBe(0);
    expect(r.skipped).toBe(3);
    expect(r.earned).toBe(1);
  });

  it("floors a disastrous paper at zero rather than going negative", () => {
    const r = markWithPenalty(
      paper,
      outcomes({ a: "WRONG", b: "WRONG", c: "WRONG", d: "WRONG" }),
    );
    expect(r.earned).toBe(0);
    expect(r.score).toBe(0);
    // The raw penalty is still reported so a debrief can show what was lost.
    expect(r.penalty).toBe(1);
  });

  it("weights questions by their points", () => {
    const weighted = [q("a", 1), q("b", 4)];
    const r = markWithPenalty(weighted, outcomes({ a: "CORRECT", b: "WRONG" }));
    // 1 - (4 * 0.25) = 0 of 5 available
    expect(r.available).toBe(5);
    expect(r.earned).toBe(0);
  });

  it("excludes review questions from the available total", () => {
    const withText = [q("a"), q("b"), q("t", 1, true)];
    const r = markWithPenalty(withText, outcomes({ a: "CORRECT", b: "CORRECT" }));
    expect(r.available).toBe(2);
    expect(r.score).toBe(100);
  });

  it("treats a missing outcome as skipped, not wrong", () => {
    const r = markWithPenalty(paper, outcomes({}));
    expect(r.wrong).toBe(0);
    expect(r.skipped).toBe(4);
  });

  it("honours a custom penalty fraction", () => {
    const harsh = markWithPenalty(paper, outcomes({ a: "CORRECT", b: "WRONG" }), 1);
    // A full-point penalty wipes out the correct answer entirely.
    expect(harsh.earned).toBe(0);
  });

  it("handles an empty paper without dividing by zero", () => {
    const r = markWithPenalty([], outcomes({}));
    expect(r.score).toBe(0);
    expect(Number.isNaN(r.score)).toBe(false);
  });

  it("uses a quarter-point penalty by default", () => {
    expect(NEGATIVE_MARK_FRACTION).toBe(0.25);
  });
});

describe("awardAfterPenalty", () => {
  it("awards full points for a clean solve", () => {
    expect(awardAfterPenalty(200, 0)).toBe(200);
  });

  it("reduces the award with each wrong attempt", () => {
    const clean = awardAfterPenalty(200, 0);
    const one = awardAfterPenalty(200, 1);
    const three = awardAfterPenalty(200, 3);
    expect(one).toBeLessThan(clean);
    expect(three).toBeLessThan(one);
  });

  it("never falls below the floor, however many attempts", () => {
    const floor = 200 * MIN_AWARD_FRACTION;
    expect(awardAfterPenalty(200, 50)).toBe(floor);
    expect(awardAfterPenalty(200, 5000)).toBe(floor);
  });

  it("keeps persistence worth something", () => {
    // Someone who struggled and solved it still beats someone who did not.
    expect(awardAfterPenalty(200, 20)).toBeGreaterThan(0);
  });

  it("ignores negative or fractional attempt counts", () => {
    expect(awardAfterPenalty(200, -5)).toBe(200);
    expect(awardAfterPenalty(200, 1.9)).toBe(awardAfterPenalty(200, 1));
  });

  it("returns zero for a worthless item", () => {
    expect(awardAfterPenalty(0, 3)).toBe(0);
  });

  it("applies the documented per-attempt fraction", () => {
    // 100 base, one wrong attempt at 15% => 85
    expect(awardAfterPenalty(100, 1, { wrongFraction: WRONG_ATTEMPT_FRACTION })).toBe(85);
  });
});

describe("forfeited", () => {
  it("reports nothing lost on a clean solve", () => {
    expect(forfeited(200, 0)).toBe(0);
  });

  it("reports the gap for a messy solve", () => {
    expect(forfeited(200, 2)).toBe(200 - awardAfterPenalty(200, 2));
  });
});

describe("weightedPoints", () => {
  it("makes hard content worth disproportionately more", () => {
    expect(weightedPoints(100, "EASY")).toBe(100);
    expect(weightedPoints(100, "MEDIUM")).toBe(150);
    expect(weightedPoints(100, "HARD")).toBe(250);
    expect(weightedPoints(100, "INSANE")).toBe(400);
  });

  it("means one INSANE beats three EASY", () => {
    expect(weightedPoints(100, "INSANE")).toBeGreaterThan(3 * weightedPoints(100, "EASY"));
  });

  it("falls back to face value for an unknown difficulty", () => {
    expect(weightedPoints(100, "WHATEVER")).toBe(100);
  });
});
