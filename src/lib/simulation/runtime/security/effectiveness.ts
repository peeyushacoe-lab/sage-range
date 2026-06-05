import type { AdversaryActionType, AdversaryState } from "../redai/types";
import { getActiveControls } from "./controls";

export interface DefenseResult {
  prevented: boolean;
  preventingControl: string | null;   // ID of the control that stopped the action
  containment: number;                // 0–1 fraction of blast radius blocked
  containingControls: string[];       // control IDs providing containment
  recoveryBoost: number;              // 0–1 speed-of-recovery multiplier
  activeControlIds: string[];         // all control IDs relevant to this action
}

export function evaluateDefenseLayer(
  action: AdversaryActionType,
  blockedVectors: string[],
  adversaryState: AdversaryState
): DefenseResult {
  const controls = getActiveControls(blockedVectors);

  // Sophisticated adversaries partially bypass controls — clamped to 0.5–1.0 range so
  // even a max-sophistication adversary still faces a meaningful control floor.
  const sophisticationModifier = Math.max(0.5, 1 - adversaryState.sophistication / 200);

  // PREVENT: first matching control whose probability roll passes
  let prevented = false;
  let preventingControl: string | null = null;
  for (const control of controls) {
    if (!control.prevents.includes(action)) continue;
    const effectiveProbability = control.preventionStrength * sophisticationModifier;
    if (Math.random() < effectiveProbability) {
      prevented = true;
      preventingControl = control.id;
      break;
    }
  }

  // CONTAIN: highest containment strength among relevant active controls
  const containmentControls = controls.filter((c) => c.contains.includes(action));
  const containment = containmentControls.reduce(
    (max, c) => Math.max(max, c.containmentStrength * sophisticationModifier),
    0
  );
  const containingControls = containmentControls.map((c) => c.id);

  // RECOVER: any relevant recovery control grants a standard boost
  const recoveryBoost = controls.some((c) => c.recovers.includes(action)) ? 0.75 : 0;

  // All control IDs relevant to this action (for narrative and debrief audit)
  const activeControlIds = controls
    .filter(
      (c) =>
        c.prevents.includes(action) ||
        c.detects.includes(action) ||
        c.contains.includes(action) ||
        c.recovers.includes(action)
    )
    .map((c) => c.id);

  return {
    prevented,
    preventingControl,
    containment,
    containingControls,
    recoveryBoost,
    activeControlIds,
  };
}
