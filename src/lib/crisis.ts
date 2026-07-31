/**
 * Crisis Command Center service.
 *
 * All simulation rules live in src/lib/crisis-engine.ts; this file loads and
 * persists runs. The engine is replayed from stored decisions rather than
 * trusted from the client, so a crafted request cannot award meters the
 * scenario never offered.
 */

import { db } from "@/lib/db";
import { findCrisisScenario, CRISIS_SCENARIOS } from "@/content/crisis-scenarios";
import {
  applyDecision,
  advanceClock,
  activeInjects,
  lapsedInjects,
  isComplete,
  gradeRun,
  type CrisisScenario,
  type CrisisState,
} from "@/lib/crisis-engine";

export type CrisisResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): CrisisResult<never> => ({
  success: false,
  error,
  statusCode,
});

export function listScenarios() {
  return CRISIS_SCENARIOS.map((s) => ({
    slug: s.slug,
    title: s.title,
    description: s.description,
    durationMinutes: s.durationMinutes,
    injectCount: s.injects.length,
  }));
}

function stateOf(run: {
  minute: number;
  containment: number;
  reputation: number;
  morale: number;
  financialLoss: number;
}): CrisisState {
  return {
    minute: run.minute,
    containment: run.containment,
    reputation: run.reputation,
    morale: run.morale,
    financialLoss: run.financialLoss,
  };
}

/** Start a run, or return the one already in progress for this scenario. */
export async function startRun(
  userId: string,
  scenarioSlug: string,
): Promise<CrisisResult<{ runId: string; resumed: boolean }>> {
  const scenario = findCrisisScenario(scenarioSlug);
  if (!scenario) return fail("Scenario not found", 404);

  const existing = await db.crisisRun.findFirst({
    where: { userId, scenarioSlug, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });
  if (existing) return { success: true, data: { runId: existing.id, resumed: true } };

  const run = await db.crisisRun.create({
    data: {
      userId,
      scenarioSlug,
      minute: 0,
      containment: scenario.initial.containment,
      reputation: scenario.initial.reputation,
      morale: scenario.initial.morale,
      financialLoss: scenario.initial.financialLoss,
    },
    select: { id: true },
  });

  return { success: true, data: { runId: run.id, resumed: false } };
}

export async function loadRun(runId: string, userId: string) {
  const run = await db.crisisRun.findUnique({
    where: { id: runId },
    include: { decisions: { orderBy: { atMinute: "asc" } } },
  });
  // A run is private to its player: another user's run must read as absent
  // rather than forbidden.
  if (!run || run.userId !== userId) return null;
  return run;
}

/** Everything the command centre screen needs for one render. */
export async function getRunView(runId: string, userId: string) {
  const run = await loadRun(runId, userId);
  if (!run) return null;

  const scenario = findCrisisScenario(run.scenarioSlug);
  if (!scenario) return null;

  const answeredIds = run.decisions.map((d) => d.injectId);
  const state = stateOf(run);

  return {
    run,
    scenario,
    state,
    answeredIds,
    active: activeInjects(scenario, state.minute, answeredIds),
    lapsed: lapsedInjects(scenario, state.minute, answeredIds),
    complete: isComplete(scenario, state.minute, answeredIds),
  };
}

/**
 * Record a decision and advance the simulation.
 *
 * The inject and option are resolved from authored content, never from the
 * request body beyond their ids, so the effects applied are always the ones
 * the scenario defines.
 */
export async function submitDecision(params: {
  runId: string;
  userId: string;
  injectId: string;
  optionId: string;
}): Promise<
  CrisisResult<{ escalated: string[]; complete: boolean; state: CrisisState }>
> {
  const run = await loadRun(params.runId, params.userId);
  if (!run) return fail("Run not found", 404);
  if (run.status !== "IN_PROGRESS") return fail("This run has finished", 409);

  const scenario = findCrisisScenario(run.scenarioSlug);
  if (!scenario) return fail("Scenario not found", 404);

  const answeredIds = run.decisions.map((d) => d.injectId);
  if (answeredIds.includes(params.injectId)) {
    return fail("That inject has already been answered", 409);
  }

  const state = stateOf(run);
  const inject = scenario.injects.find((i) => i.id === params.injectId);
  if (!inject) return fail("Inject not found", 404);

  // Reject anything not currently actionable: an inject that has not arrived,
  // or one whose deadline has passed, must not be answerable out of band.
  const actionable = activeInjects(scenario, state.minute, answeredIds).some(
    (i) => i.id === inject.id,
  );
  if (!actionable) return fail("That inject is no longer open", 409);

  const option = inject.options.find((o) => o.id === params.optionId);
  if (!option) return fail("Option not found", 404);

  const { state: next, escalated } = applyDecision(
    scenario,
    state,
    inject,
    option,
    answeredIds,
  );

  const nextAnswered = [...answeredIds, inject.id];
  const complete = isComplete(scenario, next.minute, nextAnswered);

  await db.$transaction([
    db.crisisDecision.create({
      data: {
        runId: run.id,
        injectId: inject.id,
        optionId: option.id,
        atMinute: state.minute,
      },
    }),
    db.crisisRun.update({
      where: { id: run.id },
      data: {
        minute: next.minute,
        containment: next.containment,
        reputation: next.reputation,
        morale: next.morale,
        financialLoss: next.financialLoss,
      },
    }),
  ]);

  if (complete) await finishRun(run.id, params.userId);

  return {
    success: true,
    data: { escalated: escalated.map((i) => i.id), complete, state: next },
  };
}

/**
 * Skip forward in time without acting.
 *
 * Deliberately available: choosing not to answer something is a decision, and
 * the commander needs a way to let a low-value inject lapse rather than being
 * forced to answer everything.
 */
export async function skipAhead(params: {
  runId: string;
  userId: string;
  minutes: number;
}): Promise<CrisisResult<{ escalated: string[]; complete: boolean }>> {
  const run = await loadRun(params.runId, params.userId);
  if (!run) return fail("Run not found", 404);
  if (run.status !== "IN_PROGRESS") return fail("This run has finished", 409);

  const scenario = findCrisisScenario(run.scenarioSlug);
  if (!scenario) return fail("Scenario not found", 404);

  const minutes = Math.min(Math.max(1, Math.floor(params.minutes)), 120);
  const answeredIds = run.decisions.map((d) => d.injectId);
  const state = stateOf(run);

  const { state: next, escalated } = advanceClock(
    scenario,
    state,
    state.minute + minutes,
    answeredIds,
  );

  await db.crisisRun.update({
    where: { id: run.id },
    data: {
      minute: next.minute,
      containment: next.containment,
      reputation: next.reputation,
      morale: next.morale,
      financialLoss: next.financialLoss,
    },
  });

  const complete = isComplete(scenario, next.minute, answeredIds);
  if (complete) await finishRun(run.id, params.userId);

  return { success: true, data: { escalated: escalated.map((i) => i.id), complete } };
}

/**
 * Close a run and record its grade.
 *
 * Any unreached inject is allowed to lapse first, so a run abandoned mid-day
 * is graded on the whole incident rather than only the part that was played.
 */
export async function finishRun(
  runId: string,
  userId: string,
): Promise<CrisisResult<{ score: number; band: string }>> {
  const run = await loadRun(runId, userId);
  if (!run) return fail("Run not found", 404);

  const scenario = findCrisisScenario(run.scenarioSlug);
  if (!scenario) return fail("Scenario not found", 404);

  if (run.status !== "IN_PROGRESS") {
    return { success: true, data: { score: run.score ?? 0, band: run.band ?? "STRUGGLING" } };
  }

  const answeredIds = run.decisions.map((d) => d.injectId);
  const { state: settled } = advanceClock(
    scenario,
    stateOf(run),
    scenario.durationMinutes,
    answeredIds,
  );

  const grade = gradeRun(
    scenario,
    settled,
    run.decisions.map((d) => ({
      injectId: d.injectId,
      optionId: d.optionId,
      atMinute: d.atMinute,
    })),
  );

  await db.crisisRun.update({
    where: { id: run.id },
    data: {
      status: "COMPLETED",
      minute: settled.minute,
      containment: settled.containment,
      reputation: settled.reputation,
      morale: settled.morale,
      financialLoss: settled.financialLoss,
      score: grade.score,
      band: grade.band,
      completedAt: new Date(),
    },
  });

  return { success: true, data: { score: grade.score, band: grade.band } };
}

/** Debrief data: the grade plus every decision with its authored rationale. */
export async function getDebrief(runId: string, userId: string) {
  const run = await loadRun(runId, userId);
  if (!run) return null;

  const scenario = findCrisisScenario(run.scenarioSlug);
  if (!scenario) return null;

  const decisionsById = new Map(run.decisions.map((d) => [d.injectId, d]));

  const timeline = scenario.injects
    .slice()
    .sort((a, b) => a.atMinute - b.atMinute)
    .map((inject) => {
      const decision = decisionsById.get(inject.id);
      const chosen = decision
        ? inject.options.find((o) => o.id === decision.optionId) ?? null
        : null;
      const ideal = inject.options.find((o) => o.ideal) ?? null;
      return {
        inject,
        chosen,
        ideal,
        answered: decision != null,
        wasIdeal: chosen?.ideal === true,
        atMinute: decision?.atMinute ?? null,
      };
    });

  const grade = gradeRun(
    scenario,
    stateOf(run),
    run.decisions.map((d) => ({
      injectId: d.injectId,
      optionId: d.optionId,
      atMinute: d.atMinute,
    })),
  );

  return { run, scenario, grade, timeline };
}

export async function listRuns(userId: string, limit = 10) {
  return db.crisisRun.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { _count: { select: { decisions: true } } },
  });
}

/** Best completed run per player, for the scenario leaderboard. */
export async function getScenarioLeaderboard(scenarioSlug: string, limit = 20) {
  const runs = await db.crisisRun.findMany({
    where: { scenarioSlug, status: "COMPLETED", score: { not: null }, user: { hidden: false } },
    orderBy: [{ score: "desc" }, { completedAt: "asc" }],
    include: { user: { select: { id: true, displayName: true, email: true } } },
  });

  const bestByUser = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    if (!bestByUser.has(run.userId)) bestByUser.set(run.userId, run);
  }

  return [...bestByUser.values()].slice(0, limit);
}
