import type { IndustryArchetypeId } from "../company/generator";

export interface StartingConditions {
  activeControls?: string[];           // defender actions already applied at start
  sophisticationOverride?: number;     // override persona's default sophistication
  timeLimit?: number;                  // seconds; undefined = unlimited
}

export interface ScenarioManifest {
  id: string;
  title: string;
  subtitle: string;
  briefing: string;                    // 2-3 sentence narrative setup shown to participants
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  estimatedMinutes: number;
  personaId: string;
  archetypeId: IndustryArchetypeId;
  startingConditions: StartingConditions;
  learningObjectives: string[];
  tags: string[];
  templateSlug: string;
  realWorldAnalogue?: string;          // e.g. "Colonial Pipeline 2021"
}

export const SCENARIOS: Record<string, ScenarioManifest> = {

  ransomware_bank: {
    id: "ransomware_bank",
    title: "Operation Double Lock",
    subtitle: "Ransomware targeting a financial institution",
    briefing:
      "Threat intelligence has flagged a known ransomware group targeting financial institutions — three banks compromised in 90 days. Meridian Capital Group's Exchange Server is showing anomalous authentication attempts. Your SOC has 45 minutes before the attackers establish persistence.",
    difficulty: "HARD",
    estimatedMinutes: 45,
    personaId: "ransomware_gang",
    archetypeId: "FINANCIAL_SERVICES",
    startingConditions: {},
    learningObjectives: [
      "Recognise phishing-to-ransomware kill chain progression",
      "Deploy email gateway and EDR controls before lateral movement",
      "Communicate breach scope to executives under pressure",
      "Activate incident response before ransomware detonation",
    ],
    tags: ["ransomware", "finance", "phishing", "kill-chain", "executive-pressure"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: "Colonial Pipeline 2021 / Change Healthcare 2024",
  },

  apt_healthcare: {
    id: "apt_healthcare",
    title: "Shadow Protocol",
    subtitle: "Nation-state APT conducting medical research espionage",
    briefing:
      "A nation-state group has been conducting quiet reconnaissance against medical research networks for weeks — no visible IOCs until now. DNS query volume anomaly detected at 02:14. The group's signature is a low-and-slow lateral movement campaign ending in silent data exfiltration. You likely already have a foothold.",
    difficulty: "INSANE",
    estimatedMinutes: 60,
    personaId: "nation_state_apt",
    archetypeId: "HEALTHCARE",
    startingConditions: {
      sophisticationOverride: 95,
    },
    learningObjectives: [
      "Identify APT indicators of compromise vs. ransomware noise",
      "Apply threat hunting methodology against living-off-the-land techniques",
      "Understand MITRE ATT&CK Persistence and Lateral Movement tactics",
      "Manage patient data breach notification obligations under HIPAA",
    ],
    tags: ["apt", "healthcare", "patient-data", "threat-hunting", "nation-state", "low-and-slow"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: "HAFNIUM Exchange exploitation / Volt Typhoon",
  },

  insider_tech: {
    id: "insider_tech",
    title: "The Inside Job",
    subtitle: "Malicious insider at a technology company",
    briefing:
      "HR has flagged a senior engineer who gave notice three weeks ago. Source code repository access logs show unexplained bulk download activity outside business hours. The employee has legitimate admin credentials and knows the network architecture. No external C2 activity — this is entirely internal.",
    difficulty: "MEDIUM",
    estimatedMinutes: 35,
    personaId: "insider",
    archetypeId: "TECHNOLOGY",
    startingConditions: {
      activeControls: [],
    },
    learningObjectives: [
      "Identify insider threat behavioural indicators",
      "Apply privilege monitoring and access anomaly detection",
      "Understand credential reset and data staging containment procedures",
      "Recognise data exfiltration through legitimate channels",
    ],
    tags: ["insider", "data-theft", "tech", "source-code", "privilege-abuse"],
    templateSlug: "insider-threat",
    realWorldAnalogue: "Tesla source code theft 2023 / AWS insider breach",
  },

  hacktivist_gov: {
    id: "hacktivist_gov",
    title: "Blackout 23",
    subtitle: "Hacktivist disruption campaign against a government agency",
    briefing:
      "A hacktivist collective announced a 48-hour disruption campaign following a controversial policy decision. Your agency was named on social media 6 hours ago. Spearphishing against public-facing staff has already begun. Their goal is maximum visibility — they want systems down and it to make the news.",
    difficulty: "MEDIUM",
    estimatedMinutes: 40,
    personaId: "hacktivist",
    archetypeId: "GOVERNMENT",
    startingConditions: {
      activeControls: ["enable_mfa"],
    },
    learningObjectives: [
      "Distinguish hacktivist TTPs from criminal/APT campaigns",
      "Manage operational continuity while under coordinated attack",
      "Control external communications and prevent media escalation",
      "Understand how security decisions interact with PR and legal obligations",
    ],
    tags: ["hacktivist", "government", "disruption", "pr-management", "media-pressure"],
    templateSlug: "phishing-to-ransomware",
    realWorldAnalogue: "Anonymous OpOlympics / LulzSec government campaigns",
  },

  credential_startup: {
    id: "credential_startup",
    title: "Silent Harvest",
    subtitle: "Credential theft targeting a cloud-native startup",
    briefing:
      "Employee credentials for Forge AI were exposed in a third-party breach list published on a dark web forum yesterday. The company has no SOC, no MFA, and all infrastructure is cloud-hosted. The attacker is attempting to pivot from compromised credentials into AWS and the GitHub repository.",
    difficulty: "EASY",
    estimatedMinutes: 25,
    personaId: "cybercriminal",
    archetypeId: "STARTUP",
    startingConditions: {
      activeControls: [],
    },
    learningObjectives: [
      "Understand the risk profile of cloud-first environments with weak controls",
      "Implement MFA and credential reset under active attack",
      "Recognise credential stuffing and account takeover patterns",
      "Understand how source code exposure creates downstream supply chain risk",
    ],
    tags: ["credentials", "startup", "aws", "cloud", "easy", "quick-win"],
    templateSlug: "phishing-to-ransomware",
  },

};

export function getScenario(id: string): ScenarioManifest | null {
  return SCENARIOS[id] ?? null;
}

export function listScenarios(): ScenarioManifest[] {
  return Object.values(SCENARIOS);
}

export function listScenariosByDifficulty(
  difficulty: ScenarioManifest["difficulty"]
): ScenarioManifest[] {
  return Object.values(SCENARIOS).filter((s) => s.difficulty === difficulty);
}

export function listScenariosByTag(tag: string): ScenarioManifest[] {
  return Object.values(SCENARIOS).filter((s) => s.tags.includes(tag));
}
