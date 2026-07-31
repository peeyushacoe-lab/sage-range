/**
 * Cyber Crisis Command Center — simulation engine.
 *
 * Pure functions, no database imports. The engine decides what the incident
 * commander is facing, what their choices cost, and how the run is finally
 * graded, so those rules are unit-tested directly rather than inferred from
 * clicking through the UI.
 *
 * Time is a compressed simulation clock rather than wall-clock: a decision
 * costs sim-minutes and injects have sim-time deadlines. An eight-hour crisis
 * day is therefore playable in one sitting and, more importantly, replays
 * identically for a given sequence of choices.
 */

// ── Meters ─────────────────────────────────────────────────────────────────

/** Bounded 0-100 meters where higher is better. */
export type BoundedMeter = "containment" | "reputation" | "morale";

export type CrisisState = {
  /** Sim-minutes elapsed since the incident opened. */
  minute: number;
  containment: number;
  reputation: number;
  morale: number;
  /** Accumulated loss in whole currency units. Only ever increases. */
  financialLoss: number;
};

export type MeterEffects = Partial<{
  containment: number;
  reputation: number;
  morale: number;
  /** Positive numbers add loss. Negative values are ignored — you cannot un-spend. */
  financialLoss: number;
}>;

export const METER_MIN = 0;
export const METER_MAX = 100;

export function clampMeter(value: number): number {
  if (Number.isNaN(value)) return METER_MIN;
  return Math.max(METER_MIN, Math.min(METER_MAX, Math.round(value)));
}

/**
 * Apply effects to a state, returning a new state.
 *
 * Financial loss is monotonic: a decision can slow the bleeding but never
 * refund money already lost, so a negative delta is clamped to zero rather
 * than crediting the balance.
 */
export function applyEffects(state: CrisisState, effects: MeterEffects): CrisisState {
  return {
    ...state,
    containment: clampMeter(state.containment + (effects.containment ?? 0)),
    reputation: clampMeter(state.reputation + (effects.reputation ?? 0)),
    morale: clampMeter(state.morale + (effects.morale ?? 0)),
    financialLoss: state.financialLoss + Math.max(0, effects.financialLoss ?? 0),
  };
}

// ── Scenario content ───────────────────────────────────────────────────────

export type CrisisChannel =
  | "SOC"
  | "EXEC"
  | "LEGAL"
  | "MEDIA"
  | "CUSTOMER"
  | "LAW_ENFORCEMENT"
  | "INFRA";

export type CrisisOption = {
  id: string;
  label: string;
  detail?: string;
  /** Sim-minutes this choice consumes. */
  costMinutes: number;
  effects: MeterEffects;
  /** Shown in the debrief to explain why this was or was not the right call. */
  rationale: string;
  /** Marks the defensible best-practice choice for scoring. */
  ideal?: boolean;
};

export type CrisisInject = {
  id: string;
  /** Sim-minute at which this lands in the commander's queue. */
  atMinute: number;
  channel: CrisisChannel;
  title: string;
  body: string;
  /** Sim-minutes after arrival before an unanswered inject escalates. */
  deadlineMinutes: number;
  options: CrisisOption[];
  /** Applied once if the deadline passes unanswered. */
  escalation: MeterEffects & { note: string };
};

export type CrisisScenario = {
  slug: string;
  title: string;
  description: string;
  /** Sim-minutes in the full crisis day. */
  durationMinutes: number;
  /** Wall-clock time the sim clock starts at, e.g. "08:30". */
  clockStart: string;
  initial: Omit<CrisisState, "minute">;
  injects: CrisisInject[];
};

export type Decision = { injectId: string; optionId: string; atMinute: number };

// ── Timeline ───────────────────────────────────────────────────────────────

/** Sim-minute at which an inject stops accepting answers. */
export function deadlineOf(inject: CrisisInject): number {
  return inject.atMinute + inject.deadlineMinutes;
}

/**
 * Injects the commander can act on right now: arrived, still inside their
 * deadline, and not already answered.
 */
export function activeInjects(
  scenario: CrisisScenario,
  minute: number,
  answeredIds: readonly string[],
): CrisisInject[] {
  const answered = new Set(answeredIds);
  return scenario.injects
    .filter(
      (i) =>
        i.atMinute <= minute && deadlineOf(i) > minute && !answered.has(i.id),
    )
    .sort((a, b) => a.atMinute - b.atMinute || a.id.localeCompare(b.id));
}

/** Injects whose deadline has passed without an answer. */
export function lapsedInjects(
  scenario: CrisisScenario,
  minute: number,
  answeredIds: readonly string[],
): CrisisInject[] {
  const answered = new Set(answeredIds);
  return scenario.injects
    .filter((i) => deadlineOf(i) <= minute && !answered.has(i.id))
    .sort((a, b) => deadlineOf(a) - deadlineOf(b) || a.id.localeCompare(b.id));
}

/** Injects that have not yet arrived. */
export function pendingInjects(scenario: CrisisScenario, minute: number): CrisisInject[] {
  return scenario.injects.filter((i) => i.atMinute > minute);
}

/**
 * Advance the clock, applying the escalation of anything that lapses in the
 * interval crossed.
 *
 * Escalations are keyed on the interval `(from, to]` so advancing the clock in
 * one large step or several small ones produces the same result, and an
 * already-lapsed inject is never penalised twice.
 */
export function advanceClock(
  scenario: CrisisScenario,
  state: CrisisState,
  toMinute: number,
  answeredIds: readonly string[],
): { state: CrisisState; escalated: CrisisInject[] } {
  if (toMinute <= state.minute) return { state, escalated: [] };

  const answered = new Set(answeredIds);
  const escalated = scenario.injects
    .filter((i) => {
      if (answered.has(i.id)) return false;
      const deadline = deadlineOf(i);
      return deadline > state.minute && deadline <= toMinute;
    })
    .sort((a, b) => deadlineOf(a) - deadlineOf(b) || a.id.localeCompare(b.id));

  let next: CrisisState = { ...state, minute: toMinute };
  for (const inject of escalated) {
    next = applyEffects(next, inject.escalation);
  }

  return { state: next, escalated };
}

/**
 * Answer an inject: apply its effects, then advance the clock by its cost.
 *
 * The clock moves *after* the effects land, so a decision always takes hold
 * before the time it consumed can lapse other injects — otherwise a slow but
 * correct call could be penalised by its own duration.
 */
export function applyDecision(
  scenario: CrisisScenario,
  state: CrisisState,
  inject: CrisisInject,
  option: CrisisOption,
  answeredIds: readonly string[],
): { state: CrisisState; escalated: CrisisInject[] } {
  const afterEffects = applyEffects(state, option.effects);
  return advanceClock(
    scenario,
    afterEffects,
    state.minute + Math.max(0, option.costMinutes),
    [...answeredIds, inject.id],
  );
}

/** Whether the run has reached the end of the scenario. */
export function isComplete(
  scenario: CrisisScenario,
  minute: number,
  answeredIds: readonly string[],
): boolean {
  if (minute >= scenario.durationMinutes) return true;
  // Every inject is either answered or lapsed, so nothing remains to do.
  const answered = new Set(answeredIds);
  return scenario.injects.every((i) => answered.has(i.id) || deadlineOf(i) <= minute);
}

// ── Scoring ────────────────────────────────────────────────────────────────

export type CrisisGrade = {
  /** 0-100 overall. */
  score: number;
  containment: number;
  reputation: number;
  morale: number;
  financialLoss: number;
  /** Fraction of answered injects where the best-practice option was chosen. */
  idealRate: number;
  /** Injects allowed to lapse. */
  missed: number;
  answered: number;
  band: "EXEMPLARY" | "EFFECTIVE" | "ADEQUATE" | "STRUGGLING";
};

export const WEIGHTS = { containment: 0.35, reputation: 0.2, morale: 0.15, decisions: 0.3 } as const;

/** Loss at or above this contributes the full financial penalty. */
export const LOSS_CEILING = 5_000_000;
/** Maximum points subtracted for financial damage. */
export const LOSS_PENALTY_MAX = 15;

/**
 * Grade a finished run.
 *
 * Meters carry most of the weight because the outcome matters more than the
 * path, but decision quality is weighted heavily enough that a commander who
 * stumbled into a good position cannot outrank one who reasoned well. Missed
 * injects are counted against the decision component rather than ignored:
 * failing to act is a decision.
 */
export function gradeRun(
  scenario: CrisisScenario,
  state: CrisisState,
  decisions: readonly Decision[],
): CrisisGrade {
  const optionsById = new Map<string, CrisisOption>();
  const injectsById = new Map(scenario.injects.map((i) => [i.id, i]));
  for (const inject of scenario.injects) {
    for (const option of inject.options) {
      optionsById.set(`${inject.id}:${option.id}`, option);
    }
  }

  // Ignore decisions referencing content that no longer exists, so editing a
  // scenario cannot make an old run ungradeable.
  const valid = decisions.filter(
    (d) => injectsById.has(d.injectId) && optionsById.has(`${d.injectId}:${d.optionId}`),
  );

  const answered = valid.length;
  const idealCount = valid.filter(
    (d) => optionsById.get(`${d.injectId}:${d.optionId}`)?.ideal === true,
  ).length;

  const answeredIds = valid.map((d) => d.injectId);
  const missed = scenario.injects.filter((i) => !answeredIds.includes(i.id)).length;

  const total = scenario.injects.length;
  // Judge against every inject, not just the answered ones: a commander who
  // answered two of twenty perfectly has not run a good incident.
  const decisionScore = total === 0 ? 0 : (idealCount / total) * 100;
  const idealRate = answered === 0 ? 0 : idealCount / answered;

  const weighted =
    state.containment * WEIGHTS.containment +
    state.reputation * WEIGHTS.reputation +
    state.morale * WEIGHTS.morale +
    decisionScore * WEIGHTS.decisions;

  const lossPenalty =
    Math.min(1, Math.max(0, state.financialLoss) / LOSS_CEILING) * LOSS_PENALTY_MAX;

  const score = clampMeter(weighted - lossPenalty);

  return {
    score,
    containment: state.containment,
    reputation: state.reputation,
    morale: state.morale,
    financialLoss: state.financialLoss,
    idealRate,
    missed,
    answered,
    band:
      score >= 85 ? "EXEMPLARY" : score >= 70 ? "EFFECTIVE" : score >= 50 ? "ADEQUATE" : "STRUGGLING",
  };
}

/** Render a sim-minute as a wall-clock time from the scenario's start. */
export function clockAt(scenario: CrisisScenario, minute: number): string {
  const [h, m] = scenario.clockStart.split(":").map(Number);
  const base = (h || 0) * 60 + (m || 0);
  const total = base + Math.max(0, minute);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
