import type { AttackObjective, AdversaryActionType } from "./types";

export interface AdversaryPersona {
  id: string;
  name: string;
  description: string;
  sophistication: number;               // 0-100 base sophistication
  stealth: number;                      // 0-100 how quietly they operate
  aggression: number;                   // 0-100 how fast they push toward impact
  patience: number;                     // 0-100 willingness to reconnoiter and wait
  objectives: AttackObjective[];        // ordered attack chain unique to this persona
  preferredActions: AdversaryActionType[];  // action selection bias
  startingObjective: AttackObjective;   // entry point in the kill chain
}

export const PERSONAS: Record<string, AdversaryPersona> = {
  ransomware_gang: {
    id: "ransomware_gang",
    name: "Ransomware Gang",
    description:
      "Financially motivated group optimised for speed. High-noise operations are acceptable — they want encryption on disk within hours. Patience is not a virtue here.",
    sophistication: 60,
    stealth: 30,
    aggression: 90,
    patience: 20,
    objectives: ["INITIAL_ACCESS", "PRIV_ESC", "LATERAL_MOVEMENT", "IMPACT"],
    preferredActions: ["PHISH_EMPLOYEE", "EXPLOIT_SERVER", "MOVE_LATERALLY", "DEPLOY_RANSOMWARE"],
    startingObjective: "INITIAL_ACCESS",
  },

  nation_state_apt: {
    id: "nation_state_apt",
    name: "Nation State APT",
    description:
      "State-sponsored advanced persistent threat. Extremely patient, very high sophistication. Primary goal is silent, long-term data collection. Detection is a mission failure.",
    sophistication: 95,
    stealth: 90,
    aggression: 30,
    patience: 90,
    objectives: ["INITIAL_ACCESS", "PERSISTENCE", "LATERAL_MOVEMENT", "EXFILTRATION"],
    preferredActions: ["PHISH_EMPLOYEE", "STEAL_CREDENTIALS", "MOVE_LATERALLY", "EXFILTRATE_DATA"],
    startingObjective: "INITIAL_ACCESS",
  },

  insider: {
    id: "insider",
    name: "Malicious Insider",
    description:
      "Trusted employee with legitimate access abusing their position. No phishing needed — they are already inside the perimeter with valid credentials.",
    sophistication: 40,
    stealth: 70,
    aggression: 50,
    patience: 60,
    objectives: ["PRIV_ESC", "LATERAL_MOVEMENT", "EXFILTRATION"],
    preferredActions: ["STEAL_CREDENTIALS", "MOVE_LATERALLY", "EXFILTRATE_DATA"],
    startingObjective: "PRIV_ESC",
  },

  hacktivist: {
    id: "hacktivist",
    name: "Hacktivist",
    description:
      "Ideologically motivated. Seeks visibility, disruption, and public embarrassment of the target. Loud attacks, defacement, and operational chaos over quiet data theft.",
    sophistication: 45,
    stealth: 20,
    aggression: 75,
    patience: 30,
    objectives: ["INITIAL_ACCESS", "PRIV_ESC", "IMPACT"],
    preferredActions: ["PHISH_EMPLOYEE", "EXPLOIT_SERVER", "DEPLOY_RANSOMWARE"],
    startingObjective: "INITIAL_ACCESS",
  },

  cybercriminal: {
    id: "cybercriminal",
    name: "Cybercriminal",
    description:
      "Opportunistic, financially motivated. Focused on fast credential harvesting and data sale. Quick monetisation is preferred over maintaining long-term persistence.",
    sophistication: 55,
    stealth: 50,
    aggression: 65,
    patience: 40,
    objectives: ["INITIAL_ACCESS", "PERSISTENCE", "EXFILTRATION"],
    preferredActions: ["PHISH_EMPLOYEE", "STEAL_CREDENTIALS", "EXFILTRATE_DATA"],
    startingObjective: "INITIAL_ACCESS",
  },
};

export function getPersona(id: string): AdversaryPersona | null {
  return PERSONAS[id] ?? null;
}

export function listPersonas(): AdversaryPersona[] {
  return Object.values(PERSONAS);
}

// Narrative tone hint injected into the Ollama system prompt per persona
export function getPersonaNarrativeTone(personaId: string | undefined): string {
  switch (personaId) {
    case "ransomware_gang":
      return "You are a ransomware operator. Be blunt and fast. Speed over stealth. Reference encryption timelines and financial pressure.";
    case "nation_state_apt":
      return "You are a nation-state cyber operator. Be precise and clinical. Reference long-term objectives, minimal footprint, and intelligence value.";
    case "insider":
      return "You are a malicious employee. Use internal knowledge. Reference legitimate access patterns being exploited from within.";
    case "hacktivist":
      return "You are a hacktivist operator. Be ideological and bold. Reference visibility, public impact, and embarrassing the organisation.";
    case "cybercriminal":
      return "You are a financially motivated cybercriminal. Be pragmatic. Reference monetisation paths and speed of extraction.";
    default:
      return "You are an APT adversary. Be technical and calculated.";
  }
}
