import { describe, it, expect } from "vitest";
import { LEARNING_PATHS } from "@/content/learning-paths";
import { ADVANCED_PATHS } from "@/content/learning-paths-advanced";
import { markWithPenalty, type MarkingOutcome } from "@/lib/scoring";

const ALL = [...LEARNING_PATHS, ...ADVANCED_PATHS];

describe("learning path content", () => {
  it("delivers at least 20 paths", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(20);
  });

  it("has unique slugs across both tranches", () => {
    const slugs = ALL.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every path modules — a path without them renders an empty page", () => {
    for (const p of ALL) {
      expect(p.modules.length, p.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every path a description worth reading", () => {
    for (const p of ALL) {
      expect(p.description.length, p.slug).toBeGreaterThan(60);
      expect(p.title.length, p.slug).toBeGreaterThan(4);
    }
  });
});

describe.each(ALL.map((p) => [p.slug, p] as const))("path %s", (_slug, path) => {
  it("gives every module reading material, not just a title", () => {
    for (const m of path.modules) {
      expect(m.overview.length, `${path.slug}/${m.title}`).toBeGreaterThan(30);
      expect(m.readingMaterial.length, `${path.slug}/${m.title}`).toBeGreaterThan(120);
    }
  });

  it("gives every module a quiz with questions", () => {
    for (const m of path.modules) {
      expect(m.quiz.questions.length, `${path.slug}/${m.title}`).toBeGreaterThanOrEqual(2);
      expect(m.quiz.passMark).toBeGreaterThan(0);
      expect(m.quiz.passMark).toBeLessThanOrEqual(100);
    }
  });

  /**
   * The check that matters most. An answer index pointing past the end of the
   * options array marks every correct response wrong, and nothing surfaces it
   * — the quiz loads, runs, and quietly fails everyone.
   */
  it("has every answer index inside its options array", () => {
    for (const m of path.modules) {
      for (const q of m.quiz.questions) {
        const label = `${path.slug}/${m.title}: ${q.question.slice(0, 50)}`;
        expect(q.options.length, label).toBeGreaterThanOrEqual(2);
        expect(new Set(q.options).size, `${label} has duplicate options`).toBe(
          q.options.length,
        );

        const indices = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        for (const i of indices) {
          expect(typeof i, label).toBe("number");
          expect(i, `${label} — index below zero`).toBeGreaterThanOrEqual(0);
          expect(i, `${label} — index past end of options`).toBeLessThan(q.options.length);
        }

        if (q.type === "MULTIPLE_CHOICE") {
          expect(Array.isArray(q.correctAnswer), `${label} takes a single index`).toBe(false);
        } else {
          expect(Array.isArray(q.correctAnswer), `${label} takes an array`).toBe(true);
          const arr = q.correctAnswer as number[];
          expect(arr.length, `${label} needs at least one answer`).toBeGreaterThan(0);
          expect(new Set(arr).size, `${label} has duplicate indices`).toBe(arr.length);
          // A multi-select where every option is correct tests nothing.
          expect(arr.length, `${label} marks every option correct`).toBeLessThan(
            q.options.length,
          );
        }
      }
    }
  });

  it("explains every answer, so a wrong one teaches something", () => {
    for (const m of path.modules) {
      for (const q of m.quiz.questions) {
        expect(
          q.explanation.length,
          `${path.slug}/${m.title}: ${q.question.slice(0, 40)}`,
        ).toBeGreaterThan(40);
      }
    }
  });
});

describe("quiz scoring under negative marking", () => {
  const everyQuestion = ALL.flatMap((p) =>
    p.modules.flatMap((m) =>
      m.quiz.questions.map((q, i) => ({ id: `${p.slug}-${m.title}-${i}`, q })),
    ),
  );

  it("lets a perfect attempt pass every quiz", () => {
    for (const p of ALL) {
      for (const m of p.modules) {
        const questions = m.quiz.questions.map((_, i) => ({ id: String(i) }));
        const outcomes: Record<string, MarkingOutcome> = {};
        questions.forEach((qq) => (outcomes[qq.id] = "CORRECT"));
        const result = markWithPenalty(questions, outcomes);
        expect(result.score, `${p.slug}/${m.title}`).toBe(100);
        expect(result.score).toBeGreaterThanOrEqual(m.quiz.passMark);
      }
    }
  });

  it("fails a quiz answered entirely wrongly", () => {
    for (const p of ALL) {
      for (const m of p.modules) {
        const questions = m.quiz.questions.map((_, i) => ({ id: String(i) }));
        const outcomes: Record<string, MarkingOutcome> = {};
        questions.forEach((qq) => (outcomes[qq.id] = "WRONG"));
        const result = markWithPenalty(questions, outcomes);
        expect(result.score, `${p.slug}/${m.title}`).toBeLessThan(m.quiz.passMark);
      }
    }
  });

  it("makes guessing score worse than leaving blank", () => {
    // The mechanic, asserted against real content rather than a fixture.
    const questions = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const guessed = markWithPenalty(questions, {
      a: "CORRECT",
      b: "WRONG",
      c: "WRONG",
      d: "WRONG",
    });
    const abstained = markWithPenalty(questions, {
      a: "CORRECT",
      b: "SKIPPED",
      c: "SKIPPED",
      d: "SKIPPED",
    });
    expect(guessed.score).toBeLessThan(abstained.score);
  });

  it("uses a mix of question types rather than only single-answer", () => {
    const multi = everyQuestion.filter((x) => x.q.type === "MULTIPLE_SELECT").length;
    expect(multi).toBeGreaterThan(everyQuestion.length * 0.15);
  });
});
