/**
 * Checking in-lesson practice answers.
 *
 * The Academy's knowledge checks test recall: pick the right option. Practice
 * asks the learner to *construct* something — a command, a query, a rule
 * condition — which is the skill the labs actually require. This module decides
 * whether a constructed answer is right, and how much to give away when it is
 * not.
 *
 * Matching is on required elements rather than an exact string. There are many
 * correct ways to write the same command, and grading on exact text teaches
 * learners to memorise one phrasing instead of understanding the parts.
 *
 * Pure functions, no imports. What counts as correct is the whole substance of
 * a practice exercise, so it is tested directly.
 */

export type PracticeSpec = {
  /** Every one of these must appear in the answer. */
  requires: readonly string[];
  /**
   * None of these may appear.
   *
   * For catching the plausible wrong approach specifically — a learner who
   * reaches for `grep -c` when the exercise is about `uniq -c` should be told
   * what is wrong, not just that something is.
   */
  forbids?: readonly string[];
  /** Off by default: shell flags differ in case, but learners should not be tripped by `SHA256`. */
  caseSensitive?: boolean;
};

export type PracticeResult = {
  correct: boolean;
  /** Required elements found, in the order the spec lists them. */
  present: string[];
  missing: string[];
  /** Forbidden elements the answer used. */
  violations: string[];
  /** 0-1, for the progress indicator. Counts required elements only. */
  progress: number;
};

/**
 * Collapse the differences that should not decide correctness.
 *
 * Whitespace runs become single spaces so that alignment and line breaks do not
 * matter, and the answer is trimmed. Nothing else is altered — removing
 * punctuation would make quoting mistakes invisible, and quoting is half of
 * what shell practice teaches.
 */
export function normalise(text: string, caseSensitive = false): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return caseSensitive ? collapsed : collapsed.toLowerCase();
}

export function checkPractice(answer: string, spec: PracticeSpec): PracticeResult {
  const cased = spec.caseSensitive ?? false;
  const haystack = normalise(answer, cased);

  const present: string[] = [];
  const missing: string[] = [];

  for (const token of spec.requires) {
    const needle = normalise(token, cased);
    // An empty required token would match everything and silently pass the
    // exercise, so it counts as missing rather than as satisfied.
    if (needle.length > 0 && haystack.includes(needle)) present.push(token);
    else missing.push(token);
  }

  const violations = (spec.forbids ?? []).filter((token) => {
    const needle = normalise(token, cased);
    return needle.length > 0 && haystack.includes(needle);
  });

  const total = spec.requires.length;

  return {
    correct: haystack.length > 0 && missing.length === 0 && violations.length === 0,
    present,
    missing,
    violations,
    progress: total === 0 ? 0 : present.length / total,
  };
}

// ── How much to give away ──────────────────────────────────────────────────

export type RevealLevel = "count" | "partial" | "full";

/**
 * What a learner is told after a failed attempt.
 *
 * The first miss says only how many elements are missing. Naming them
 * immediately turns construction back into transcription, and the struggle
 * before the hint is where the learning happens. By the third attempt the
 * learner is stuck rather than thinking, and withholding stops helping.
 */
export function revealLevel(attempts: number): RevealLevel {
  if (attempts <= 1) return "count";
  if (attempts === 2) return "partial";
  return "full";
}

/** Required elements to name, given how many attempts have been made. */
export function hintsFor(result: PracticeResult, attempts: number): string[] {
  switch (revealLevel(attempts)) {
    case "count":
      return [];
    case "partial":
      // One at a time, so the learner still assembles the rest themselves.
      return result.missing.slice(0, 1);
    case "full":
      return [...result.missing];
  }
}

/** Whether the worked solution should be offered yet. */
export function canRevealSolution(attempts: number): boolean {
  return attempts >= 2;
}

export type PracticeFeedback = {
  status: "correct" | "wrong-approach" | "incomplete" | "empty";
  message: string;
  hints: string[];
  offerSolution: boolean;
};

/** The whole response to one submission, ready for the component to render. */
export function feedbackFor(
  answer: string,
  spec: PracticeSpec,
  attempts: number,
): PracticeFeedback {
  const result = checkPractice(answer, spec);

  if (answer.trim().length === 0) {
    return {
      status: "empty",
      message: "Write something first — a wrong attempt is more useful than none.",
      hints: [],
      offerSolution: false,
    };
  }

  if (result.correct) {
    return {
      status: "correct",
      message: "That works.",
      hints: [],
      offerSolution: false,
    };
  }

  // A forbidden element is a specific misconception, so it is worth saying so
  // even on the first attempt — it is feedback about the approach, not the
  // answer.
  if (result.violations.length > 0) {
    return {
      status: "wrong-approach",
      message: `Not quite — ${result.violations[0]} is the wrong tool for this.`,
      hints: hintsFor(result, attempts),
      offerSolution: canRevealSolution(attempts),
    };
  }

  const remaining = result.missing.length;
  return {
    status: "incomplete",
    message:
      remaining === 1
        ? "Close — one element is still missing."
        : `Not yet — ${remaining} elements are still missing.`,
    hints: hintsFor(result, attempts),
    offerSolution: canRevealSolution(attempts),
  };
}
