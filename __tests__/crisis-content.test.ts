import { describe, it, expect } from "vitest";
import { CRISIS_SCENARIOS, findCrisisScenario } from "@/content/crisis-scenarios";
import { deadlineOf, gradeRun, applyDecision, type CrisisState } from "@/lib/crisis-engine";

/**
 * Content checks. A scenario is data, and the failure modes are silent: a
 * duplicate id, two ideal options, or an inject whose deadline falls before it
 * arrives all produce a run that is playable but graded wrongly.
 */
describe.each(CRISIS_SCENARIOS.map((s) => [s.slug, s] as const))(
  "scenario %s",
  (_slug, scenario) => {
    it("has a unique inject id for every inject", () => {
      const ids = scenario.injects.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("has unique option ids within each inject", () => {
      for (const inject of scenario.injects) {
        const ids = inject.options.map((o) => o.id);
        expect(new Set(ids).size, `inject ${inject.id}`).toBe(ids.length);
      }
    });

    it("marks exactly one ideal option per inject", () => {
      for (const inject of scenario.injects) {
        const ideal = inject.options.filter((o) => o.ideal === true);
        expect(ideal.length, `inject ${inject.id}`).toBe(1);
      }
    });

    it("offers at least two options everywhere, so there is a real choice", () => {
      for (const inject of scenario.injects) {
        expect(inject.options.length, `inject ${inject.id}`).toBeGreaterThanOrEqual(2);
      }
    });

    it("gives every option a rationale for the debrief", () => {
      for (const inject of scenario.injects) {
        for (const option of inject.options) {
          expect(option.rationale.trim().length, `${inject.id}:${option.id}`).toBeGreaterThan(20);
        }
      }
    });

    it("gives every inject a positive deadline that lands inside the day", () => {
      for (const inject of scenario.injects) {
        expect(inject.deadlineMinutes, `inject ${inject.id}`).toBeGreaterThan(0);
        expect(inject.atMinute, `inject ${inject.id}`).toBeGreaterThanOrEqual(0);
        expect(inject.atMinute, `inject ${inject.id}`).toBeLessThan(scenario.durationMinutes);
      }
    });

    it("gives every inject an escalation note", () => {
      for (const inject of scenario.injects) {
        expect(inject.escalation.note.trim().length, `inject ${inject.id}`).toBeGreaterThan(10);
      }
    });

    it("never lets an option cost more time than the scenario has", () => {
      for (const inject of scenario.injects) {
        for (const option of inject.options) {
          expect(option.costMinutes, `${inject.id}:${option.id}`).toBeGreaterThanOrEqual(0);
          expect(option.costMinutes).toBeLessThan(scenario.durationMinutes);
        }
      }
    });

    it("starts from a state that leaves room to improve and to fail", () => {
      const { containment, reputation, morale } = scenario.initial;
      for (const [name, v] of Object.entries({ containment, reputation, morale })) {
        expect(v, name).toBeGreaterThan(0);
        expect(v, name).toBeLessThan(100);
      }
      expect(scenario.initial.financialLoss).toBe(0);
    });

    it("is winnable: playing every ideal option grades well", () => {
      let state: CrisisState = { minute: 0, ...scenario.initial };
      const answered: string[] = [];
      const decisions = [];

      // Answer each inject in arrival order at the moment it lands, so the
      // playthrough reflects a commander who keeps up.
      const ordered = [...scenario.injects].sort((a, b) => a.atMinute - b.atMinute);
      for (const inject of ordered) {
        const ideal = inject.options.find((o) => o.ideal)!;
        if (state.minute < inject.atMinute) state = { ...state, minute: inject.atMinute };
        const result = applyDecision(scenario, state, inject, ideal, answered);
        state = result.state;
        answered.push(inject.id);
        decisions.push({ injectId: inject.id, optionId: ideal.id, atMinute: state.minute });
      }

      const grade = gradeRun(scenario, state, decisions);
      expect(grade.missed).toBe(0);
      expect(grade.idealRate).toBe(1);
      // A commander who made every defensible call should land at least in the
      // effective band; if this fails the effects are tuned too harshly.
      expect(grade.score).toBeGreaterThanOrEqual(70);
    });

    it("is losable: ignoring everything grades poorly", () => {
      const state: CrisisState = {
        minute: scenario.durationMinutes,
        ...scenario.initial,
      };
      // Every inject lapses; approximate the outcome by grading with no decisions.
      const grade = gradeRun(scenario, state, []);
      expect(grade.missed).toBe(scenario.injects.length);
      expect(grade.score).toBeLessThan(70);
    });

    it("orders injects so the day has a shape", () => {
      const arrivals = scenario.injects.map((i) => i.atMinute);
      expect(Math.min(...arrivals)).toBe(0);
      expect(Math.max(...arrivals)).toBeGreaterThan(scenario.durationMinutes / 2);
    });

    it("keeps every deadline inside the scenario, so nothing is unanswerable", () => {
      for (const inject of scenario.injects) {
        expect(deadlineOf(inject), `inject ${inject.id}`).toBeLessThanOrEqual(
          scenario.durationMinutes,
        );
      }
    });
  },
);

describe("findCrisisScenario", () => {
  it("finds an authored scenario by slug", () => {
    expect(findCrisisScenario("meridian-health-ransomware")?.title).toContain("Meridian");
  });

  it("returns undefined for an unknown slug", () => {
    expect(findCrisisScenario("nope")).toBeUndefined();
  });
});
