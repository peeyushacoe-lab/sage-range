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
    subtitle: "Nation-state APT exploiting a medical software supply chain",
    briefing:
      "A GitHub Security Advisory has flagged 'meddevice-agent' — a patient monitoring SDK installed across 47 hospital systems including yours — for an unexpected dependency injected 9 weeks ago by an unknown contributor who socially engineered the original maintainer. The backdoor has been live in production. You cannot confirm which systems executed the malicious payload. Nation-state attribution is suspected.",
    difficulty: "INSANE",
    estimatedMinutes: 60,
    personaId: "nation_state_apt",
    archetypeId: "HEALTHCARE",
    startingConditions: {
      sophisticationOverride: 95,
    },
    learningObjectives: [
      "Identify supply chain compromise indicators in software dependencies",
      "Scope impact when malicious code has been resident for weeks",
      "Coordinate responsible disclosure with a software vendor under active exploitation",
      "Manage HIPAA breach notification obligations when patient data is at risk",
    ],
    tags: ["apt", "healthcare", "supply-chain", "npm", "nation-state", "vendor-coordination"],
    templateSlug: "supply-chain-attack",
    realWorldAnalogue: "HAFNIUM / XZ Utils backdoor 2024 / SolarWinds",
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
    subtitle: "Hacktivist SQL injection exposing citizen records",
    briefing:
      "The hacktivist collective 'Anonymous Alliance' has published a 1,200-record sample of what appears to be your agency's citizen services database on their Telegram channel, claiming to have exfiltrated 450,000 records. Your WAF blocked an injection attempt this morning — but log review reveals the same attack pattern succeeded overnight before the WAF rule existed. The GDPR clock may already be running. Their stated goal: maximum public embarrassment.",
    difficulty: "MEDIUM",
    estimatedMinutes: 40,
    personaId: "hacktivist",
    archetypeId: "GOVERNMENT",
    startingConditions: {
      activeControls: [],
    },
    learningObjectives: [
      "Identify and contain an active SQL injection breach retrospectively",
      "Preserve forensic evidence while remediating a live vulnerability",
      "Manage GDPR notification obligations under media pressure",
      "Control the public narrative while coordinating with regulators",
    ],
    tags: ["hacktivist", "government", "sqli", "gdpr", "pr-management", "citizen-data"],
    templateSlug: "data-breach",
    realWorldAnalogue: "Anonymous OpOlympics / LulzSec HBGary breach 2011",
  },

  credential_startup: {
    id: "credential_startup",
    title: "Silent Harvest",
    subtitle: "Exposed AWS credentials in a public S3 bucket",
    briefing:
      "A threat intel feed shows your S3 bucket URL on a public paste site — with a .env file containing live AWS access keys committed during a migration six weeks ago. CloudTrail is already logging API calls from a Romanian IP. The attacker is mapping your AWS account. You have no SOC, no GuardDuty, and the 'deploy-prod' IAM user has broad permissions including IAM PassRole. Every minute the blast radius grows.",
    difficulty: "EASY",
    estimatedMinutes: 25,
    personaId: "cybercriminal",
    archetypeId: "STARTUP",
    startingConditions: {
      activeControls: [],
    },
    learningObjectives: [
      "Respond to active credential exploitation of exposed IAM keys",
      "Use CloudTrail to track attacker lateral movement through AWS IAM",
      "Apply least-privilege remediation and IAM key rotation under attack",
      "Understand GDPR obligations when cloud-hosted customer PII is at risk",
    ],
    tags: ["credentials", "startup", "aws", "cloud", "s3", "iam", "easy"],
    templateSlug: "cloud-misconfiguration",
    realWorldAnalogue: "Capital One breach 2019 / Codecov supply chain 2021",
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
