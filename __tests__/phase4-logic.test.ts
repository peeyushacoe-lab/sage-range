import { describe, it, expect } from "vitest";
import {
  analyseSkillGap,
  recommendPaths,
  readinessLabel,
} from "@/lib/skill-gap";
import {
  gradeAssessment,
  isExpired,
  remainingSeconds,
  credentialCode,
  credentialExpiry,
  scoreInterview,
  type AssessmentQuestion,
} from "@/lib/assessment-grading";

describe("analyseSkillGap", () => {
  it("reports full readiness when every requirement is met", () => {
    const a = analyseSkillGap(
      { INITIAL_ACCESS: 3, PERSISTENCE: 2 },
      { INITIAL_ACCESS: 5, PERSISTENCE: 2 },
    );
    expect(a.readiness).toBe(100);
    expect(a.gaps).toHaveLength(0);
    expect(a.met).toEqual(["INITIAL_ACCESS", "PERSISTENCE"]);
  });

  it("reports zero readiness for a completely uncovered role", () => {
    const a = analyseSkillGap({ INITIAL_ACCESS: 3, PERSISTENCE: 2 }, {});
    expect(a.readiness).toBe(0);
    expect(a.gaps).toHaveLength(2);
  });

  it("does not let over-achievement in one tactic mask a total gap in another", () => {
    // The naive total-solved/total-required ratio would score 100 here.
    const a = analyseSkillGap(
      { INITIAL_ACCESS: 5, PERSISTENCE: 5 },
      { INITIAL_ACCESS: 50, PERSISTENCE: 0 },
    );
    expect(a.readiness).toBe(50);
    expect(a.gaps.map((g) => g.tactic)).toEqual(["PERSISTENCE"]);
  });

  it("orders gaps worst first", () => {
    const a = analyseSkillGap(
      { A: 10, B: 10, C: 10 },
      { A: 9, B: 1, C: 5 },
    );
    expect(a.gaps.map((g) => g.tactic)).toEqual(["B", "C", "A"]);
  });

  it("treats a zero requirement as satisfied", () => {
    const a = analyseSkillGap({ OPTIONAL: 0 }, {});
    expect(a.readiness).toBe(100);
    expect(a.gaps).toHaveLength(0);
  });

  it("handles a role with no requirements", () => {
    const a = analyseSkillGap({}, { ANYTHING: 5 });
    expect(a.readiness).toBe(100);
    expect(a.coverage).toHaveLength(0);
  });

  it("ignores negative or missing counts rather than going below zero", () => {
    const a = analyseSkillGap({ A: 4 }, { A: -3 });
    expect(a.readiness).toBe(0);
    expect(a.coverage[0].have).toBe(0);
  });

  it("caps a partially covered tactic at its requirement", () => {
    const a = analyseSkillGap({ A: 4 }, { A: 2 });
    expect(a.readiness).toBe(50);
    expect(a.coverage[0].ratio).toBe(0.5);
  });
});

describe("recommendPaths", () => {
  const gapped = analyseSkillGap({ A: 5 }, { A: 0 });
  const ready = analyseSkillGap({ A: 5 }, { A: 5 });

  it("suggests paths when there is a gap", () => {
    expect(recommendPaths(gapped, ["p1", "p2", "p3", "p4"])).toEqual(["p1", "p2", "p3"]);
  });

  it("suggests nothing to someone already role-ready", () => {
    expect(recommendPaths(ready, ["p1", "p2"])).toEqual([]);
  });

  it("respects the limit", () => {
    expect(recommendPaths(gapped, ["p1", "p2", "p3"], 1)).toEqual(["p1"]);
  });
});

describe("readinessLabel", () => {
  it("bands the score", () => {
    expect(readinessLabel(95)).toBe("Role ready");
    expect(readinessLabel(75)).toBe("Nearly ready");
    expect(readinessLabel(50)).toBe("Developing");
    expect(readinessLabel(10)).toBe("Early");
  });
});

describe("gradeAssessment", () => {
  const questions: AssessmentQuestion[] = [
    { id: "q1", type: "SINGLE", answer: 2, points: 1 },
    { id: "q2", type: "MULTI", answer: [0, 2], points: 2 },
    { id: "q3", type: "TEXT" },
  ];

  it("scores a perfect auto-gradable attempt", () => {
    const r = gradeAssessment(questions, { q1: 2, q2: [2, 0], q3: "essay" }, 70);
    expect(r.score).toBe(100);
    expect(r.passed).toBe(true);
    expect(r.correct).toEqual(["q1", "q2"]);
  });

  it("accepts MULTI answers in any order", () => {
    const r = gradeAssessment(questions, { q1: 2, q2: [2, 0] }, 70);
    expect(r.correct).toContain("q2");
  });

  it("rejects a MULTI answer that is a subset", () => {
    const r = gradeAssessment(questions, { q1: 2, q2: [0] }, 70);
    expect(r.incorrect).toContain("q2");
  });

  it("rejects a MULTI answer with an extra selection", () => {
    const r = gradeAssessment(questions, { q1: 2, q2: [0, 1, 2] }, 70);
    expect(r.incorrect).toContain("q2");
  });

  it("excludes TEXT questions from the automatic score", () => {
    // Counting q3 as zero would cap this attempt at 75% and could fail an
    // otherwise perfect candidate on a text-heavy paper.
    const r = gradeAssessment(questions, { q1: 2, q2: [0, 2] }, 90);
    expect(r.available).toBe(3);
    expect(r.requiresReview).toEqual(["q3"]);
    expect(r.passed).toBe(true);
  });

  it("counts skipped questions as incorrect", () => {
    const r = gradeAssessment(questions, {}, 70);
    expect(r.score).toBe(0);
    expect(r.incorrect).toEqual(["q1", "q2"]);
  });

  it("honours per-question weighting", () => {
    // q2 is worth 2 of the 3 available points.
    const r = gradeAssessment(questions, { q2: [0, 2] }, 60);
    expect(r.earned).toBe(2);
    expect(r.score).toBe(67);
    expect(r.passed).toBe(true);
  });

  it("fails just below the pass mark", () => {
    const r = gradeAssessment(questions, { q1: 2 }, 70);
    expect(r.score).toBe(33);
    expect(r.passed).toBe(false);
  });

  it("never passes an assessment with nothing auto-gradable", () => {
    const r = gradeAssessment([{ id: "t", type: "TEXT" }], { t: "words" }, 0);
    expect(r.available).toBe(0);
    expect(r.passed).toBe(false);
  });
});

describe("attempt timing", () => {
  const start = new Date("2026-07-30T10:00:00Z");

  it("is not expired inside the limit", () => {
    expect(isExpired(start, 3600, new Date("2026-07-30T10:59:00Z"))).toBe(false);
  });

  it("allows a small grace past the limit", () => {
    expect(isExpired(start, 3600, new Date("2026-07-30T11:00:20Z"))).toBe(false);
  });

  it("expires beyond the grace", () => {
    expect(isExpired(start, 3600, new Date("2026-07-30T11:01:00Z"))).toBe(true);
  });

  it("counts down and floors at zero", () => {
    expect(remainingSeconds(start, 3600, new Date("2026-07-30T10:10:00Z"))).toBe(3000);
    expect(remainingSeconds(start, 3600, new Date("2026-07-30T12:00:00Z"))).toBe(0);
  });
});

describe("credentials", () => {
  it("builds a readable, domain-tagged code", () => {
    const code = credentialCode("DETECTION", new Date("2026-07-30T00:00:00Z"));
    expect(code).toMatch(/^SV-DETECTION-2026-[A-Z2-9]{6}$/);
  });

  it("omits ambiguous characters from the suffix", () => {
    for (let i = 0; i < 50; i++) {
      const suffix = credentialCode("X").split("-")[3];
      expect(suffix).not.toMatch(/[IO01]/);
    }
  });

  it("falls back to GENERAL for an unusable domain", () => {
    expect(credentialCode("!!!")).toMatch(/^SV-GENERAL-/);
  });

  it("returns no expiry when validity is unset", () => {
    expect(credentialExpiry(null)).toBeNull();
    expect(credentialExpiry(0)).toBeNull();
  });

  it("dates expiry the given number of days out", () => {
    const issued = new Date("2026-07-30T00:00:00Z");
    expect(credentialExpiry(365, issued)?.toISOString().slice(0, 10)).toBe("2027-07-30");
  });
});

describe("scoreInterview", () => {
  const questions = [{ id: "a", weight: 1 }, { id: "b", weight: 3 }];

  it("weights answers by question importance", () => {
    // (100*1 + 50*3) / 4
    expect(scoreInterview(questions, { a: 100, b: 50 })).toBe(63);
  });

  it("counts an unanswered question as zero", () => {
    expect(scoreInterview(questions, { a: 100 })).toBe(25);
  });

  it("clamps out-of-range answer scores", () => {
    expect(scoreInterview([{ id: "a" }], { a: 500 })).toBe(100);
    expect(scoreInterview([{ id: "a" }], { a: -20 })).toBe(0);
  });

  it("returns zero for an empty kit", () => {
    expect(scoreInterview([], {})).toBe(0);
  });

  it("defaults missing weights to 1", () => {
    expect(scoreInterview([{ id: "a" }, { id: "b" }], { a: 80, b: 40 })).toBe(60);
  });
});
