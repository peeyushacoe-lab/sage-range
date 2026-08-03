/**
 * Compact authoring format for Academy lesson content.
 *
 * Lessons are stored as ordered AcademyLessonBlock rows whose `content` is
 * JSON shaped per block type. Authoring that shape directly is verbose and
 * easy to get wrong — knowledge checks in particular need option ids that
 * match the `correct` field exactly, and a mismatch marks every learner wrong
 * with nothing to indicate why.
 *
 * These helpers author in a compact form and expand to the stored shape at
 * seed time, so option ids are generated rather than typed.
 */

export type CalloutVariant = "important" | "info" | "tip" | "warning" | "danger";

/**
 * One line of a replayed terminal session.
 *
 * `cmd` lines are typed out character by character behind a prompt, `out` lines
 * print at once the way real output does, and `note` lines are the narration a
 * presenter would speak over the top.
 */
export type TerminalLine = {
  kind: "cmd" | "out" | "note";
  text: string;
};

/** One advance of a step-through investigation. */
export type WalkStep = {
  title: string;
  body: string;
  /** Evidence revealed at this step. Accumulates on screen as the learner advances. */
  evidence?: { label: string; code: string; language?: string };
  /** What this step changed about the picture — the reason to click Next. */
  insight?: string;
};

/** One node of an attack chain that draws itself stage by stage. */
export type ChainStage = {
  label: string;
  /** ATT&CK technique id, e.g. "T1566.001". Rendered as the node's tag. */
  technique?: string;
  detail: string;
};

export type Block =
  | { t: "text"; body: string }
  | { t: "code"; code: string; language?: string; caption?: string }
  | { t: "callout"; title: string; body: string; variant: CalloutVariant }
  | { t: "terminal"; title: string; host: string; lines: TerminalLine[] }
  | {
      t: "practice";
      task: string;
      /** Data or context the learner works against. */
      setup?: { label: string; code: string };
      /** Every one of these must appear in the answer. Order is irrelevant. */
      requires: string[];
      /** Plausible wrong approaches, named back to the learner when used. */
      forbids?: string[];
      /** A worked answer, offered only after the learner has genuinely tried. */
      solution: string;
      explanation: string;
    }
  | { t: "walkthrough"; title: string; intro: string; steps: WalkStep[] }
  | { t: "diagram"; title: string; caption: string; stages: ChainStage[] }
  | {
      t: "check";
      question: string;
      options: string[];
      /** Zero-based index into `options`. */
      correct: number;
      explanation: string;
    };

export type Lesson = {
  title: string;
  summary: string;
  durationMin: number;
  blocks: Block[];
};

export type CourseModule = {
  title: string;
  description: string;
  lessons: Lesson[];
};

export type Course = {
  slug: string;
  modules: CourseModule[];
};

// ── Authoring helpers ──────────────────────────────────────────────────────

export const text = (body: string): Block => ({ t: "text", body });

export const code = (code: string, language = "text", caption?: string): Block => ({
  t: "code",
  code,
  language,
  caption,
});

export const callout = (
  variant: CalloutVariant,
  title: string,
  body: string,
): Block => ({ t: "callout", title, body, variant });

export const check = (
  question: string,
  options: string[],
  correct: number,
  explanation: string,
): Block => ({ t: "check", question, options, correct, explanation });

// ── Paced formats ──────────────────────────────────────────────────────────

/** A command the learner watches being typed. */
export const cmd = (text: string): TerminalLine => ({ kind: "cmd", text });

/** Output that prints in one go. */
export const out = (text: string): TerminalLine => ({ kind: "out", text });

/** Narration between commands — what a presenter would say out loud. */
export const note = (text: string): TerminalLine => ({ kind: "note", text });

/**
 * A replayed terminal session.
 *
 * Does what a screencast does for CLI work, except the commands stay
 * selectable, searchable and correctable — a tool's output changes and you edit
 * a string rather than re-record.
 */
export const terminal = (
  title: string,
  host: string,
  lines: TerminalLine[],
): Block => ({ t: "terminal", title, host, lines });

export const step = (
  title: string,
  body: string,
  extra: { evidence?: WalkStep["evidence"]; insight?: string } = {},
): WalkStep => ({ title, body, ...extra });

/** An investigation the learner advances one step at a time. */
export const walkthrough = (
  title: string,
  intro: string,
  steps: WalkStep[],
): Block => ({ t: "walkthrough", title, intro, steps });

export const stage = (label: string, technique: string, detail: string): ChainStage => ({
  label,
  ...(technique ? { technique } : {}),
  detail,
});

/**
 * A construct-the-answer exercise placed between the reading and the quiz.
 *
 * Matching is on required elements rather than exact text, so there is room for
 * the several correct phrasings any real command has.
 */
export const practice = (
  task: string,
  requires: string[],
  solution: string,
  explanation: string,
  extra: {
    setup?: { label: string; code: string };
    forbids?: string[];
  } = {},
): Block => ({ t: "practice", task, requires, solution, explanation, ...extra });

/** An attack chain that builds up one node at a time rather than arriving whole. */
export const diagram = (
  title: string,
  caption: string,
  stages: ChainStage[],
): Block => ({ t: "diagram", title, caption, stages });

export const lesson = (
  title: string,
  summary: string,
  durationMin: number,
  blocks: Block[],
): Lesson => ({ title, summary, durationMin, blocks });

// ── Expansion to the stored shape ──────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type StoredBlock = {
  type:
    | "TEXT"
    | "CODE"
    | "CALLOUT"
    | "KNOWLEDGE_CHECK"
    | "TERMINAL"
    | "WALKTHROUGH"
    | "DIAGRAM"
    | "PRACTICE";
  content: Record<string, unknown>;
};

/**
 * Expand one authored block into the row shape.
 *
 * Knowledge-check option ids are derived from position, so `correct` can never
 * point at an id that does not exist.
 */
export function expandBlock(b: Block): StoredBlock {
  switch (b.t) {
    case "text":
      return { type: "TEXT", content: { text: b.body } };

    case "code":
      return {
        type: "CODE",
        content: {
          code: b.code,
          language: b.language ?? "text",
          ...(b.caption ? { caption: b.caption } : {}),
        },
      };

    case "callout":
      return {
        type: "CALLOUT",
        content: { title: b.title, text: b.body, variant: b.variant },
      };

    case "terminal":
      return {
        type: "TERMINAL",
        content: { title: b.title, host: b.host, lines: b.lines },
      };

    case "walkthrough":
      return {
        type: "WALKTHROUGH",
        content: { title: b.title, intro: b.intro, steps: b.steps },
      };

    case "diagram":
      return {
        type: "DIAGRAM",
        content: { title: b.title, caption: b.caption, stages: b.stages },
      };

    case "practice":
      return {
        type: "PRACTICE",
        content: {
          task: b.task,
          requires: b.requires,
          solution: b.solution,
          explanation: b.explanation,
          ...(b.setup ? { setup: b.setup } : {}),
          ...(b.forbids?.length ? { forbids: b.forbids } : {}),
        },
      };

    case "check":
      return {
        type: "KNOWLEDGE_CHECK",
        content: {
          question: b.question,
          options: b.options.map((textValue, i) => ({
            id: LETTERS[i],
            text: textValue,
          })),
          correct: LETTERS[b.correct],
          explanation: b.explanation,
        },
      };
  }
}
