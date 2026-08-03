/**
 * SM-2 spaced repetition scheduling.
 *
 * The Academy had 127 flashcards and no scheduler — they rendered as a list you
 * flipped through once and never saw again, which is the least effective way to
 * use a flashcard. SM-2 turns the same cards into a queue that resurfaces each
 * one just before it would have been forgotten.
 *
 * Pure functions with no database imports. Scheduling decides what a learner
 * sees for months, and a drift here is invisible until retention quietly rots,
 * so the arithmetic is tested directly rather than inferred from clicking
 * through a review session. `now` is always a parameter for the same reason.
 */

// ── Grades ─────────────────────────────────────────────────────────────────

/**
 * What the learner reports after seeing the answer.
 *
 * Four buttons rather than SM-2's original 0-5 scale: self-rating on six levels
 * is noisy, and the extra resolution changes the interval far less than being
 * honest about whether you knew it at all.
 */
export type Grade = "again" | "hard" | "good" | "easy";

export const GRADES: readonly Grade[] = ["again", "hard", "good", "easy"] as const;

export function isGrade(value: unknown): value is Grade {
  return typeof value === "string" && (GRADES as readonly string[]).includes(value);
}

/** SM-2 quality values, on the original 0-5 scale. */
const QUALITY: Record<Grade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

/** Below this quality the card is treated as forgotten. */
const PASS_THRESHOLD = 3;

// ── Tunables ───────────────────────────────────────────────────────────────

export const DEFAULT_EASE = 2.5;

/**
 * Ease never falls below this.
 *
 * At 1.3 a mature card still grows by 30% per success, so a card you find hard
 * keeps getting further apart — slowly. Without a floor, repeated lapses drive
 * ease toward 1.0 and the card is scheduled at a fixed interval forever.
 */
export const MIN_EASE = 1.3;

/** Ease is also capped: beyond this the jumps get long enough to feel random. */
export const MAX_EASE = 3.0;

/** First interval after a card is first answered correctly. */
export const FIRST_INTERVAL_DAYS = 1;

/** Second interval. SM-2's original value, and it holds up. */
export const SECOND_INTERVAL_DAYS = 6;

/** No card is ever scheduled further out than this. */
export const MAX_INTERVAL_DAYS = 365;

/**
 * A failed card comes back after this many minutes, inside the same session.
 *
 * Plain SM-2 sends a lapse to "tomorrow", which means the one card you just
 * proved you do not know is the one card you stop practising. Re-showing it
 * within the session is the single largest departure from the original
 * algorithm here, and it is deliberate.
 */
export const RELEARN_MINUTES = 10;

/** Lapses at or above this mark a card as a leech — worth rewriting, not drilling. */
export const LEECH_THRESHOLD = 8;

/** A card spaced this far out is holding on its own. The conventional line. */
export const MATURE_INTERVAL_DAYS = 21;

// ── State ──────────────────────────────────────────────────────────────────

export type CardState = {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: Date;
  lapses: number;
  reviews: number;
};

export type ReviewResult = CardState & {
  lastGrade: Grade;
  lastReviewedAt: Date;
  /** True when this review reset a card the learner had previously learned. */
  lapsed: boolean;
  /** True when the card is due again inside this session rather than on a later day. */
  relearning: boolean;
};

/** The state a card starts in: due immediately, never seen. */
export function newCardState(now: Date = new Date()): CardState {
  return {
    repetitions: 0,
    intervalDays: 0,
    easeFactor: DEFAULT_EASE,
    dueAt: now,
    lapses: 0,
    reviews: 0,
  };
}

// ── Scheduling ─────────────────────────────────────────────────────────────

/**
 * SM-2's ease adjustment.
 *
 * `q=4` ("good") is the fixed point — it leaves ease unchanged, so a card
 * answered comfortably every time keeps the same growth rate. "hard" shaves it,
 * "easy" raises it, "again" takes a large bite.
 */
export function adjustEase(easeFactor: number, grade: Grade): number {
  const q = QUALITY[grade];
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return clampEase(easeFactor + delta);
}

function clampEase(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_EASE;
  return Math.min(MAX_EASE, Math.max(MIN_EASE, round2(value)));
}

/** Next interval in days for a card that was recalled successfully. */
export function nextInterval(state: CardState, grade: Grade, ease: number): number {
  if (state.repetitions === 0) {
    // "easy" on a brand-new card skips the one-day step: the learner is telling
    // us they already knew it, and showing it again tomorrow wastes the session.
    return grade === "easy" ? SECOND_INTERVAL_DAYS : FIRST_INTERVAL_DAYS;
  }
  if (state.repetitions === 1) return SECOND_INTERVAL_DAYS;

  const grown = state.intervalDays * ease;
  // "hard" advances the card, but by much less than its ease would suggest —
  // otherwise a struggling card gets the same spacing as a comfortable one.
  const scaled = grade === "hard" ? state.intervalDays * 1.2 : grown;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(scaled)));
}

/**
 * Apply one review and return the card's new schedule.
 *
 * Never mutates the state passed in — callers persist the result, and an
 * in-place update would make an optimistic UI disagree with the database.
 */
export function review(state: CardState, grade: Grade, now: Date = new Date()): ReviewResult {
  const ease = adjustEase(state.easeFactor, grade);
  const passed = QUALITY[grade] >= PASS_THRESHOLD;
  const reviews = state.reviews + 1;

  if (!passed) {
    // A lapse only counts against a card that had actually been learned.
    // Failing a card you have never got right is not forgetting, it is still
    // learning, and counting it would flag every new hard card as a leech.
    const wasLearned = state.repetitions > 0;
    return {
      repetitions: 0,
      intervalDays: 0,
      easeFactor: ease,
      dueAt: new Date(now.getTime() + RELEARN_MINUTES * 60_000),
      lapses: state.lapses + (wasLearned ? 1 : 0),
      reviews,
      lastGrade: grade,
      lastReviewedAt: now,
      lapsed: wasLearned,
      relearning: true,
    };
  }

  const intervalDays = nextInterval(state, grade, ease);

  return {
    repetitions: state.repetitions + 1,
    intervalDays,
    easeFactor: ease,
    dueAt: addDays(now, intervalDays),
    lapses: state.lapses,
    reviews,
    lastGrade: grade,
    lastReviewedAt: now,
    lapsed: false,
    relearning: false,
  };
}

// ── Reading a schedule ─────────────────────────────────────────────────────

export function isDue(state: Pick<CardState, "dueAt">, now: Date = new Date()): boolean {
  return state.dueAt.getTime() <= now.getTime();
}

export function isLeech(state: Pick<CardState, "lapses">): boolean {
  return state.lapses >= LEECH_THRESHOLD;
}

export type CardStage = "new" | "learning" | "young" | "mature";

/**
 * How settled a card is.
 *
 * "mature" is the conventional 21-day line: past three weeks a card is holding
 * without much help, and a deck's mature count is the honest measure of what a
 * learner actually knows.
 */
export function stageOf(
  state: Pick<CardState, "repetitions" | "intervalDays" | "reviews">,
): CardStage {
  if (state.reviews === 0) return "new";
  if (state.repetitions === 0) return "learning";
  return state.intervalDays >= MATURE_INTERVAL_DAYS ? "mature" : "young";
}

/**
 * Preview what each button would do, for the labels under the grade buttons.
 *
 * Showing the cost of each choice up front is what stops learners pressing
 * "easy" on everything — the four-week jump is visible before they commit.
 */
export function intervalPreview(
  state: CardState,
  now: Date = new Date(),
): Record<Grade, string> {
  const out = {} as Record<Grade, string>;
  for (const grade of GRADES) {
    const result = review(state, grade, now);
    out[grade] = result.relearning
      ? `${RELEARN_MINUTES}m`
      : formatInterval(result.intervalDays);
  }
  return out;
}

export function formatInterval(days: number): string {
  if (days < 1) return "<1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}y`;
}

/**
 * Order a session's cards.
 *
 * Cards already in relearning come first — they are the ones actively being
 * forgotten, and burying them behind a long queue of fresh cards is how a
 * session ends with the hard material untouched. Overdue cards follow, oldest
 * first, then new material.
 */
export function sortForSession<T extends { state: CardState }>(
  cards: readonly T[],
  now: Date = new Date(),
): T[] {
  return [...cards].sort((a, b) => {
    const rankA = sessionRank(a.state, now);
    const rankB = sessionRank(b.state, now);
    if (rankA !== rankB) return rankA - rankB;
    return a.state.dueAt.getTime() - b.state.dueAt.getTime();
  });
}

function sessionRank(state: CardState, now: Date): number {
  if (state.reviews > 0 && state.repetitions === 0) return 0; // relearning
  if (isDue(state, now) && state.reviews > 0) return 1; // due review
  return 2; // new
}

export type DeckStats = {
  total: number;
  due: number;
  new: number;
  learning: number;
  young: number;
  mature: number;
  leeches: number;
};

export function deckStats(states: readonly CardState[], now: Date = new Date()): DeckStats {
  const stats: DeckStats = {
    total: states.length,
    due: 0,
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
    leeches: 0,
  };

  for (const state of states) {
    if (isDue(state, now)) stats.due++;
    if (isLeech(state)) stats.leeches++;

    switch (stageOf(state)) {
      case "new": stats.new++; break;
      case "learning": stats.learning++; break;
      case "mature": stats.mature++; break;
      case "young": stats.young++; break;
    }
  }

  return stats;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
