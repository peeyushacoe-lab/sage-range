import { describe, it, expect } from "vitest";
import {
  clampMeter,
  applyEffects,
  deadlineOf,
  activeInjects,
  lapsedInjects,
  pendingInjects,
  advanceClock,
  applyDecision,
  isComplete,
  gradeRun,
  clockAt,
  LOSS_CEILING,
  type CrisisScenario,
  type CrisisState,
  type CrisisInject,
} from "@/lib/crisis-engine";

const inject = (over: Partial<CrisisInject> & { id: string }): CrisisInject => ({
  atMinute: 0,
  channel: "SOC",
  title: "t",
  body: "b",
  deadlineMinutes: 30,
  options: [
    { id: "good", label: "good", costMinutes: 10, effects: { containment: 10 }, rationale: "r", ideal: true },
    { id: "bad", label: "bad", costMinutes: 5, effects: { containment: -5 }, rationale: "r" },
  ],
  escalation: { containment: -20, note: "lapsed" },
  ...over,
});

const scenario = (injects: CrisisInject[], over: Partial<CrisisScenario> = {}): CrisisScenario => ({
  slug: "s",
  title: "T",
  description: "d",
  durationMinutes: 480,
  clockStart: "08:30",
  initial: { containment: 50, reputation: 50, morale: 50, financialLoss: 0 },
  injects,
  ...over,
});

const state = (over: Partial<CrisisState> = {}): CrisisState => ({
  minute: 0,
  containment: 50,
  reputation: 50,
  morale: 50,
  financialLoss: 0,
  ...over,
});

describe("clampMeter", () => {
  it("bounds to 0-100 and rounds", () => {
    expect(clampMeter(-10)).toBe(0);
    expect(clampMeter(150)).toBe(100);
    expect(clampMeter(49.6)).toBe(50);
  });

  it("treats NaN as the floor rather than propagating it", () => {
    expect(clampMeter(NaN)).toBe(0);
  });
});

describe("applyEffects", () => {
  it("applies deltas and clamps", () => {
    const next = applyEffects(state({ containment: 95 }), { containment: 20, reputation: -10 });
    expect(next.containment).toBe(100);
    expect(next.reputation).toBe(40);
  });

  it("accumulates financial loss", () => {
    const next = applyEffects(state({ financialLoss: 1000 }), { financialLoss: 500 });
    expect(next.financialLoss).toBe(1500);
  });

  it("never refunds money already lost", () => {
    const next = applyEffects(state({ financialLoss: 1000 }), { financialLoss: -900 });
    expect(next.financialLoss).toBe(1000);
  });

  it("does not mutate the input state", () => {
    const before = state();
    applyEffects(before, { containment: 25 });
    expect(before.containment).toBe(50);
  });
});

describe("timeline queries", () => {
  const s = scenario([
    inject({ id: "a", atMinute: 0, deadlineMinutes: 30 }),
    inject({ id: "b", atMinute: 20, deadlineMinutes: 30 }),
    inject({ id: "c", atMinute: 120, deadlineMinutes: 30 }),
  ]);

  it("lists only arrived, unanswered, in-deadline injects", () => {
    expect(activeInjects(s, 25, []).map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("excludes answered injects", () => {
    expect(activeInjects(s, 25, ["a"]).map((i) => i.id)).toEqual(["b"]);
  });

  it("excludes injects past their deadline", () => {
    // "a" lapsed at minute 30.
    expect(activeInjects(s, 35, []).map((i) => i.id)).toEqual(["b"]);
  });

  it("treats the deadline instant itself as closed", () => {
    expect(activeInjects(s, 30, []).map((i) => i.id)).toEqual(["b"]);
    expect(lapsedInjects(s, 30, []).map((i) => i.id)).toEqual(["a"]);
  });

  it("reports lapsed and pending correctly", () => {
    expect(lapsedInjects(s, 60, ["b"]).map((i) => i.id)).toEqual(["a"]);
    expect(pendingInjects(s, 60).map((i) => i.id)).toEqual(["c"]);
  });

  it("computes the deadline", () => {
    expect(deadlineOf(inject({ id: "x", atMinute: 10, deadlineMinutes: 45 }))).toBe(55);
  });
});

describe("advanceClock", () => {
  const s = scenario([
    inject({ id: "a", atMinute: 0, deadlineMinutes: 30, escalation: { containment: -20, note: "n" } }),
    inject({ id: "b", atMinute: 10, deadlineMinutes: 30, escalation: { reputation: -15, note: "n" } }),
  ]);

  it("applies escalation for injects that lapse in the interval", () => {
    const { state: next, escalated } = advanceClock(s, state(), 45, []);
    expect(escalated.map((i) => i.id)).toEqual(["a", "b"]);
    expect(next.containment).toBe(30);
    expect(next.reputation).toBe(35);
    expect(next.minute).toBe(45);
  });

  it("does not escalate answered injects", () => {
    const { escalated } = advanceClock(s, state(), 45, ["a", "b"]);
    expect(escalated).toEqual([]);
  });

  it("gives the same result stepped or in one jump", () => {
    const oneJump = advanceClock(s, state(), 45, []).state;
    let stepped = state();
    for (const t of [15, 31, 40, 45]) {
      stepped = advanceClock(s, stepped, t, []).state;
    }
    expect(stepped.containment).toBe(oneJump.containment);
    expect(stepped.reputation).toBe(oneJump.reputation);
  });

  it("never penalises the same lapse twice", () => {
    const first = advanceClock(s, state(), 45, []).state;
    const second = advanceClock(s, first, 90, []).state;
    expect(second.containment).toBe(first.containment);
    expect(second.reputation).toBe(first.reputation);
  });

  it("ignores an attempt to move the clock backwards", () => {
    const { state: next, escalated } = advanceClock(s, state({ minute: 60 }), 10, []);
    expect(next.minute).toBe(60);
    expect(escalated).toEqual([]);
  });
});

describe("applyDecision", () => {
  it("applies effects before the clock consumes time", () => {
    // Answering "a" at minute 25 costs 10 minutes, which would push past b's
    // deadline of 40 — but a's own effect must still land in full.
    const s = scenario([
      inject({ id: "a", atMinute: 0, deadlineMinutes: 30 }),
      inject({ id: "b", atMinute: 10, deadlineMinutes: 30, escalation: { containment: -10, note: "n" } }),
    ]);
    const a = s.injects[0];
    const { state: next } = applyDecision(s, state({ minute: 25 }), a, a.options[0], []);
    // +10 from the ideal option, then -10 from b lapsing at minute 40.
    expect(next.minute).toBe(35);
    expect(next.containment).toBe(60);
  });

  it("marks the answered inject so it cannot escalate during its own cost", () => {
    const s = scenario([
      inject({ id: "a", atMinute: 0, deadlineMinutes: 5, escalation: { containment: -50, note: "n" } }),
    ]);
    const a = s.injects[0];
    // Costs 10 minutes, crossing its own 5-minute deadline.
    const { state: next, escalated } = applyDecision(s, state(), a, a.options[0], []);
    expect(escalated).toEqual([]);
    expect(next.containment).toBe(60);
  });

  it("treats a negative cost as zero", () => {
    const s = scenario([inject({ id: "a" })]);
    const a = s.injects[0];
    const option = { ...a.options[0], costMinutes: -30 };
    const { state: next } = applyDecision(s, state({ minute: 20 }), a, option, []);
    expect(next.minute).toBe(20);
  });
});

describe("isComplete", () => {
  const s = scenario([inject({ id: "a", atMinute: 0, deadlineMinutes: 30 })], {
    durationMinutes: 120,
  });

  it("is complete once the scenario duration is reached", () => {
    expect(isComplete(s, 120, [])).toBe(true);
  });

  it("is complete when every inject is answered", () => {
    expect(isComplete(s, 10, ["a"])).toBe(true);
  });

  it("is complete when every inject has lapsed", () => {
    expect(isComplete(s, 31, [])).toBe(true);
  });

  it("is not complete while work remains", () => {
    expect(isComplete(s, 10, [])).toBe(false);
  });
});

describe("gradeRun", () => {
  const s = scenario([
    inject({ id: "a" }),
    inject({ id: "b" }),
    inject({ id: "c" }),
    inject({ id: "d" }),
  ]);

  it("rewards ideal choices", () => {
    const good = gradeRun(s, state({ containment: 90, reputation: 80, morale: 70 }), [
      { injectId: "a", optionId: "good", atMinute: 1 },
      { injectId: "b", optionId: "good", atMinute: 2 },
      { injectId: "c", optionId: "good", atMinute: 3 },
      { injectId: "d", optionId: "good", atMinute: 4 },
    ]);
    expect(good.idealRate).toBe(1);
    expect(good.missed).toBe(0);
    expect(good.band).toBe("EXEMPLARY");
  });

  it("counts unanswered injects against the decision score", () => {
    const partial = gradeRun(s, state({ containment: 90, reputation: 90, morale: 90 }), [
      { injectId: "a", optionId: "good", atMinute: 1 },
    ]);
    expect(partial.missed).toBe(3);
    // Perfect on what they answered, but only a quarter of the incident run.
    expect(partial.idealRate).toBe(1);
    expect(partial.score).toBeLessThan(80);
  });

  it("penalises financial damage up to a ceiling", () => {
    const base = state({ containment: 80, reputation: 80, morale: 80 });
    const decisions = [{ injectId: "a", optionId: "good", atMinute: 1 }];
    const clean = gradeRun(s, base, decisions);
    const costly = gradeRun(s, { ...base, financialLoss: LOSS_CEILING }, decisions);
    const catastrophic = gradeRun(s, { ...base, financialLoss: LOSS_CEILING * 10 }, decisions);

    expect(costly.score).toBeLessThan(clean.score);
    // Beyond the ceiling the penalty stops growing.
    expect(catastrophic.score).toBe(costly.score);
  });

  it("ignores decisions referencing content that no longer exists", () => {
    const grade = gradeRun(s, state(), [
      { injectId: "deleted", optionId: "good", atMinute: 1 },
      { injectId: "a", optionId: "removed-option", atMinute: 2 },
    ]);
    expect(grade.answered).toBe(0);
    expect(grade.missed).toBe(4);
  });

  it("handles a run with no decisions", () => {
    const grade = gradeRun(s, state({ containment: 0, reputation: 0, morale: 0 }), []);
    expect(grade.score).toBe(0);
    expect(grade.idealRate).toBe(0);
    expect(grade.band).toBe("STRUGGLING");
  });

  it("handles a scenario with no injects without dividing by zero", () => {
    const empty = scenario([]);
    const grade = gradeRun(empty, state(), []);
    expect(Number.isNaN(grade.score)).toBe(false);
  });

  it("bands by score", () => {
    const perfect = gradeRun(s, state({ containment: 100, reputation: 100, morale: 100 }), [
      { injectId: "a", optionId: "good", atMinute: 1 },
      { injectId: "b", optionId: "good", atMinute: 2 },
      { injectId: "c", optionId: "good", atMinute: 3 },
      { injectId: "d", optionId: "good", atMinute: 4 },
    ]);
    expect(perfect.score).toBe(100);
    expect(perfect.band).toBe("EXEMPLARY");
  });
});

describe("clockAt", () => {
  const s = scenario([]);

  it("offsets from the scenario start", () => {
    expect(clockAt(s, 0)).toBe("08:30");
    expect(clockAt(s, 45)).toBe("09:15");
    expect(clockAt(s, 90)).toBe("10:00");
  });

  it("wraps past midnight rather than printing hour 25", () => {
    expect(clockAt(s, 16 * 60)).toBe("00:30");
  });
});
