"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import {
  intervalPreview,
  formatInterval,
  GRADES,
  type CardState,
  type Grade,
} from "@/lib/spaced-repetition";

type SerialisedState = Omit<CardState, "dueAt"> & { dueAt: string };

export type ReviewCardDTO = {
  id: string;
  front: string;
  back: string;
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  state: SerialisedState;
};

export type DeckStatsDTO = {
  total: number;
  due: number;
  new: number;
  learning: number;
  young: number;
  mature: number;
  leeches: number;
};

const GRADE_LABEL: Record<Grade, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

const GRADE_STYLE: Record<Grade, string> = {
  again: "border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  hard: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
  easy: "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20",
};

/** Keyboard shortcut per grade — the reason a practised learner can review fast. */
const GRADE_KEY: Record<Grade, string> = { again: "1", hard: "2", good: "3", easy: "4" };

function hydrate(state: SerialisedState): CardState {
  return { ...state, dueAt: new Date(state.dueAt) };
}

export function ReviewClient({
  initialCards,
  initialStats,
  nextDueAt,
}: {
  initialCards: ReviewCardDTO[];
  initialStats: DeckStatsDTO;
  nextDueAt: string | null;
}) {
  const [queue, setQueue] = useState<ReviewCardDTO[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const card = queue[index] ?? null;
  const reviewed = done.again + done.hard + done.good + done.easy;

  const previews = useMemo(
    () => (card ? intervalPreview(hydrate(card.state)) : null),
    [card],
  );

  const grade = useCallback(
    async (choice: Grade) => {
      if (!card || submitting || !revealed) return;
      setSubmitting(true);

      try {
        await fetch("/api/academy/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flashcardId: card.id, grade: choice }),
        });
      } catch {
        // A dropped grade costs one card's scheduling, not the session. The
        // learner keeps going; the card simply stays due.
      }

      setDone((d) => ({ ...d, [choice]: d[choice] + 1 }));

      // "Again" puts the card back at the end of this session rather than
      // dropping it — the card you just failed is the one worth seeing twice.
      setQueue((q) => (choice === "again" ? [...q, card] : q));
      setIndex((i) => i + 1);
      setRevealed(false);
      setSubmitting(false);
    },
    [card, revealed, submitting],
  );

  // Space reveals, 1-4 grade. Reviewing 20 cards with a mouse is tedious enough
  // that people stop doing it daily, which defeats the whole mechanic.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;

      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
        else void grade("good");
        return;
      }
      const match = GRADES.find((g) => GRADE_KEY[g] === e.key);
      if (match && revealed) {
        e.preventDefault();
        void grade(match);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, grade]);

  if (!card) {
    return (
      <SessionComplete
        reviewed={reviewed}
        done={done}
        stats={initialStats}
        nextDueAt={nextDueAt}
        hadCards={initialCards.length > 0}
      />
    );
  }

  const state = hydrate(card.state);
  const isNew = state.reviews === 0;
  const progress = Math.round((index / queue.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Session progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 text-[11px] text-zinc-500">
          <span>
            Card {index + 1} of {queue.length}
          </span>
          <span className="tabular-nums">{reviewed} reviewed</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-white/8 bg-zinc-900/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
          <Link
            href={`/academy/${card.courseSlug}/learn/${card.lessonId}`}
            className="text-[11px] text-zinc-500 hover:text-emerald-400 transition truncate"
          >
            {card.courseTitle} — {card.lessonTitle}
          </Link>
          <span
            className={`text-[10px] px-2 py-0.5 rounded border shrink-0 ml-3 ${
              isNew
                ? "text-sky-400 border-sky-500/25 bg-sky-500/10"
                : "text-zinc-500 border-white/8"
            }`}
          >
            {isNew ? "New" : `Seen ${state.reviews}×`}
          </span>
        </div>

        <div className="px-6 py-10 min-h-[16rem] flex flex-col items-center justify-center text-center">
          <p className="text-lg font-semibold text-zinc-100 leading-relaxed">{card.front}</p>

          {revealed && (
            <>
              <div className="w-full h-px bg-white/8 my-6" />
              <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-line">
                {card.back}
              </p>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/6">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition"
            >
              Show answer
              <span className="ml-2 text-[10px] text-zinc-500 font-normal">Space</span>
            </button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g) => (
                <button
                  key={g}
                  onClick={() => void grade(g)}
                  disabled={submitting}
                  className={`py-3 rounded-xl border text-xs font-semibold transition disabled:opacity-40 ${GRADE_STYLE[g]}`}
                >
                  <span className="block">{GRADE_LABEL[g]}</span>
                  <span className="block text-[10px] opacity-70 font-normal mt-0.5 tabular-nums">
                    {previews?.[g]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-zinc-600">
        {revealed
          ? "1 Again · 2 Hard · 3 Good · 4 Easy"
          : "Try to recall the answer before revealing — the effort is what makes it stick."}
      </p>
    </div>
  );
}

function SessionComplete({
  reviewed,
  done,
  stats,
  nextDueAt,
  hadCards,
}: {
  reviewed: number;
  done: Record<Grade, number>;
  stats: DeckStatsDTO;
  nextDueAt: string | null;
  hadCards: boolean;
}) {
  const nothingEnrolled = stats.total === 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
        <Icon name="check" size={26} className="text-emerald-400" />
      </div>

      {nothingEnrolled ? (
        <>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">No cards yet</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Flashcards come from the courses you are enrolled in. Enrol in a course and its
            cards join your review queue automatically.
          </p>
          <Link
            href="/academy"
            className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            Browse courses
          </Link>
        </>
      ) : (
        <>
          <h2 className="text-xl font-bold text-zinc-100 mb-2">
            {reviewed > 0 ? "Session complete" : hadCards ? "Nothing left today" : "All caught up"}
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            {reviewed > 0
              ? `You reviewed ${reviewed} card${reviewed === 1 ? "" : "s"}. Come back tomorrow — spacing only works if it is spaced.`
              : "Every card in your deck is scheduled for a later day."}
          </p>

          {reviewed > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-6">
              {GRADES.map((g) => (
                <div key={g} className="rounded-xl border border-white/8 bg-zinc-900/60 py-3">
                  <p className="text-lg font-bold text-zinc-200 tabular-nums">{done[g]}</p>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
                    {GRADE_LABEL[g]}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-white/8 bg-zinc-900/40 px-5 py-4 mb-6 text-left">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-3">Your deck</p>
            <div className="grid grid-cols-4 gap-3 text-center">
              <DeckStat label="New" value={stats.new} tone="text-sky-400" />
              <DeckStat label="Learning" value={stats.learning} tone="text-amber-400" />
              <DeckStat label="Young" value={stats.young} tone="text-zinc-300" />
              <DeckStat label="Mature" value={stats.mature} tone="text-emerald-400" />
            </div>
            {nextDueAt && (
              <p className="mt-4 pt-3 border-t border-white/6 text-[11px] text-zinc-600">
                Next card due {formatDue(nextDueAt)}
              </p>
            )}
          </div>

          <Link
            href="/academy"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold px-5 py-2.5 rounded-xl transition"
          >
            Back to Academy
          </Link>
        </>
      )}
    </div>
  );
}

function DeckStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">{label}</p>
    </div>
  );
}

function formatDue(iso: string): string {
  const days = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000));
  if (days === 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${formatInterval(days)}`;
}
