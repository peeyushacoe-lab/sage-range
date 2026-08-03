import { describe, it, expect } from "vitest";
import { ACADEMY_CONTENT, expandBlock, FLASHCARDS, type Block } from "@/content/academy";
import { checkPractice } from "@/lib/practice-check";
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
    expect(types).toEqual(
      new Set([
        "text", "code", "callout", "check",
        "terminal", "walkthrough", "diagram", "practice",
      ]),
    );
  });
});

// ── Paced formats ──────────────────────────────────────────────────────────
//
// These stand in for lecture video, so they carry the same risk a bad video
// does: a learner watches the whole thing and comes away with nothing. The
// checks below are about substance — enough steps to be worth pacing, and
// commands that are real enough to run.

const PACED = ALL_LESSONS.flatMap(({ course, lesson }) =>
  lesson.blocks
    .filter((b) => b.t === "terminal" || b.t === "walkthrough" || b.t === "diagram")
    .map((b) => ({ course, lesson: lesson.title, block: b })),
);

describe("academy paced content", () => {
  it("spreads paced content across every course", () => {
    const covered = new Set(PACED.map((p) => p.course));
    for (const c of ACADEMY_CONTENT) {
      expect(covered.has(c.slug), `${c.slug} has no terminal, walkthrough or diagram`).toBe(true);
    }
  });

  it("gives a terminal replay enough of a session to be worth replaying", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "terminal") continue;
      const label = `${course} / ${lesson}`;

      expect(block.lines.length, `${label} — too short to pace`).toBeGreaterThanOrEqual(6);
      expect(block.host.length, `${label} — no prompt`).toBeGreaterThan(3);
      expect(block.title.length, `${label} — no title`).toBeGreaterThan(8);

      // A replay with no commands is a code block with extra steps, and a
      // replay with no narration is a transcript nobody learns from.
      expect(block.lines.some((l) => l.kind === "cmd"), `${label} — no commands`).toBe(true);
      expect(block.lines.some((l) => l.kind === "out"), `${label} — no output`).toBe(true);
      expect(block.lines.some((l) => l.kind === "note"), `${label} — no narration`).toBe(true);

      for (const line of block.lines) {
        expect(line.text.trim().length, `${label} — empty ${line.kind} line`).toBeGreaterThan(0);
      }
    }
  });

  it("opens a terminal replay with narration rather than a bare command", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "terminal") continue;
      expect(block.lines[0].kind, `${course} / ${lesson}`).toBe("note");
    }
  });

  it("keeps the copy-commands button worth pressing", () => {
    // The button copies every cmd line. If those were truncated with an
    // ellipsis they would fail the moment a learner pasted them.
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "terminal") continue;
      for (const line of block.lines) {
        if (line.kind !== "cmd") continue;
        expect(line.text, `${course} / ${lesson} — truncated command`).not.toMatch(/…|\.\.\.$/);
      }
    }
  });

  it("gives a walkthrough enough steps to be paced, each with substance", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "walkthrough") continue;
      const label = `${course} / ${lesson}`;

      expect(block.steps.length, `${label} — too few steps`).toBeGreaterThanOrEqual(4);
      expect(block.intro.length, `${label} — thin intro`).toBeGreaterThan(60);

      for (const [i, s] of block.steps.entries()) {
        expect(s.title.length, `${label} step ${i + 1} — thin title`).toBeGreaterThan(10);
        expect(s.body.length, `${label} step ${i + 1} — thin body`).toBeGreaterThan(100);
        if (s.evidence) {
          expect(s.evidence.label.length, `${label} step ${i + 1} — unlabelled evidence`)
            .toBeGreaterThan(4);
          expect(s.evidence.code.trim().length, `${label} step ${i + 1} — empty evidence`)
            .toBeGreaterThan(20);
        }
      }
    }
  });

  it("builds each walkthrough on evidence rather than assertion", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "walkthrough") continue;
      const withEvidence = block.steps.filter((s) => s.evidence).length;
      expect(
        withEvidence,
        `${course} / ${lesson} — only ${withEvidence} of ${block.steps.length} steps show evidence`,
      ).toBeGreaterThanOrEqual(Math.ceil(block.steps.length / 2));
    }
  });

  it("explains what changed on the steps that advance the picture", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "walkthrough") continue;
      const withInsight = block.steps.filter((s) => s.insight && s.insight.length > 40).length;
      expect(withInsight, `${course} / ${lesson}`).toBeGreaterThanOrEqual(
        block.steps.length - 1,
      );
    }
  });

  it("gives a chain diagram a full sequence with real technique ids", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "diagram") continue;
      const label = `${course} / ${lesson}`;

      expect(block.stages.length, `${label} — too few stages`).toBeGreaterThanOrEqual(5);
      expect(block.caption.length, `${label} — thin caption`).toBeGreaterThan(60);

      for (const [i, s] of block.stages.entries()) {
        expect(s.label.length, `${label} stage ${i + 1} — thin label`).toBeGreaterThan(4);
        expect(s.detail.length, `${label} stage ${i + 1} — thin detail`).toBeGreaterThan(80);
        if (s.technique) {
          // A malformed id silently produces a tag that links to nothing and
          // matches no ATT&CK navigator export.
          expect(s.technique, `${label} stage ${i + 1}`).toMatch(/^T\d{4}(\.\d{3})?$/);
        }
      }
    }
  });

  it("keeps diagram stages distinct", () => {
    for (const { course, lesson, block } of PACED) {
      if (block.t !== "diagram") continue;
      const labels = block.stages.map((s) => s.label);
      expect(new Set(labels).size, `${course} / ${lesson} — duplicate stage`).toBe(labels.length);
    }
  });

  it("expands the paced block types to the stored shape", () => {
    const samples: Block[] = [
      {
        t: "terminal",
        title: "A session",
        host: "user@host",
        lines: [{ kind: "note", text: "why" }, { kind: "cmd", text: "ls" }],
      },
      {
        t: "walkthrough",
        title: "An investigation",
        intro: "i".repeat(70),
        steps: [{ title: "Step one here", body: "b".repeat(110) }],
      },
      {
        t: "diagram",
        title: "A chain",
        caption: "c".repeat(70),
        stages: [{ label: "Phish", technique: "T1566.001", detail: "d".repeat(90) }],
      },
    ];
    const expanded = samples.map(expandBlock);
    expect(expanded.map((e) => e.type)).toEqual(["TERMINAL", "WALKTHROUGH", "DIAGRAM"]);
    expect((expanded[0].content.lines as unknown[]).length).toBe(2);
    expect((expanded[1].content.steps as unknown[]).length).toBe(1);
    expect((expanded[2].content.stages as unknown[]).length).toBe(1);
  });

  it("carries enough paced content to change how the catalogue reads", () => {
    expect(PACED.length).toBeGreaterThanOrEqual(15);
  });
});

// ── In-lesson practice ─────────────────────────────────────────────────────
//
// A practice block that cannot be solved is worse than no practice block: the
// learner burns attempts, reveals the solution, and learns that the exercise
// was broken. The decisive test is that the authored solution passes the
// authored spec.

const PRACTICES = ALL_LESSONS.flatMap(({ course, lesson }) =>
  lesson.blocks
    .filter((b) => b.t === "practice")
    .map((b) => ({ course, lesson: lesson.title, block: b })),
);

describe("academy practice exercises", () => {
  it("places practice in more than one course", () => {
    expect(new Set(PRACTICES.map((p) => p.course)).size).toBeGreaterThanOrEqual(4);
    expect(PRACTICES.length).toBeGreaterThanOrEqual(8);
  });

  /**
   * The one that would otherwise ship broken. If the worked solution does not
   * satisfy the required elements, no learner answer ever will — and the block
   * fails silently, because nothing throws.
   */
  it("accepts its own worked solution", () => {
    for (const { course, lesson, block } of PRACTICES) {
      if (block.t !== "practice") continue;
      const result = checkPractice(block.solution, {
        requires: block.requires,
        forbids: block.forbids,
      });
      expect(
        result.correct,
        `${course} / ${lesson} — solution fails its own spec; missing ${JSON.stringify(result.missing)}, violates ${JSON.stringify(result.violations)}`,
      ).toBe(true);
    }
  });

  it("rejects an empty answer and unrelated text", () => {
    for (const { course, lesson, block } of PRACTICES) {
      if (block.t !== "practice") continue;
      const spec = { requires: block.requires, forbids: block.forbids };
      expect(checkPractice("", spec).correct, `${course} / ${lesson}`).toBe(false);
      expect(
        checkPractice("i do not know", spec).correct,
        `${course} / ${lesson} — accepts anything`,
      ).toBe(false);
    }
  });

  it("requires enough elements to be a real exercise", () => {
    for (const { course, lesson, block } of PRACTICES) {
      if (block.t !== "practice") continue;
      const label = `${course} / ${lesson}`;
      expect(block.requires.length, `${label} — nothing required`).toBeGreaterThanOrEqual(1);
      for (const token of block.requires) {
        expect(token.trim().length, `${label} — empty required token`).toBeGreaterThan(0);
      }
      expect(new Set(block.requires).size, `${label} — duplicate requirement`).toBe(
        block.requires.length,
      );
    }
  });

  it("never forbids something it also requires", () => {
    // Would make the exercise unsolvable, and the contradiction is invisible
    // until a learner hits it.
    for (const { course, lesson, block } of PRACTICES) {
      if (block.t !== "practice") continue;
      for (const f of block.forbids ?? []) {
        for (const r of block.requires) {
          expect(
            r.toLowerCase().includes(f.toLowerCase()),
            `${course} / ${lesson} — requires "${r}" but forbids "${f}"`,
          ).toBe(false);
        }
      }
    }
  });

  it("states the task and explains the answer", () => {
    for (const { course, lesson, block } of PRACTICES) {
      if (block.t !== "practice") continue;
      const label = `${course} / ${lesson}`;
      expect(block.task.length, `${label} — thin task`).toBeGreaterThan(60);
      expect(block.explanation.length, `${label} — thin explanation`).toBeGreaterThan(80);
      expect(block.solution.trim().length, `${label} — no solution`).toBeGreaterThan(5);
      if (block.setup) {
        expect(block.setup.code.trim().length, `${label} — empty setup`).toBeGreaterThan(20);
      }
    }
  });

  it("follows the reading rather than opening the lesson", () => {
    // Practice before any teaching is a quiz on material not yet given.
    for (const { course, lesson: lessonTitle } of PRACTICES) {
      const found = ALL_LESSONS.find((l) => l.lesson.title === lessonTitle)!;
      const at = found.lesson.blocks.findIndex((b) => b.t === "practice");
      expect(at, `${course} / ${lessonTitle}`).toBeGreaterThan(1);
    }
  });
});

// ── Flashcard decks ────────────────────────────────────────────────────────
//
// These feed the spaced-repetition scheduler, which means a badly written card
// does more damage here than a badly written paragraph: the learner's grade is
// the scheduler's only input, so an ambiguous card corrupts the schedule for
// every card it competes with.

const ALL_CARDS = Object.entries(FLASHCARDS).flatMap(([course, lessons]) =>
  Object.entries(lessons).flatMap(([lessonTitle, cards]) =>
    cards.map((c, i) => ({ course, lessonTitle, index: i, card: c })),
  ),
);

describe("academy flashcards", () => {
  it("attaches every deck entry to a lesson that exists", () => {
    const authored = new Set(
      ACADEMY_CONTENT.flatMap((c) =>
        c.modules.flatMap((m) => m.lessons.map((l) => `${c.slug}::${l.title}`)),
      ),
    );
    for (const [slug, lessons] of Object.entries(FLASHCARDS)) {
      for (const title of Object.keys(lessons)) {
        expect(
          authored.has(`${slug}::${title}`),
          `${slug} / "${title}" matches no authored lesson`,
        ).toBe(true);
      }
    }
  });

  it("gives every authored lesson at least two cards", () => {
    for (const content of ACADEMY_CONTENT) {
      const deck = FLASHCARDS[content.slug];
      expect(deck, `${content.slug} has no flashcard deck`).toBeDefined();
      for (const m of content.modules) {
        for (const l of m.lessons) {
          const cards = deck?.[l.title] ?? [];
          expect(cards.length, `${content.slug} / ${l.title}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("writes cards substantial enough to be worth recalling", () => {
    for (const { course, lessonTitle, index, card } of ALL_CARDS) {
      const label = `${course} / ${lessonTitle} #${index + 1}`;
      expect(card.front.trim().length, `${label} — front too short`).toBeGreaterThan(20);
      expect(card.back.trim().length, `${label} — back too short`).toBeGreaterThan(60);
      expect(card.front, `${label} — front is not a prompt`).not.toBe(card.back);
    }
  });

  /**
   * The rule that matters most for scheduling quality. A yes/no front can be
   * guessed correctly half the time, so the learner's grade stops carrying
   * information and SM-2 spaces the card out on the strength of a coin flip.
   */
  it("avoids fronts that can be answered by guessing", () => {
    const guessable = /^(is|are|does|do|can|should|will|would|was|were|has|have)\b/i;
    for (const { course, lessonTitle, index, card } of ALL_CARDS) {
      expect(
        guessable.test(card.front.trim()),
        `${course} / ${lessonTitle} #${index + 1} — yes/no front: "${card.front}"`,
      ).toBe(false);
    }
  });

  it("asks one thing per card", () => {
    // Two question marks means two questions, and the learner grades whichever
    // half they happened to remember.
    for (const { course, lessonTitle, index, card } of ALL_CARDS) {
      const questions = (card.front.match(/\?/g) ?? []).length;
      expect(
        questions,
        `${course} / ${lessonTitle} #${index + 1} — ${questions} questions on one card`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it("keeps cards distinct within a lesson", () => {
    for (const [course, lessons] of Object.entries(FLASHCARDS)) {
      for (const [lessonTitle, cards] of Object.entries(lessons)) {
        const fronts = cards.map((c) => c.front);
        expect(new Set(fronts).size, `${course} / ${lessonTitle} — duplicate front`).toBe(
          fronts.length,
        );
      }
    }
  });

  it("keeps cards distinct across the whole catalogue", () => {
    const fronts = ALL_CARDS.map((c) => c.card.front);
    const seen = new Map<string, string>();
    for (const { course, lessonTitle, card } of ALL_CARDS) {
      const prior = seen.get(card.front);
      expect(prior, `duplicate front in ${course} / ${lessonTitle} and ${prior}`).toBeUndefined();
      seen.set(card.front, `${course} / ${lessonTitle}`);
    }
    expect(seen.size).toBe(fronts.length);
  });

  it("builds a deck large enough for spacing to mean anything", () => {
    // Below roughly a hundred cards a deck comes due in clumps and the
    // scheduling is indistinguishable from a fixed weekly review.
    expect(ALL_CARDS.length).toBeGreaterThanOrEqual(120);
  });
});
