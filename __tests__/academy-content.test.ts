import { describe, it, expect } from "vitest";
import { ACADEMY_CONTENT, expandBlock, type Block } from "@/content/academy";
import { ACADEMY_COURSES } from "@/content/academy-courses";

const ALL_LESSONS = ACADEMY_CONTENT.flatMap((c) =>
  c.modules.flatMap((m) =>
    m.lessons.map((l) => ({ course: c.slug, module: m.title, lesson: l })),
  ),
);

describe("academy content", () => {
  it("covers every course defined in academy-courses.ts", () => {
    const authored = new Set(ACADEMY_CONTENT.map((c) => c.slug));
    for (const course of ACADEMY_COURSES) {
      expect(authored.has(course.slug), `${course.slug} has no lesson content`).toBe(true);
    }
  });

  it("matches the module and lesson structure of the course definitions", () => {
    for (const content of ACADEMY_CONTENT) {
      const definition = ACADEMY_COURSES.find((c) => c.slug === content.slug);
      expect(definition, `${content.slug} not found in course definitions`).toBeDefined();

      expect(content.modules.length, `${content.slug} module count`).toBe(
        definition!.modules.length,
      );

      content.modules.forEach((m, i) => {
        const def = definition!.modules[i];
        // A drift here would attach prose to the wrong lesson, silently.
        expect(m.title, `${content.slug} module ${i + 1}`).toBe(def.title);
        expect(m.lessons.length, `${content.slug} / ${m.title} lesson count`).toBe(
          def.lessons.length,
        );
        m.lessons.forEach((l, j) => {
          expect(l.title, `${content.slug} / ${m.title} lesson ${j + 1}`).toBe(
            def.lessons[j].title,
          );
        });
      });
    }
  });

  it("gives every lesson substantive content, not just a title", () => {
    for (const { course, lesson } of ALL_LESSONS) {
      expect(lesson.blocks.length, `${course} / ${lesson.title}`).toBeGreaterThanOrEqual(4);
      expect(lesson.durationMin, `${course} / ${lesson.title}`).toBeGreaterThan(0);
      expect(lesson.summary.length, `${course} / ${lesson.title}`).toBeGreaterThan(30);
    }
  });

  it("opens every lesson with prose rather than a bare code block", () => {
    for (const { course, lesson } of ALL_LESSONS) {
      expect(lesson.blocks[0].t, `${course} / ${lesson.title}`).toBe("text");
    }
  });

  it("closes every lesson with a knowledge check", () => {
    for (const { course, lesson } of ALL_LESSONS) {
      const last = lesson.blocks[lesson.blocks.length - 1];
      expect(last.t, `${course} / ${lesson.title} should end on a check`).toBe("check");
    }
  });

  it("writes text blocks worth reading", () => {
    for (const { course, lesson } of ALL_LESSONS) {
      for (const b of lesson.blocks) {
        if (b.t !== "text") continue;
        expect(b.body.length, `${course} / ${lesson.title}`).toBeGreaterThan(120);
      }
    }
  });

  it("gives every callout a title, body and valid variant", () => {
    const valid = new Set(["important", "info", "tip", "warning", "danger"]);
    for (const { course, lesson } of ALL_LESSONS) {
      for (const b of lesson.blocks) {
        if (b.t !== "callout") continue;
        expect(valid.has(b.variant), `${course} / ${lesson.title}: ${b.variant}`).toBe(true);
        expect(b.title.length).toBeGreaterThan(4);
        expect(b.body.length).toBeGreaterThan(40);
      }
    }
  });

  /**
   * The check that matters most. A `correct` index outside the options array
   * expands to an id no option carries, which marks every learner wrong with
   * nothing on screen to explain why.
   */
  it("keeps every knowledge-check answer inside its options", () => {
    for (const { course, lesson } of ALL_LESSONS) {
      for (const b of lesson.blocks) {
        if (b.t !== "check") continue;
        const label = `${course} / ${lesson.title}: ${b.question.slice(0, 40)}`;

        expect(b.options.length, label).toBeGreaterThanOrEqual(3);
        expect(new Set(b.options).size, `${label} — duplicate options`).toBe(b.options.length);
        expect(b.correct, `${label} — index below zero`).toBeGreaterThanOrEqual(0);
        expect(b.correct, `${label} — index past end`).toBeLessThan(b.options.length);
        expect(b.explanation.length, `${label} — explanation too thin`).toBeGreaterThan(60);
      }
    }
  });

  it("expands checks to an id that one of the options actually carries", () => {
    for (const { course, lesson } of ALL_LESSONS) {
      for (const b of lesson.blocks) {
        if (b.t !== "check") continue;
        const stored = expandBlock(b);
        const options = stored.content.options as { id: string }[];
        const correct = stored.content.correct as string;
        expect(
          options.some((o) => o.id === correct),
          `${course} / ${lesson.title}: correct id "${correct}" matches no option`,
        ).toBe(true);
      }
    }
  });

  it("expands every block type to the stored shape", () => {
    const samples: Block[] = [
      { t: "text", body: "x".repeat(130) },
      { t: "code", code: "echo hi", language: "bash" },
      { t: "callout", title: "Title", body: "y".repeat(50), variant: "tip" },
      {
        t: "check",
        question: "Q?",
        options: ["a", "b", "c"],
        correct: 2,
        explanation: "z".repeat(70),
      },
    ];
    const expanded = samples.map(expandBlock);
    expect(expanded.map((e) => e.type)).toEqual([
      "TEXT",
      "CODE",
      "CALLOUT",
      "KNOWLEDGE_CHECK",
    ]);
    expect(expanded[3].content.correct).toBe("C");
  });

  it("reaches a depth comparable to a commercial course", () => {
    const blocks = ALL_LESSONS.reduce((n, l) => n + l.lesson.blocks.length, 0);
    const perLesson = blocks / ALL_LESSONS.length;
    // The pre-existing courses averaged 3.3 blocks per lesson.
    expect(perLesson).toBeGreaterThan(4.5);
    expect(ALL_LESSONS.length).toBeGreaterThanOrEqual(50);
  });

  it("uses every block type across the catalogue", () => {
    const types = new Set(ALL_LESSONS.flatMap((l) => l.lesson.blocks.map((b) => b.t)));
    expect(types).toEqual(new Set(["text", "code", "callout", "check"]));
  });
});
