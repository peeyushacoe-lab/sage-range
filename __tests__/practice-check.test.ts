import { describe, it, expect } from "vitest";
import {
  checkPractice,
  normalise,
  revealLevel,
  hintsFor,
  canRevealSolution,
  feedbackFor,
  type PracticeSpec,
} from "@/lib/practice-check";

const SPEC: PracticeSpec = {
  requires: ["awk", "sort", "uniq -c"],
  forbids: ["grep -c"],
};

describe("practice — normalisation", () => {
  it("collapses whitespace so formatting does not decide correctness", () => {
    expect(normalise("awk    '{print $1}'   | sort")).toBe("awk '{print $1}' | sort");
    expect(normalise("  awk\n\t| sort  ")).toBe("awk | sort");
  });

  it("is case-insensitive by default and case-sensitive on request", () => {
    expect(normalise("SHA256")).toBe("sha256");
    expect(normalise("SHA256", true)).toBe("SHA256");
  });

  it("keeps punctuation, because quoting is part of what is being taught", () => {
    expect(normalise(`awk -F, '{print $2}'`)).toBe(`awk -f, '{print $2}'`);
  });
});

describe("practice — checking an answer", () => {
  it("accepts an answer containing every required element", () => {
    const r = checkPractice("awk '{print $3}' dns.log | sort | uniq -c", SPEC);
    expect(r.correct).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.progress).toBe(1);
  });

  it("accepts a differently-ordered answer with the same parts", () => {
    // Grading on exact text would teach one phrasing rather than the idea.
    const r = checkPractice("sort dns.log | uniq -c | awk '{print $2}'", SPEC);
    expect(r.correct).toBe(true);
  });

  it("reports exactly which required elements are missing", () => {
    const r = checkPractice("awk '{print $3}'", SPEC);
    expect(r.correct).toBe(false);
    expect(r.present).toEqual(["awk"]);
    expect(r.missing).toEqual(["sort", "uniq -c"]);
  });

  it("tracks partial progress for the indicator", () => {
    expect(checkPractice("awk | sort", SPEC).progress).toBeCloseTo(2 / 3);
    expect(checkPractice("nothing here", SPEC).progress).toBe(0);
  });

  it("fails an answer that uses a forbidden approach even when complete", () => {
    const r = checkPractice("awk '{print $3}' | sort | uniq -c | grep -c foo", SPEC);
    expect(r.missing).toEqual([]);
    expect(r.violations).toEqual(["grep -c"]);
    expect(r.correct).toBe(false);
  });

  it("ignores case unless the spec asks for it", () => {
    expect(checkPractice("AWK | SORT | UNIQ -C", SPEC).correct).toBe(true);
    const cased: PracticeSpec = { requires: ["SHA256"], caseSensitive: true };
    expect(checkPractice("sha256", cased).correct).toBe(false);
    expect(checkPractice("SHA256", cased).correct).toBe(true);
  });

  it("treats an empty answer as wrong rather than vacuously right", () => {
    expect(checkPractice("", { requires: [] }).correct).toBe(false);
    expect(checkPractice("   ", SPEC).correct).toBe(false);
  });

  it("never lets an empty required token pass an exercise", () => {
    // An authoring slip that would otherwise match every possible answer.
    const r = checkPractice("anything at all", { requires: ["awk", ""] });
    expect(r.correct).toBe(false);
    expect(r.missing).toContain("");
  });

  it("matches a required element across collapsed whitespace", () => {
    const spec: PracticeSpec = { requires: ["sort -rn"] };
    expect(checkPractice("... |   sort   -rn", spec).correct).toBe(true);
  });
});

describe("practice — how much is revealed", () => {
  it("withholds specifics on the first attempt", () => {
    expect(revealLevel(0)).toBe("count");
    expect(revealLevel(1)).toBe("count");
  });

  it("names one missing element on the second attempt", () => {
    expect(revealLevel(2)).toBe("partial");
    const r = checkPractice("awk", SPEC);
    expect(hintsFor(r, 2)).toEqual(["sort"]);
  });

  it("names everything once the learner is genuinely stuck", () => {
    expect(revealLevel(3)).toBe("full");
    const r = checkPractice("awk", SPEC);
    expect(hintsFor(r, 3)).toEqual(["sort", "uniq -c"]);
  });

  it("gives no hints at all on a first attempt", () => {
    expect(hintsFor(checkPractice("awk", SPEC), 1)).toEqual([]);
  });

  it("offers the worked solution only after real attempts", () => {
    expect(canRevealSolution(0)).toBe(false);
    expect(canRevealSolution(1)).toBe(false);
    expect(canRevealSolution(2)).toBe(true);
  });
});

describe("practice — feedback", () => {
  it("asks for an attempt rather than grading an empty box", () => {
    const f = feedbackFor("   ", SPEC, 1);
    expect(f.status).toBe("empty");
    expect(f.offerSolution).toBe(false);
  });

  it("confirms a correct answer without hints", () => {
    const f = feedbackFor("awk | sort | uniq -c", SPEC, 1);
    expect(f.status).toBe("correct");
    expect(f.hints).toEqual([]);
  });

  it("calls out a wrong approach immediately, even on the first attempt", () => {
    // This is feedback about the method, not the answer, so withholding it
    // just lets the learner repeat the same mistake.
    const f = feedbackFor("awk | sort | uniq -c | grep -c x", SPEC, 1);
    expect(f.status).toBe("wrong-approach");
    expect(f.message).toContain("grep -c");
  });

  it("counts what is missing without naming it on a first attempt", () => {
    const f = feedbackFor("awk", SPEC, 1);
    expect(f.status).toBe("incomplete");
    expect(f.message).toContain("2 elements");
    expect(f.hints).toEqual([]);
  });

  it("uses singular phrasing when one element remains", () => {
    const f = feedbackFor("awk | sort", SPEC, 1);
    expect(f.message).toContain("one element");
  });

  it("escalates help as attempts accumulate", () => {
    const first = feedbackFor("awk", SPEC, 1);
    const second = feedbackFor("awk", SPEC, 2);
    const third = feedbackFor("awk", SPEC, 3);

    expect(first.hints.length).toBe(0);
    expect(second.hints.length).toBe(1);
    expect(third.hints.length).toBe(2);
    expect(first.offerSolution).toBe(false);
    expect(third.offerSolution).toBe(true);
  });
});
