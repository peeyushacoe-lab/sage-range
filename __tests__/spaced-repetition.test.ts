import { describe, it, expect } from "vitest";
import {
  review,
  newCardState,
  adjustEase,
  nextInterval,
  isDue,
  isLeech,
  stageOf,
  deckStats,
  sortForSession,
  intervalPreview,
  formatInterval,
  isGrade,
  GRADES,
  DEFAULT_EASE,
  MIN_EASE,
  MAX_EASE,
  MAX_INTERVAL_DAYS,
  RELEARN_MINUTES,
  LEECH_THRESHOLD,
  SECOND_INTERVAL_DAYS,
  type CardState,
  type Grade,
} from "@/lib/spaced-repetition";

const NOW = new Date("2026-08-03T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

/** Drive a card through a run of grades and return where it lands. */
function drill(grades: Grade[], start: CardState = newCardState(NOW)): CardState {
  let state = start;
  let clock = NOW;
  for (const grade of grades) {
    state = review(state, grade, clock);
    clock = state.dueAt;
  }
  return state;
}

describe("spaced repetition — grades", () => {
  it("accepts exactly the four grades and rejects anything else", () => {
    for (const g of GRADES) expect(isGrade(g)).toBe(true);
    for (const bad of ["GOOD", "", "5", null, undefined, 4, {}]) {
      expect(isGrade(bad), String(bad)).toBe(false);
    }
  });
});

describe("spaced repetition — ease", () => {
  it("leaves ease unchanged on 'good', the fixed point of the curve", () => {
    expect(adjustEase(DEFAULT_EASE, "good")).toBe(DEFAULT_EASE);
    expect(adjustEase(2.0, "good")).toBe(2.0);
  });

  it("lowers ease on 'hard' and raises it on 'easy'", () => {
    expect(adjustEase(DEFAULT_EASE, "hard")).toBeLessThan(DEFAULT_EASE);
    expect(adjustEase(DEFAULT_EASE, "easy")).toBeGreaterThan(DEFAULT_EASE);
  });

  it("takes a larger bite on 'again' than on 'hard'", () => {
    const afterHard = DEFAULT_EASE - adjustEase(DEFAULT_EASE, "hard");
    const afterAgain = DEFAULT_EASE - adjustEase(DEFAULT_EASE, "again");
    expect(afterAgain).toBeGreaterThan(afterHard);
  });

  it("never falls below the floor, however many failures", () => {
    let ease = DEFAULT_EASE;
    for (let i = 0; i < 50; i++) ease = adjustEase(ease, "again");
    expect(ease).toBe(MIN_EASE);
  });

  it("never rises above the cap, however many easy answers", () => {
    let ease = DEFAULT_EASE;
    for (let i = 0; i < 50; i++) ease = adjustEase(ease, "easy");
    expect(ease).toBe(MAX_EASE);
  });

  it("recovers a floored ease when the card is learned again", () => {
    // A card that becomes easy after a bad run must be able to climb back out,
    // or one bad week permanently caps how far apart it can ever be scheduled.
    let ease = MIN_EASE;
    for (let i = 0; i < 5; i++) ease = adjustEase(ease, "easy");
    expect(ease).toBeGreaterThan(MIN_EASE);
  });

  it("falls back to the default rather than propagating a non-finite ease", () => {
    expect(adjustEase(Number.NaN, "good")).toBe(DEFAULT_EASE);
    expect(adjustEase(Number.POSITIVE_INFINITY, "good")).toBe(DEFAULT_EASE);
  });
});

describe("spaced repetition — intervals", () => {
  it("schedules a new card one day out on the first success", () => {
    const r = review(newCardState(NOW), "good", NOW);
    expect(r.intervalDays).toBe(1);
    expect(daysBetween(NOW, r.dueAt)).toBe(1);
    expect(r.repetitions).toBe(1);
  });

  it("skips the one-day step when a new card is graded 'easy'", () => {
    const r = review(newCardState(NOW), "easy", NOW);
    expect(r.intervalDays).toBe(SECOND_INTERVAL_DAYS);
  });

  it("uses the six-day step on the second success", () => {
    const state = drill(["good"]);
    expect(state.intervalDays).toBe(1);
    const second = review(state, "good", state.dueAt);
    expect(second.intervalDays).toBe(SECOND_INTERVAL_DAYS);
  });

  it("multiplies by ease once a card is past the fixed steps", () => {
    const state: CardState = {
      repetitions: 2,
      intervalDays: 10,
      easeFactor: 2.5,
      dueAt: NOW,
      lapses: 0,
      reviews: 2,
    };
    expect(nextInterval(state, "good", 2.5)).toBe(25);
  });

  it("advances a 'hard' card by much less than its ease would give", () => {
    const state: CardState = {
      repetitions: 4,
      intervalDays: 30,
      easeFactor: 2.5,
      dueAt: NOW,
      lapses: 0,
      reviews: 4,
    };
    const hard = nextInterval(state, "hard", 2.36);
    const good = nextInterval(state, "good", 2.5);
    expect(hard).toBeGreaterThan(state.intervalDays);
    expect(hard).toBeLessThan(good);
  });

  it("grows monotonically across a long clean run", () => {
    let state = newCardState(NOW);
    let clock = NOW;
    let previous = 0;
    for (let i = 0; i < 12; i++) {
      state = review(state, "good", clock);
      expect(state.intervalDays).toBeGreaterThanOrEqual(previous);
      previous = state.intervalDays;
      clock = state.dueAt;
    }
    expect(previous).toBeGreaterThan(100);
  });

  it("caps the interval so nothing is scheduled past a year", () => {
    const state: CardState = {
      repetitions: 20,
      intervalDays: 900,
      easeFactor: MAX_EASE,
      dueAt: NOW,
      lapses: 0,
      reviews: 20,
    };
    const r = review(state, "easy", NOW);
    expect(r.intervalDays).toBe(MAX_INTERVAL_DAYS);
  });
});

describe("spaced repetition — failure and relearning", () => {
  it("brings a failed card back inside the same session, not tomorrow", () => {
    const learned = drill(["good", "good"]);
    const failed = review(learned, "again", NOW);

    expect(failed.relearning).toBe(true);
    expect(failed.dueAt.getTime()).toBe(NOW.getTime() + RELEARN_MINUTES * 60_000);
    // The whole point: the card you just proved you don't know is not the card
    // that disappears from the session.
    expect(failed.dueAt.getTime()).toBeLessThan(NOW.getTime() + DAY);
  });

  it("resets the repetition count on failure", () => {
    const learned = drill(["good", "good", "good"]);
    expect(learned.repetitions).toBe(3);
    expect(review(learned, "again", NOW).repetitions).toBe(0);
  });

  it("counts a lapse only for a card that had actually been learned", () => {
    const fresh = review(newCardState(NOW), "again", NOW);
    expect(fresh.lapses).toBe(0);
    expect(fresh.lapsed).toBe(false);

    const learned = review(drill(["good"]), "again", NOW);
    expect(learned.lapses).toBe(1);
    expect(learned.lapsed).toBe(true);
  });

  it("counts every review, passed or failed", () => {
    let state = newCardState(NOW);
    state = review(state, "again", NOW);
    state = review(state, "again", NOW);
    state = review(state, "good", NOW);
    expect(state.reviews).toBe(3);
  });

  it("rebuilds a lapsed card from the start rather than resuming its old interval", () => {
    const mature: CardState = {
      repetitions: 6,
      intervalDays: 90,
      easeFactor: 2.5,
      dueAt: NOW,
      lapses: 0,
      reviews: 6,
    };
    const failed = review(mature, "again", NOW);
    const recovered = review(failed, "good", failed.dueAt);
    expect(recovered.intervalDays).toBe(1);
  });

  it("flags a card as a leech once it has been forgotten enough times", () => {
    let state = newCardState(NOW);
    for (let i = 0; i < LEECH_THRESHOLD; i++) {
      state = review(state, "good", state.dueAt);
      state = review(state, "again", state.dueAt);
    }
    expect(state.lapses).toBe(LEECH_THRESHOLD);
    expect(isLeech(state)).toBe(true);
  });

  it("does not treat an ordinary struggling card as a leech", () => {
    const state = drill(["again", "again", "good", "hard"]);
    expect(isLeech(state)).toBe(false);
  });
});

describe("spaced repetition — purity", () => {
  it("never mutates the state it is given", () => {
    const state = newCardState(NOW);
    const snapshot = { ...state };
    review(state, "easy", NOW);
    review(state, "again", NOW);
    expect(state).toEqual(snapshot);
  });

  it("is deterministic for the same input", () => {
    const state = drill(["good", "hard"]);
    const a = review(state, "good", NOW);
    const b = review(state, "good", NOW);
    expect(a).toEqual(b);
  });
});

describe("spaced repetition — reading a schedule", () => {
  it("treats a card as due at its due moment and not before", () => {
    const state = { dueAt: NOW };
    expect(isDue(state, new Date(NOW.getTime() - 1))).toBe(false);
    expect(isDue(state, NOW)).toBe(true);
    expect(isDue(state, new Date(NOW.getTime() + 1))).toBe(true);
  });

  it("classifies a card by how settled it is", () => {
    expect(stageOf({ repetitions: 0, intervalDays: 0, reviews: 0 })).toBe("new");
    expect(stageOf({ repetitions: 0, intervalDays: 0, reviews: 3 })).toBe("learning");
    expect(stageOf({ repetitions: 2, intervalDays: 6, reviews: 2 })).toBe("young");
    expect(stageOf({ repetitions: 5, intervalDays: 21, reviews: 5 })).toBe("mature");
  });

  it("counts a deck into stages that add up to its size", () => {
    const states = [
      newCardState(NOW),
      drill(["good"]),
      drill(["good", "good", "good", "good"]),
      review(drill(["good"]), "again", NOW),
    ];
    const stats = deckStats(states, NOW);
    expect(stats.total).toBe(4);
    expect(stats.new + stats.learning + stats.young + stats.mature).toBe(stats.total);
  });

  it("counts a card due today as due", () => {
    const stats = deckStats([newCardState(NOW)], NOW);
    expect(stats.due).toBe(1);
  });

  it("puts relearning cards ahead of new material", () => {
    const relearning = { state: review(drill(["good"]), "again", NOW) };
    const fresh = { state: newCardState(NOW) };
    const dueReview = { state: { ...drill(["good", "good"]), dueAt: new Date(NOW.getTime() - DAY) } };

    const ordered = sortForSession([fresh, dueReview, relearning], NOW);
    expect(ordered[0]).toBe(relearning);
    expect(ordered[1]).toBe(dueReview);
    expect(ordered[2]).toBe(fresh);
  });

  it("does not mutate the array it sorts", () => {
    const cards = [{ state: newCardState(NOW) }, { state: drill(["good"]) }];
    const before = [...cards];
    sortForSession(cards, NOW);
    expect(cards).toEqual(before);
  });
});

describe("spaced repetition — button previews", () => {
  it("previews an interval for every grade", () => {
    const preview = intervalPreview(newCardState(NOW), NOW);
    expect(Object.keys(preview).sort()).toEqual([...GRADES].sort());
    for (const g of GRADES) expect(preview[g].length).toBeGreaterThan(0);
  });

  it("shows 'again' as minutes rather than days", () => {
    const preview = intervalPreview(drill(["good", "good"]), NOW);
    expect(preview.again).toBe(`${RELEARN_MINUTES}m`);
  });

  it("previews the interval the grade would actually produce", () => {
    const state = drill(["good", "good"]);
    const preview = intervalPreview(state, NOW);
    expect(preview.good).toBe(formatInterval(review(state, "good", NOW).intervalDays));
  });

  it("formats intervals at a scale a learner can read", () => {
    expect(formatInterval(1)).toBe("1d");
    expect(formatInterval(29)).toBe("29d");
    expect(formatInterval(30)).toBe("1mo");
    expect(formatInterval(180)).toBe("6mo");
    expect(formatInterval(365)).toBe("1.0y");
  });
});
