/**
 * Flashcard review queue — the thin database layer over src/lib/spaced-repetition.
 *
 * All scheduling arithmetic lives in that module and is tested there. This file
 * only decides *which* cards a learner is allowed to see and persists the
 * result, so it stays small enough to read in one go.
 *
 * Access rule: a learner reviews cards from courses they are enrolled in, and
 * nothing else. Enrolment is checked on every query rather than trusted from
 * the client, so a guessed flashcard id gains nothing.
 */

import { db } from "@/lib/db";
import {
  review as applyReview,
  newCardState,
  sortForSession,
  deckStats,
  type CardState,
  type DeckStats,
  type Grade,
} from "@/lib/spaced-repetition";

/** How many cards one session serves. Long enough to matter, short enough to finish. */
export const SESSION_SIZE = 20;

/** New cards introduced per session, so a big enrolment does not bury reviews. */
export const NEW_PER_SESSION = 5;

export type ReviewCard = {
  id: string;
  front: string;
  back: string;
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  state: CardState;
};

/** Flashcard ids from every course this user is enrolled in. */
async function enrolledCardIds(userId: string): Promise<string[]> {
  const cards = await db.academyFlashcard.findMany({
    where: {
      lesson: {
        published: true,
        module: {
          published: true,
          course: { enrollments: { some: { userId } } },
        },
      },
    },
    select: { id: true },
  });
  return cards.map((c) => c.id);
}

function toState(row: {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: Date;
  lapses: number;
  reviews: number;
}): CardState {
  return {
    repetitions: row.repetitions,
    intervalDays: row.intervalDays,
    easeFactor: row.easeFactor,
    dueAt: row.dueAt,
    lapses: row.lapses,
    reviews: row.reviews,
  };
}

/**
 * Build the next review session.
 *
 * Cards the learner has never seen have no review row, so their state is
 * synthesised rather than written — a learner who opens the review page and
 * leaves without answering should not acquire 127 rows of scheduling state.
 */
export async function getSession(
  userId: string,
  now: Date = new Date(),
  limit: number = SESSION_SIZE,
): Promise<{ cards: ReviewCard[]; stats: DeckStats; nextDueAt: Date | null }> {
  const allowedIds = await enrolledCardIds(userId);
  if (allowedIds.length === 0) {
    return { cards: [], stats: deckStats([], now), nextDueAt: null };
  }

  const [cards, reviews] = await Promise.all([
    db.academyFlashcard.findMany({
      where: { id: { in: allowedIds } },
      orderBy: [{ lessonId: "asc" }, { order: "asc" }],
      select: {
        id: true,
        front: true,
        back: true,
        lessonId: true,
        lesson: {
          select: {
            title: true,
            module: { select: { course: { select: { slug: true, title: true } } } },
          },
        },
      },
    }),
    db.academyCardReview.findMany({
      where: { userId, flashcardId: { in: allowedIds } },
    }),
  ]);

  const byCard = new Map(reviews.map((r) => [r.flashcardId, toState(r)]));

  const all: ReviewCard[] = cards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    lessonId: c.lessonId,
    lessonTitle: c.lesson.title,
    courseSlug: c.lesson.module.course.slug,
    courseTitle: c.lesson.module.course.title,
    state: byCard.get(c.id) ?? newCardState(now),
  }));

  const stats = deckStats(all.map((c) => c.state), now);

  const due = all.filter((c) => c.state.dueAt.getTime() <= now.getTime());
  const seen = due.filter((c) => c.state.reviews > 0);
  const fresh = due.filter((c) => c.state.reviews === 0);

  // Reviews first and in full; new cards only fill what is left, capped. A deck
  // where every card is introduced at once comes due all at once a week later,
  // which is how learners abandon spaced repetition.
  const dueReviews = sortForSession(seen, now).slice(0, limit);
  const room = Math.max(0, Math.min(NEW_PER_SESSION, limit - dueReviews.length));
  const selected = [...dueReviews, ...fresh.slice(0, room)];

  const upcoming = all
    .filter((c) => c.state.dueAt.getTime() > now.getTime())
    .sort((a, b) => a.state.dueAt.getTime() - b.state.dueAt.getTime())[0];

  return {
    cards: sortForSession(selected, now),
    stats,
    nextDueAt: upcoming?.state.dueAt ?? null,
  };
}

export type GradeOutcome = {
  ok: true;
  dueAt: Date;
  intervalDays: number;
  relearning: boolean;
  lapsed: boolean;
};

/**
 * Record one graded review.
 *
 * Returns null when the card is not one this learner may review, which the
 * route turns into a 404 — the same response an unknown id gets, so the
 * endpoint does not confirm which flashcards exist.
 */
export async function gradeCard(
  userId: string,
  flashcardId: string,
  grade: Grade,
  now: Date = new Date(),
): Promise<GradeOutcome | null> {
  const card = await db.academyFlashcard.findFirst({
    where: {
      id: flashcardId,
      lesson: {
        published: true,
        module: { published: true, course: { enrollments: { some: { userId } } } },
      },
    },
    select: { id: true },
  });
  if (!card) return null;

  const existing = await db.academyCardReview.findUnique({
    where: { userId_flashcardId: { userId, flashcardId } },
  });

  const result = applyReview(existing ? toState(existing) : newCardState(now), grade, now);

  const persisted = {
    repetitions: result.repetitions,
    intervalDays: result.intervalDays,
    easeFactor: result.easeFactor,
    dueAt: result.dueAt,
    lapses: result.lapses,
    reviews: result.reviews,
    lastGrade: result.lastGrade,
    lastReviewedAt: result.lastReviewedAt,
  };

  await db.academyCardReview.upsert({
    where: { userId_flashcardId: { userId, flashcardId } },
    create: { userId, flashcardId, ...persisted },
    update: persisted,
  });

  return {
    ok: true,
    dueAt: result.dueAt,
    intervalDays: result.intervalDays,
    relearning: result.relearning,
    lapsed: result.lapsed,
  };
}

/** Deck counters for the Academy landing page, without loading card text. */
export async function getDeckSummary(
  userId: string,
  now: Date = new Date(),
): Promise<DeckStats> {
  const allowedIds = await enrolledCardIds(userId);
  if (allowedIds.length === 0) return deckStats([], now);

  const reviews = await db.academyCardReview.findMany({
    where: { userId, flashcardId: { in: allowedIds } },
  });

  const byCard = new Map(reviews.map((r) => [r.flashcardId, toState(r)]));
  const states = allowedIds.map((id) => byCard.get(id) ?? newCardState(now));
  return deckStats(states, now);
}
