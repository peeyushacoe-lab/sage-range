// Phishing-to-ransomware stages
export type PhishingRansomwareStage =
  | "NORMAL"
  | "PHISHING_ACTIVE"
  | "INITIAL_COMPROMISE"
  | "LATERAL_MOVEMENT"
  | "DOMAIN_COMPROMISE"
  | "DATA_EXFILTRATION"
  | "RANSOMWARE_DEPLOYED";

// Insider threat stages
export type InsiderThreatStage =
  | "NORMAL"
  | "SUSPICIOUS_ACCESS"
  | "PRIVILEGE_ABUSE"
  | "DATA_STAGING"
  | "EXFIL_ACTIVE"
  | "BREACH_CONFIRMED";

// Cloud misconfiguration stages
export type CloudMisconfigStage =
  | "NORMAL"
  | "DISCOVERY"
  | "CREDENTIAL_THEFT"
  | "LATERAL_MOVEMENT"
  | "DATA_EXFIL"
  | "CONTAINED"
  | "BREACHED";

// Supply chain attack stages
export type SupplyChainStage =
  | "NORMAL"
  | "DETECTION"
  | "SCOPE_ANALYSIS"
  | "VENDOR_NOTIFICATION"
  | "PATCH_DEPLOYMENT"
  | "CUSTOMER_NOTIFICATION"
  | "CONTAINED"
  | "BREACHED";

// Data breach (SQL injection) stages
export type DataBreachStage =
  | "NORMAL"
  | "INITIAL_DETECTION"
  | "CONTAINMENT"
  | "FORENSICS"
  | "REGULATORY_NOTIFICATION"
  | "CUSTOMER_NOTIFICATION"
  | "CONTAINED"
  | "BREACHED";

export type AttackStage =
  | PhishingRansomwareStage
  | InsiderThreatStage
  | CloudMisconfigStage
  | SupplyChainStage
  | DataBreachStage;

export type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ActionEffect = {
  stageBlocker: boolean;
  scoreChange: number;
  stealthChange: number;
};

// Side effect emitted when an action brings a system down or degrades it
export type Consequence = {
  system: string;
  status: "DEGRADED" | "OFFLINE";
  reason: string;
};

// MITRE ATT&CK technique observed in a stage
export type MitreTechnique = {
  id: string;    // e.g. "T1566.001"
  name: string;  // e.g. "Spearphishing Attachment"
  tactic: string; // e.g. "Initial Access"
};

// Pressure message source
export type PressureSource = "CEO" | "CFO" | "LEGAL" | "PR" | "REGULATOR" | "HR" | "IT_HELPDESK";

// Pressure stream event definition (defined per stage in template)
export type PressureDefinition = {
  id: string;
  source: PressureSource;
  message: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export type SimAction = {
  id: string;
  label: string;
  description: string;
  availableInStages: AttackStage[];
  effects: ActionEffect;
  consequences?: Consequence[];
};

export type StageDefinition = {
  id: AttackStage;
  label: string;
  brief: string;
  threat: ThreatLevel;
  autoAdvanceSec: number;
  nextStage: AttackStage | null;
  evidence: string[];
  breachOnAutoAdvance?: boolean;
  mitre?: MitreTechnique[];
  pressures?: PressureDefinition[];
};

export type EmployeeProfile = {
  name: string;
  title: string;
  department: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  traits: string[];
};

export type Executive = {
  name: string;
  title: string;
  role: "CEO" | "CFO" | "CISO" | "LEGAL" | "PR";
  priority: string;
  satisfaction: number;
  demand: string;
};

export type CompanyProfile = {
  name: string;
  industry: string;
  size: string;
  city: string;
  employees: EmployeeProfile[];
  systems: string[];
  securityPosture: string;
  executives?: Executive[];
};

// Live system status — updated by CONSEQUENCE events
export type SystemStatus = "ONLINE" | "DEGRADED" | "OFFLINE";

// Active pressure record stored in WorldState
export type ActivePressure = {
  id: string;
  source: PressureSource;
  message: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

// Psychological state of an employee — computed from events, never stored
export type EmployeeState = {
  name: string;
  stressLevel: number;       // 0-100
  morale: number;            // 0-100
  confidenceInSOC: number;   // 0-100
  securityAwareness: number; // 0-100
  insiderRisk: number;       // 0-100
};

export type WorldState = {
  stage: AttackStage;
  stealthLevel: number;
  score: number;
  blockedVectors: string[];
  decisionCount: number;
  endpointIsolated: boolean;
  networkSegmented: boolean;
  egressBlocked: boolean;
  status: "ACTIVE" | "CONTAINED" | "BREACHED" | "ABANDONED";
  systemStatuses: Record<string, SystemStatus>;
  activePressures: ActivePressure[];
  firedPressureIds: string[];
  executiveSatisfaction: Record<string, number>;
  firedExecPressureStages: string[];
  // REDai adversary impact tracking
  compromisedEmployees: string[];
  compromisedSystems: string[];
  dataExfiltrated: boolean;
  ransomwareDeployed: boolean;
  // Executive pressure — live, derived from event log
  ceoConfidence: number;      // 0-100; starts 70
  boardConfidence: number;    // 0-100; starts 70
  mediaPressure: number;      // 0-100; starts 0
  legalPressure: number;      // 0-100; starts 0
  customerTrust: number;      // 0-100; starts 85
};

export type ScenarioDefinition = {
  slug: string;
  name: string;
  description: string;
  industry: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  stages: StageDefinition[];
  actions: SimAction[];
};

export type PublicAction = Pick<SimAction, "id" | "label" | "description">;

// Analyst behavior profile derived from simulation events
export type AnalystTrait = {
  id: string;
  label: string;
  score: number; // 0–100
  evidence: string;
};

export type AnalystProfile = {
  traits: AnalystTrait[];
  decisionSpeed: "FAST" | "MEASURED" | "SLOW";
  topStrength: string | null;
  topWeakness: string | null;
};
