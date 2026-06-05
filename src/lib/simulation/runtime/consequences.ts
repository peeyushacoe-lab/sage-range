// Consequence Graph Engine — maps analyst actions to cascading side effects.
// "The domain controller is offline" becomes: VPN degraded, Exchange degraded,
// authentication failures, executive escalation. Decisions have weight.

import type { Consequence, WorldState } from "../types";
import { getTemplate } from "../engine";

// Returns consequence definitions for a given action
export function getActionConsequences(
  templateSlug: string,
  actionId: string
): Consequence[] {
  const template = getTemplate(templateSlug);
  if (!template) return [];
  return template.actions.find((a) => a.id === actionId)?.consequences ?? [];
}

// Derives a human-readable feed narrative for a consequence event
export function formatConsequenceNarrative(c: Consequence): string {
  const icon = c.status === "OFFLINE" ? "OFFLINE" : "DEGRADED";
  return `SYSTEM ${icon}: ${c.system} — ${c.reason}`;
}

// Builds a summary of offline/degraded systems from WorldState for display
export function getSystemStatusSummary(
  worldState: WorldState
): Array<{ system: string; status: string }> {
  return Object.entries(worldState.systemStatuses)
    .filter(([, s]) => s !== "ONLINE")
    .map(([system, status]) => ({ system, status }));
}
