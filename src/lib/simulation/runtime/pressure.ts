// Pressure Stream Engine — generates parallel business/compliance/human pressure.
// Pressure events appear in the feed alongside the attack, making the student
// manage a crisis instead of solving a puzzle.

import type { PressureDefinition, WorldState } from "../types";
import { getTemplate } from "../engine";

// Returns pressure definitions that should fire when entering a stage,
// filtering out ones that have already fired (stored in worldState.firedPressureIds).
export function getPendingPressures(
  templateSlug: string,
  stage: string,
  worldState: WorldState
): PressureDefinition[] {
  const template = getTemplate(templateSlug);
  if (!template) return [];

  const stageDef = template.stages.find((s) => s.id === stage);
  if (!stageDef?.pressures) return [];

  const fired = new Set(worldState.firedPressureIds);
  return stageDef.pressures.filter((p) => !fired.has(p.id));
}

// Maps pressure source to the actor field used in the event log
export function pressureSourceToActor(source: string): string {
  switch (source) {
    case "CEO":
    case "CFO":
    case "PR":
      return "EXEC";
    case "LEGAL":
    case "REGULATOR":
      return "LEGAL";
    case "HR":
      return "HR";
    default:
      return "SYSTEM";
  }
}

// Formats a pressure message for the narrative feed
export function formatPressureNarrative(
  source: string,
  message: string,
  companyName: string
): string {
  return `${source} → ${message.replace("{{companyName}}", companyName)}`;
}
