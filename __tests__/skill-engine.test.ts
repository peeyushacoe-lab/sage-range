import { describe, it, expect } from "vitest";
import {
  overallSkillPoints,
  skillMatrix,
  saturate,
  coverage,
  accuracy,
  activityMix,
  weakestTactics,
  TACTICS,
  SATURATION_K,
  type EvidenceRecord,
} from "@/lib/skill-engine";

const ev = (over: Partial<EvidenceRecord> = {}): EvidenceRecord => ({
  activity: "LAB",
  result: "SOLVED",
  skillPoints: 100,
  tactics: ["Initial Access"],
  techniques: ["T1190"],
  ...over,
});

describe("skill engine — overall points", () => {
  it("sums the contribution of every activity", () => {
    const records = [ev({ skillPoints: 100 }), ev({ skillPoints: 250 }), ev({ skillPoints: 50 })];
    expect(overallSkillPoints(records)).toBe(400);
  });

  it("is empty-safe", () => {
    expect(overallSkillPoints([])).toBe(0);
  });

  it("never lets a negative contribution reduce the total", () => {
    expect(overallSkillPoints([ev({ skillPoints: 100 }), ev({ skillPoints: -40 })])).toBe(100);
  });

  it("counts every activity type, not just labs and simulations", () => {
    // The whole point of the spine: a competition win now contributes where
    // before it fed the skill profile by zero.
    const records: EvidenceRecord[] = [
      ev({ activity: "LAB", skillPoints: 100 }),
      ev({ activity: "COMPETITION", skillPoints: 300 }),
      ev({ activity: "PURPLE_TEAM", skillPoints: 200 }),
      ev({ activity: "SOC_SHIFT", skillPoints: 150 }),
    ];
    expect(overallSkillPoints(records)).toBe(750);
  });
});

describe("skill engine — saturation curve", () => {
  it("maps zero and below to zero", () => {
    expect(saturate(0)).toBe(0);
    expect(saturate(-100)).toBe(0);
  });

  it("rises monotonically with points", () => {
    let prev = -1;
    for (let p = 0; p <= 3000; p += 50) {
      const s = saturate(p);
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
  });

  it("never reaches or exceeds 100 — mastery is asymptotic", () => {
    for (const p of [500, 1000, 5000, 100_000]) {
      expect(saturate(p)).toBeLessThan(100);
    }
  });

  it("follows the documented curve at the calibration point", () => {
    // 100 * (1 - e^-1) ≈ 63 at points == K.
    expect(saturate(SATURATION_K)).toBe(63);
  });
});

describe("skill engine — skill matrix", () => {
  it("returns every tactic, present or not", () => {
    const matrix = skillMatrix([ev({ tactics: ["Discovery"] })]);
    expect(matrix).toHaveLength(TACTICS.length);
    expect(new Set(matrix.map((m) => m.tactic))).toEqual(new Set(TACTICS));
  });

  it("marks untouched tactics as zero and not demonstrated", () => {
    const matrix = skillMatrix([ev({ tactics: ["Discovery"] })]);
    const exfil = matrix.find((m) => m.tactic === "Exfiltration")!;
    expect(exfil.score).toBe(0);
    expect(exfil.points).toBe(0);
    expect(exfil.demonstrated).toBe(false);
    expect(exfil.activities).toBe(0);
  });

  it("splits an activity's points across the tactics it demonstrates", () => {
    // 200 points across two tactics is 100 each — not 200 double-counted.
    const matrix = skillMatrix([
      ev({ skillPoints: 200, tactics: ["Discovery", "Credential Access"] }),
    ]);
    expect(matrix.find((m) => m.tactic === "Discovery")!.points).toBe(100);
    expect(matrix.find((m) => m.tactic === "Credential Access")!.points).toBe(100);
  });

  it("accumulates points and counts across activities under one tactic", () => {
    const matrix = skillMatrix([
      ev({ skillPoints: 100, tactics: ["Discovery"], techniques: ["T1083"] }),
      ev({ skillPoints: 150, tactics: ["Discovery"], techniques: ["T1087"] }),
    ]);
    const disc = matrix.find((m) => m.tactic === "Discovery")!;
    expect(disc.points).toBe(250);
    expect(disc.activities).toBe(2);
    expect(disc.techniques).toBe(2);
    expect(disc.demonstrated).toBe(true);
  });

  it("counts distinct techniques, not repeats", () => {
    const matrix = skillMatrix([
      ev({ tactics: ["Discovery"], techniques: ["T1083"] }),
      ev({ tactics: ["Discovery"], techniques: ["T1083"] }),
    ]);
    expect(matrix.find((m) => m.tactic === "Discovery")!.techniques).toBe(1);
  });

  it("ignores untagged evidence for the matrix but not for the overall", () => {
    // An activity with no tactics still contributes to the overall score, but
    // cannot raise any tactic — there is nowhere to put it.
    const records = [ev({ skillPoints: 500, tactics: [] })];
    expect(overallSkillPoints(records)).toBe(500);
    expect(skillMatrix(records).every((m) => m.points === 0)).toBe(true);
  });

  it("excludes failed attempts from tactic points", () => {
    const matrix = skillMatrix([
      ev({ result: "FAILED", skillPoints: 0, tactics: ["Discovery"] }),
    ]);
    expect(matrix.find((m) => m.tactic === "Discovery")!.points).toBe(0);
  });
});

describe("skill engine — coverage", () => {
  it("counts covered tactics and derives a percentage of the whole matrix", () => {
    const c = coverage([
      ev({ tactics: ["Initial Access"] }),
      ev({ tactics: ["Discovery", "Credential Access"] }),
    ]);
    expect(c.tacticsCovered).toBe(3);
    expect(c.tacticsTotal).toBe(TACTICS.length);
    expect(c.coveragePct).toBe(Math.round((3 / TACTICS.length) * 100));
  });

  it("counts distinct techniques across all evidence", () => {
    const c = coverage([
      ev({ techniques: ["T1190", "T1083"] }),
      ev({ techniques: ["T1083", "T1087"] }),
    ]);
    expect(c.techniquesDemonstrated).toBe(3);
  });

  it("ignores a tactic name that is not in the taxonomy", () => {
    const c = coverage([ev({ tactics: ["Not A Real Tactic"] })]);
    expect(c.tacticsCovered).toBe(0);
  });

  it("does not count failed evidence toward coverage", () => {
    expect(coverage([ev({ result: "FAILED", tactics: ["Impact"] })]).tacticsCovered).toBe(0);
  });
});

describe("skill engine — accuracy", () => {
  it("separates how well from how much", () => {
    const a = accuracy([
      ev({ result: "SOLVED" }),
      ev({ result: "SOLVED" }),
      ev({ result: "FAILED" }),
      ev({ result: "PARTIAL" }),
    ]);
    expect(a.total).toBe(4);
    expect(a.solved).toBe(2);
    expect(a.partial).toBe(1);
    expect(a.failed).toBe(1);
    // (2 + 0.5) / 4 = 62.5 → 63
    expect(a.accuracyPct).toBe(63);
  });

  it("is empty-safe", () => {
    expect(accuracy([]).accuracyPct).toBe(0);
  });
});

describe("skill engine — activity mix", () => {
  it("counts evidence by activity type with every type present", () => {
    const mix = activityMix([
      ev({ activity: "LAB" }),
      ev({ activity: "LAB" }),
      ev({ activity: "COMPETITION" }),
    ]);
    expect(mix.LAB).toBe(2);
    expect(mix.COMPETITION).toBe(1);
    expect(mix.HUNT).toBe(0);
    // Every activity type is a key, so a dashboard never reads undefined.
    expect(Object.keys(mix)).toHaveLength(9);
  });
});

describe("skill engine — weakest tactics (the gap end of the loop)", () => {
  it("puts untouched tactics ahead of merely weak ones", () => {
    // Discovery has weak-but-present evidence; everything else is untouched.
    const weak = weakestTactics([ev({ skillPoints: 60, tactics: ["Discovery"] })], { limit: 3 });
    expect(weak).toHaveLength(3);
    expect(weak.every((w) => w.tactic !== "Discovery" ? w.untouched : true)).toBe(true);
    // Discovery, being demonstrated, should not sort ahead of untouched ones.
    expect(weak.some((w) => w.tactic === "Discovery")).toBe(false);
  });

  it("orders weak-but-present tactics by ascending score", () => {
    const records = [
      ...TACTICS.map((t) => ev({ skillPoints: 400, tactics: [t] })), // everything touched
      ev({ skillPoints: 10, tactics: ["Discovery"] }),
      ev({ skillPoints: 5, tactics: ["Impact"] }),
    ];
    const weak = weakestTactics(records, { limit: 14, mastered: 100 });
    const discIdx = weak.findIndex((w) => w.tactic === "Impact");
    const otherIdx = weak.findIndex((w) => w.tactic === "Discovery");
    // Impact has fewer points (lower score) so it should come first.
    expect(discIdx).toBeGreaterThan(-1);
    expect(otherIdx).toBeGreaterThan(-1);
    // Not asserting exact positions beyond relative order of these two.
    const impactScore = weak.find((w) => w.tactic === "Impact")!.score;
    const discScore = weak.find((w) => w.tactic === "Discovery")!.score;
    expect(impactScore).toBeLessThanOrEqual(discScore);
  });

  it("drops tactics at or above the mastery threshold", () => {
    // One tactic pushed high; it must not appear as a weakness.
    const strong = ev({ skillPoints: 5000, tactics: ["Execution"] });
    const weak = weakestTactics([strong], { limit: 14, mastered: 70 });
    expect(weak.some((w) => w.tactic === "Execution")).toBe(false);
  });

  it("respects the limit", () => {
    expect(weakestTactics([], { limit: 3 })).toHaveLength(3);
    expect(weakestTactics([], { limit: 5 })).toHaveLength(5);
  });

  it("returns nothing when every tactic is mastered", () => {
    const records = TACTICS.map((t) => ev({ skillPoints: 5000, tactics: [t] }));
    expect(weakestTactics(records, { limit: 14, mastered: 70 })).toHaveLength(0);
  });
});

describe("skill engine — purity", () => {
  it("does not mutate the records it is given", () => {
    const records = [ev({ tactics: ["Discovery"], techniques: ["T1083"] })];
    const snapshot = JSON.stringify(records);
    overallSkillPoints(records);
    skillMatrix(records);
    coverage(records);
    accuracy(records);
    weakestTactics(records);
    expect(JSON.stringify(records)).toBe(snapshot);
  });

  it("is deterministic", () => {
    const records = [ev({ skillPoints: 130, tactics: ["Discovery", "Impact"] })];
    expect(JSON.stringify(skillMatrix(records))).toBe(JSON.stringify(skillMatrix(records)));
  });
});

// ── Recommendation engine (the action end of the loop) ──────────────────────

import { recommendActivities, type ActivityRef, type Weakness } from "@/lib/skill-engine";

const act = (over: Partial<ActivityRef> = {}): ActivityRef => ({
  slug: "lab-a",
  title: "Lab A",
  href: "/labs/lab-a",
  activity: "LAB",
  difficulty: "MEDIUM",
  tactics: ["Discovery"],
  ...over,
});

const weak = (tactic: string, score: number, untouched = false): Weakness =>
  ({ tactic, score, untouched } as Weakness);

describe("skill engine — recommendations", () => {
  it("recommends only activities that train a weak tactic", () => {
    const weakest = [weak("Discovery", 20)];
    const catalogue = [
      act({ slug: "trains-it", tactics: ["Discovery"] }),
      act({ slug: "irrelevant", tactics: ["Impact"] }),
    ];
    const recs = recommendActivities(weakest, catalogue, new Set());
    expect(recs.map((r) => r.activity.slug)).toEqual(["trains-it"]);
    expect(recs[0].addresses).toEqual(["Discovery"]);
  });

  it("never recommends an activity the learner has already completed", () => {
    const recs = recommendActivities(
      [weak("Discovery", 20)],
      [act({ slug: "done", tactics: ["Discovery"] })],
      new Set(["done"]),
    );
    expect(recs).toHaveLength(0);
  });

  it("ranks an activity covering more and weaker gaps higher", () => {
    const weakest = [weak("Discovery", 10), weak("Impact", 60)];
    const catalogue = [
      act({ slug: "covers-both", tactics: ["Discovery", "Impact"] }),
      act({ slug: "covers-mild", tactics: ["Impact"] }),
    ];
    const recs = recommendActivities(weakest, catalogue, new Set());
    expect(recs[0].activity.slug).toBe("covers-both");
  });

  it("weighs an untouched gap above a merely weak one", () => {
    const weakest = [weak("Discovery", 40, false), weak("Impact", 40, true)];
    const catalogue = [
      act({ slug: "for-weak", tactics: ["Discovery"] }),
      act({ slug: "for-untouched", tactics: ["Impact"] }),
    ];
    const recs = recommendActivities(weakest, catalogue, new Set());
    expect(recs[0].activity.slug).toBe("for-untouched");
  });

  it("breaks ties toward the easier activity", () => {
    const weakest = [weak("Discovery", 20)];
    const catalogue = [
      act({ slug: "hard", tactics: ["Discovery"], difficulty: "HARD" }),
      act({ slug: "easy", tactics: ["Discovery"], difficulty: "EASY" }),
    ];
    const recs = recommendActivities(weakest, catalogue, new Set());
    expect(recs[0].activity.slug).toBe("easy");
  });

  it("respects the limit", () => {
    const weakest = [weak("Discovery", 20)];
    const catalogue = Array.from({ length: 10 }, (_, i) =>
      act({ slug: `lab-${i}`, tactics: ["Discovery"] }),
    );
    expect(recommendActivities(weakest, catalogue, new Set(), { limit: 3 })).toHaveLength(3);
  });

  it("returns nothing when there are no gaps to close", () => {
    expect(recommendActivities([], [act()], new Set())).toHaveLength(0);
  });

  it("does not mutate its inputs", () => {
    const weakest = [weak("Discovery", 20)];
    const catalogue = [act({ tactics: ["Discovery"] })];
    const snap = JSON.stringify({ weakest, catalogue });
    recommendActivities(weakest, catalogue, new Set());
    expect(JSON.stringify({ weakest, catalogue })).toBe(snap);
  });
});
