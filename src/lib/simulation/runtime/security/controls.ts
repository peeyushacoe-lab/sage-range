import type { AdversaryActionType } from "../redai/types";

export type ControlCategory =
  | "IDENTITY"
  | "ENDPOINT"
  | "NETWORK"
  | "DATA"
  | "MONITORING"
  | "RECOVERY"
  | "AWARENESS";

export interface SecurityControl {
  id: string;
  name: string;
  category: ControlCategory;
  // Capability domains
  prevents: AdversaryActionType[];  // can outright stop this action
  detects: AdversaryActionType[];   // raises detection probability for this action
  contains: AdversaryActionType[];  // limits blast radius of this action
  recovers: AdversaryActionType[];  // aids recovery after this action
  // Strength ratings (0–1)
  preventionStrength: number;       // probability of outright prevention (before sophistication modifier)
  detectionBoost: number;           // additive probability boost for detection
  containmentStrength: number;      // fraction of blast radius blocked (before sophistication modifier)
}

export const SECURITY_CONTROLS: Record<string, SecurityControl> = {
  enable_mfa: {
    id: "enable_mfa",
    name: "Multi-Factor Authentication",
    category: "IDENTITY",
    prevents: ["STEAL_CREDENTIALS", "MOVE_LATERALLY"],
    detects: [],
    contains: [],
    recovers: [],
    preventionStrength: 0.85,
    detectionBoost: 0.0,
    containmentStrength: 0.0,
  },
  activate_edr: {
    id: "activate_edr",
    name: "Endpoint Detection & Response",
    category: "ENDPOINT",
    prevents: [],
    detects: ["STEAL_CREDENTIALS", "EXPLOIT_SERVER", "MOVE_LATERALLY", "DEPLOY_RANSOMWARE"],
    contains: ["DEPLOY_RANSOMWARE"],
    recovers: [],
    preventionStrength: 0.0,
    detectionBoost: 0.20,
    containmentStrength: 0.60,
  },
  deploy_siem: {
    id: "deploy_siem",
    name: "SIEM / Log Aggregation",
    category: "MONITORING",
    prevents: [],
    detects: ["PHISH_EMPLOYEE", "STEAL_CREDENTIALS", "EXPLOIT_SERVER", "MOVE_LATERALLY", "EXFILTRATE_DATA", "DEPLOY_RANSOMWARE"],
    contains: [],
    recovers: [],
    preventionStrength: 0.0,
    detectionBoost: 0.15,
    containmentStrength: 0.0,
  },
  block_email_gateway: {
    id: "block_email_gateway",
    name: "Email Security Gateway",
    category: "NETWORK",
    prevents: ["PHISH_EMPLOYEE"],
    detects: ["PHISH_EMPLOYEE"],
    contains: [],
    recovers: [],
    preventionStrength: 0.70,
    detectionBoost: 0.25,
    containmentStrength: 0.0,
  },
  block_egress: {
    id: "block_egress",
    name: "Data Loss Prevention / Egress Filter",
    category: "DATA",
    prevents: ["EXFILTRATE_DATA"],
    detects: ["EXFILTRATE_DATA"],
    contains: ["EXFILTRATE_DATA"],
    recovers: [],
    preventionStrength: 0.65,
    detectionBoost: 0.30,
    containmentStrength: 0.75,
  },
  segment_network: {
    id: "segment_network",
    name: "Network Segmentation",
    category: "NETWORK",
    prevents: ["MOVE_LATERALLY"],
    detects: ["MOVE_LATERALLY"],
    contains: ["MOVE_LATERALLY"],
    recovers: [],
    preventionStrength: 0.55,
    detectionBoost: 0.20,
    containmentStrength: 0.70,
  },
  patch_servers: {
    id: "patch_servers",
    name: "Vulnerability Patching",
    category: "ENDPOINT",
    prevents: ["EXPLOIT_SERVER"],
    detects: [],
    contains: ["EXPLOIT_SERVER"],
    recovers: [],
    preventionStrength: 0.75,
    detectionBoost: 0.0,
    containmentStrength: 0.50,
  },
  restore_backups: {
    id: "restore_backups",
    name: "Backup & Recovery",
    category: "RECOVERY",
    prevents: [],
    detects: [],
    contains: [],
    recovers: ["DEPLOY_RANSOMWARE"],
    preventionStrength: 0.0,
    detectionBoost: 0.0,
    containmentStrength: 0.0,
  },
  engage_incident_response: {
    id: "engage_incident_response",
    name: "Incident Response Team",
    category: "RECOVERY",
    prevents: [],
    detects: ["DEPLOY_RANSOMWARE"],
    contains: ["DEPLOY_RANSOMWARE", "EXFILTRATE_DATA"],
    recovers: ["DEPLOY_RANSOMWARE", "EXFILTRATE_DATA"],
    preventionStrength: 0.0,
    detectionBoost: 0.15,
    containmentStrength: 0.50,
  },
  notify_employees: {
    id: "notify_employees",
    name: "Security Awareness Training",
    category: "AWARENESS",
    prevents: ["PHISH_EMPLOYEE"],
    detects: ["PHISH_EMPLOYEE"],
    contains: [],
    recovers: [],
    preventionStrength: 0.40,
    detectionBoost: 0.10,
    containmentStrength: 0.0,
  },
  deploy_honeypots: {
    id: "deploy_honeypots",
    name: "Deception Technology / Honeypots",
    category: "MONITORING",
    prevents: [],
    detects: ["MOVE_LATERALLY", "STEAL_CREDENTIALS"],
    contains: [],
    recovers: [],
    preventionStrength: 0.0,
    detectionBoost: 0.35,
    containmentStrength: 0.0,
  },
  reset_credentials: {
    id: "reset_credentials",
    name: "Credential Reset",
    category: "IDENTITY",
    prevents: ["STEAL_CREDENTIALS", "MOVE_LATERALLY"],
    detects: [],
    contains: ["MOVE_LATERALLY"],
    recovers: ["STEAL_CREDENTIALS"],
    preventionStrength: 0.90,
    detectionBoost: 0.0,
    containmentStrength: 0.80,
  },
  isolate_endpoint: {
    id: "isolate_endpoint",
    name: "Endpoint Isolation",
    category: "ENDPOINT",
    prevents: [],
    detects: [],
    contains: ["MOVE_LATERALLY", "DEPLOY_RANSOMWARE"],
    recovers: [],
    preventionStrength: 0.0,
    detectionBoost: 0.0,
    containmentStrength: 0.85,
  },
};

export function getControl(id: string): SecurityControl | undefined {
  return SECURITY_CONTROLS[id];
}

export function getActiveControls(blockedVectors: string[]): SecurityControl[] {
  return blockedVectors
    .map((id) => SECURITY_CONTROLS[id])
    .filter((c): c is SecurityControl => c !== undefined);
}
