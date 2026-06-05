// Debrief Generator — produces post-simulation analysis.
// The debrief is more valuable than the simulation itself:
// it's where learning actually happens.

import type { MitreTechnique } from "../types";
import { getTemplate } from "../engine";

type TimedEvent = {
  id: string;
  type: string;
  actor: string;
  payload: unknown;
  narrative: string | null;
  createdAt: string;
};

export type TimelineEntry = {
  stage: string;
  label: string;
  enteredAt: string;
  durationSec: number | null;
  wasBlocked: boolean; // student containment action stopped progression
};

export type DecisionEntry = {
  actionId: string;
  label: string;
  narrative: string | null;
  scoreChange: number;
  stageBlocker: boolean;
  takenAt: string;
};

export type MissedOpportunity = {
  stage: string;
  missedActionIds: string[];
  missedActionLabels: string[];
};

export type DebriefData = {
  timeline: TimelineEntry[];
  decisions: DecisionEntry[];
  missedOpportunities: MissedOpportunity[];
  mitreTechniques: MitreTechnique[];
  consequenceLog: Array<{ system: string; status: string; reason: string; triggeredAt: string }>;
  totalScore: number;
  outcome: "CONTAINED" | "BREACHED";
};

export function buildDebrief(
  templateSlug: string,
  events: TimedEvent[],
  outcome: "CONTAINED" | "BREACHED",
  totalScore: number
): DebriefData {
  const template = getTemplate(templateSlug);

  // ── Timeline ────────────────────────────────────────────────────────────────
  const stageEvents = events.filter(
    (e) => e.type === "STAGE_ADVANCE" || e.type === "SESSION_STARTED"
  );

  const timeline: TimelineEntry[] = stageEvents.map((ev, i) => {
    const p = ev.payload as Record<string, unknown>;
    const stage = (ev.type === "SESSION_STARTED" ? "NORMAL" : p.to) as string;
    const label = template?.stages.find((s) => s.id === stage)?.label ?? stage.replace(/_/g, " ");
    const next = stageEvents[i + 1];
    const durationSec = next
      ? Math.floor((new Date(next.createdAt).getTime() - new Date(ev.createdAt).getTime()) / 1000)
      : null;
    // Was this stage ended by a student blocker action?
    const wasBlocked = events.some(
      (e) =>
        e.type === "STUDENT_ACTION" &&
        (e.payload as Record<string, unknown>).stageBlocker === true &&
        new Date(e.createdAt) >= new Date(ev.createdAt) &&
        (!next || new Date(e.createdAt) < new Date(next.createdAt))
    );
    return { stage, label, enteredAt: ev.createdAt, durationSec, wasBlocked };
  });

  // ── Decisions ───────────────────────────────────────────────────────────────
  const decisions: DecisionEntry[] = events
    .filter((e) => e.type === "STUDENT_ACTION")
    .map((e) => {
      const p = e.payload as Record<string, unknown>;
      return {
        actionId: p.actionId as string,
        label: p.label as string,
        narrative: e.narrative,
        scoreChange: (p.scoreChange as number) ?? 0,
        stageBlocker: (p.stageBlocker as boolean) ?? false,
        takenAt: e.createdAt,
      };
    });

  // ── Missed Opportunities ────────────────────────────────────────────────────
  const takenIds = new Set(decisions.map((d) => d.actionId));
  const missedOpportunities: MissedOpportunity[] = [];

  if (template) {
    const visitedStages = new Set(timeline.map((t) => t.stage));
    for (const stage of visitedStages) {
      const blockers = template.actions.filter(
        (a) => a.effects.stageBlocker && a.availableInStages.includes(stage as never) && !takenIds.has(a.id)
      );
      if (blockers.length > 0) {
        missedOpportunities.push({
          stage,
          missedActionIds: blockers.map((a) => a.id),
          missedActionLabels: blockers.map((a) => a.label),
        });
      }
    }
  }

  // ── MITRE Techniques ─────────────────────────────────────────────────────────
  const mitreTechniques: MitreTechnique[] = [];
  if (template) {
    const seen = new Set<string>();
    for (const entry of timeline) {
      const stageDef = template.stages.find((s) => s.id === entry.stage);
      for (const t of stageDef?.mitre ?? []) {
        if (!seen.has(t.id)) {
          mitreTechniques.push(t);
          seen.add(t.id);
        }
      }
    }
  }

  // ── Consequence Log ──────────────────────────────────────────────────────────
  const consequenceLog = events
    .filter((e) => e.type === "CONSEQUENCE")
    .map((e) => {
      const p = e.payload as Record<string, unknown>;
      return {
        system: p.system as string,
        status: p.status as string,
        reason: p.reason as string,
        triggeredAt: e.createdAt,
      };
    });

  return { timeline, decisions, missedOpportunities, mitreTechniques, consequenceLog, totalScore, outcome };
}
