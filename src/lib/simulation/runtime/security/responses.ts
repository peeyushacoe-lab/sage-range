import type { AdversaryActionType } from "../redai/types";
import type { DefenseResult } from "./effectiveness";
import type { ConsequenceEvent } from "../redai/consequences";
import { getControl } from "./controls";

const PREVENTION_NARRATIVES: Partial<Record<string, Partial<Record<AdversaryActionType, string>>>> = {
  enable_mfa: {
    STEAL_CREDENTIALS: "MFA challenge blocked credential replay — second factor unavailable to the adversary.",
    MOVE_LATERALLY:    "Lateral movement aborted: MFA on privileged accounts prevented hash reuse.",
  },
  block_email_gateway: {
    PHISH_EMPLOYEE: "Email gateway quarantined phishing message before delivery — malicious link never reached inbox.",
  },
  block_egress: {
    EXFILTRATE_DATA: "DLP policy blocked outbound transfer — data staged but exfiltration channel denied.",
  },
  segment_network: {
    MOVE_LATERALLY: "Network segmentation enforced: no route between source host and target segment.",
  },
  patch_servers: {
    EXPLOIT_SERVER: "Exploit failed — CVE was patched. Server returned standard error; no shell obtained.",
  },
  reset_credentials: {
    STEAL_CREDENTIALS: "Credential reset completed before adversary could operationalize harvested hashes.",
    MOVE_LATERALLY:    "Compromised credential invalidated — pass-the-hash returned authentication failure.",
  },
  notify_employees: {
    PHISH_EMPLOYEE: "Security-aware employee identified and reported the phishing email before clicking.",
  },
};

const CONTAINMENT_NARRATIVES: Partial<Record<AdversaryActionType, Partial<Record<string, string>>>> = {
  DEPLOY_RANSOMWARE: {
    activate_edr:             "EDR isolated affected endpoints — ransomware spread limited to 2 hosts, not full domain.",
    engage_incident_response: "IR team halted propagation: ransomware contained to initial blast radius.",
    isolate_endpoint:         "Endpoint isolation cut C2 callback — encryption halted mid-execution.",
  },
  MOVE_LATERALLY: {
    segment_network:  "Network segmentation limited pivot: adversary gained 1 host, not full segment.",
    isolate_endpoint: "Endpoint isolation severed attacker session mid-lateral-move.",
  },
  EXFILTRATE_DATA: {
    block_egress:             "DLP partially blocked transfer — ~40% of staged data exfiltrated before channel closed.",
    engage_incident_response: "IR team closed exfil channel after partial transfer — breach scope reduced.",
  },
};

export function generateControlResponses(
  action: AdversaryActionType,
  defenseResult: DefenseResult
): ConsequenceEvent[] {
  const events: ConsequenceEvent[] = [];

  // Prevention event — control stopped the adversary outright
  if (defenseResult.prevented && defenseResult.preventingControl) {
    const ctrl = getControl(defenseResult.preventingControl);
    const template = PREVENTION_NARRATIVES[defenseResult.preventingControl]?.[action];
    const narrative =
      template ??
      `${ctrl?.name ?? defenseResult.preventingControl} blocked ${action.replace(/_/g, " ").toLowerCase()}.`;
    events.push({
      type: "CONTROL_PREVENTION",
      actor: "DEFENSE",
      payload: {
        control: defenseResult.preventingControl,
        controlName: ctrl?.name,
        action,
        type: "PREVENTION",
      },
      narrative: `[DEFENSE] ${narrative}`,
    });
  }

  // Containment event — action landed but blast radius was limited
  if (!defenseResult.prevented && defenseResult.containment > 0.2) {
    for (const ctrlId of defenseResult.containingControls) {
      const narrative = CONTAINMENT_NARRATIVES[action]?.[ctrlId];
      if (!narrative) continue;
      const ctrl = getControl(ctrlId);
      events.push({
        type: "CONTROL_CONTAINMENT",
        actor: "DEFENSE",
        payload: {
          control: ctrlId,
          controlName: ctrl?.name,
          action,
          containmentLevel: defenseResult.containment,
          type: "CONTAINMENT",
        },
        narrative: `[DEFENSE] ${narrative}`,
      });
      break; // one containment event per adversary turn
    }
  }

  return events;
}
