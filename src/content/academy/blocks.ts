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

export type Block =
  | { t: "text"; body: string }
  | { t: "code"; code: string; language?: string; caption?: string }
  | { t: "callout"; title: string; body: string; variant: CalloutVariant }
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

export const lesson = (
  title: string,
  summary: string,
  durationMin: number,
  blocks: Block[],
): Lesson => ({ title, summary, durationMin, blocks });

// ── Expansion to the stored shape ──────────────────────────────────────────

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type StoredBlock = {
  type: "TEXT" | "CODE" | "CALLOUT" | "KNOWLEDGE_CHECK";
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
