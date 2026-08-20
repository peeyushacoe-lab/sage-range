import { describe, it, expect } from "vitest";
import {
  MAX_SCORE,
  KNIGHT_TIER_MIN_FRACTION,
  KNIGHT_TIER_LABEL,
  KNIGHT_TIER_BLURB,
  KNIGHT_TIER_COLOR,
  AWARD_LABEL,
  knightTier,
  decideKnightBadges,
  decideAwards,
  type OzhKnightTier,
} from "../src/lib/ozh-engine";

const pts = (fraction: number) => Math.round(fraction * MAX_SCORE);

describe("knightTier", () => {
  it("grades each band at its boundary", () => {
    expect(knightTier(pts(KNIGHT_TIER_MIN_FRACTION.GOLD))).toBe("GOLD");
    expect(knightTier(pts(KNIGHT_TIER_MIN_FRACTION.SILVER))).toBe("SILVER");
    expect(knightTier(pts(KNIGHT_TIER_MIN_FRACTION.BRONZE))).toBe("BRONZE");
  });

  it("puts a score one point below a boundary in the band beneath it", () => {
    expect(knightTier(pts(KNIGHT_TIER_MIN_FRACTION.GOLD) - 1)).toBe("SILVER");
    expect(knightTier(pts(KNIGHT_TIER_MIN_FRACTION.SILVER) - 1)).toBe("BRONZE");
    expect(knightTier(pts(KNIGHT_TIER_MIN_FRACTION.BRONZE) - 1)).toBe("IRON");
  });

  it("awards IRON for any positive score below bronze, including a single point", () => {
    expect(knightTier(1)).toBe("IRON");
  });

  // The badge has to be losable or it certifies nothing.
  it("awards nothing for a run that scored zero", () => {
    expect(knightTier(0)).toBeNull();
  });

  it("awards nothing for negative or non-finite scores", () => {
    expect(knightTier(-50)).toBeNull();
    expect(knightTier(Number.NaN)).toBeNull();
    expect(knightTier(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("guards against a zero maximum rather than dividing by it", () => {
    expect(knightTier(100, 0)).toBeNull();
  });

  // The bands are fractions precisely so a change to MAX_SCORE does not
  // silently re-grade everyone.
  it("tracks a different maximum", () => {
    expect(knightTier(90, 100)).toBe("GOLD");
    expect(knightTier(45, 100)).toBe("BRONZE");
  });

  it("gives a perfect run gold", () => {
    expect(knightTier(MAX_SCORE)).toBe("GOLD");
  });
});

describe("decideKnightBadges", () => {
  it("returns one badge per scoring run and skips the rest", () => {
    const badges = decideKnightBadges([
      { userId: "gold", score: MAX_SCORE },
      { userId: "iron", score: 5 },
      { userId: "blank", score: 0 },
    ]);
    expect(badges).toEqual([
      { userId: "gold", tier: "GOLD" },
      { userId: "iron", tier: "IRON" },
    ]);
  });

  it("is empty for an empty field", () => {
    expect(decideKnightBadges([])).toEqual([]);
  });

  // Unlike decideAwards, this grades each run on its own merits — a weak run
  // in a weak field still gets only what it earned.
  it("does not depend on the rest of the field", () => {
    const alone = decideKnightBadges([{ userId: "a", score: 300 }]);
    const crowded = decideKnightBadges([
      { userId: "a", score: 300 },
      { userId: "b", score: MAX_SCORE },
    ]);
    expect(alone[0]).toEqual(crowded[0]);
  });
});

describe("badge metadata", () => {
  const tiers: OzhKnightTier[] = ["GOLD", "SILVER", "BRONZE", "IRON"];

  it("has a label, blurb and colour for every tier", () => {
    for (const tier of tiers) {
      expect(KNIGHT_TIER_LABEL[tier]).toBeTruthy();
      expect(KNIGHT_TIER_BLURB[tier]).toBeTruthy();
      expect(KNIGHT_TIER_COLOR[tier]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("labels KNIGHT alongside the seven competitive awards", () => {
    expect(AWARD_LABEL.KNIGHT).toBeTruthy();
    expect(Object.keys(AWARD_LABEL)).toHaveLength(8);
  });

  it("orders the bands strictly, so no score can match two", () => {
    expect(KNIGHT_TIER_MIN_FRACTION.GOLD).toBeGreaterThan(KNIGHT_TIER_MIN_FRACTION.SILVER);
    expect(KNIGHT_TIER_MIN_FRACTION.SILVER).toBeGreaterThan(KNIGHT_TIER_MIN_FRACTION.BRONZE);
    expect(KNIGHT_TIER_MIN_FRACTION.BRONZE).toBeGreaterThan(0);
    expect(KNIGHT_TIER_MIN_FRACTION.GOLD).toBeLessThanOrEqual(1);
  });
});

describe("Knight badges and competitive awards stay independent", () => {
  const field = [
    { userId: "champ", score: 900, accuracy: 95, elapsedSeconds: 5000 },
    { userId: "mid", score: 500, accuracy: 60, elapsedSeconds: 7000 },
  ];
  const withPhases = field.map((r) => ({
    ...r,
    phaseScores: {
      TRIAGE: 0,
      INVESTIGATION: 0,
      HUNT: 0,
      RECONSTRUCTION: 0,
      RESPONSE: 0,
      REPORT: 0,
    },
  }));

  it("never issues KNIGHT through decideAwards", () => {
    const kinds = decideAwards(withPhases).map((a) => a.kind);
    expect(kinds).not.toContain("KNIGHT");
  });

  it("gives a badge to an analyst who won no award", () => {
    const winners = new Set(decideAwards(withPhases).map((a) => a.userId));
    const badges = decideKnightBadges(field);
    const mid = badges.find((b) => b.userId === "mid");
    expect(mid).toBeDefined();
    expect(winners.has("mid")).toBe(false);
  });
});
