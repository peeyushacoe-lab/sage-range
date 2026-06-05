import type { AdversaryState, AdversaryActionType } from "./types";
import type { WorldState } from "../../types";
import { getMitreTechniques } from "./mitre";
import { getActiveControls } from "../security/controls";

export type AlertSource = "EMAIL_GATEWAY" | "EDR" | "SIEM" | "FIREWALL" | "DLP" | "IDENTITY_PROVIDER";

export interface TelemetryEvent {
  source: AlertSource;
  severity: "INFO" | "MEDIUM" | "HIGH" | "CRITICAL";
  visible: boolean;              // false = adversary evaded detection; logged but not surfaced
  mitreTechniqueId: string;
  description: string;
  system: string;
}

export interface DetectionResult {
  detected: boolean;
  visibleAlerts: TelemetryEvent[];
  hiddenTelemetry: TelemetryEvent[];
}

// Base probability that the action produces at least one visible alert
const BASE_DETECTION: Record<AdversaryActionType, number> = {
  PHISH_EMPLOYEE:    0.70,
  STEAL_CREDENTIALS: 0.38,
  EXPLOIT_SERVER:    0.55,
  MOVE_LATERALLY:    0.32,
  EXFILTRATE_DATA:   0.65,
  DEPLOY_RANSOMWARE: 0.95,
};

// Two alert templates per action: one usually visible, one usually hidden (EDR raw telemetry)
const ALERT_TEMPLATES: Record<AdversaryActionType, [TelemetryEvent, TelemetryEvent]> = {
  PHISH_EMPLOYEE: [
    {
      source: "EMAIL_GATEWAY",
      severity: "HIGH",
      visible: true,
      mitreTechniqueId: "T1566.001",
      description: "Suspicious inbound email with encoded URL — recipient clicked before quarantine applied",
      system: "Email Gateway",
    },
    {
      source: "EDR",
      severity: "MEDIUM",
      visible: false,
      mitreTechniqueId: "T1566.002",
      description: "Browser spawned unexpected child process following external link — C2 beacon observed",
      system: "User Endpoint",
    },
  ],
  STEAL_CREDENTIALS: [
    {
      source: "EDR",
      severity: "HIGH",
      visible: false,
      mitreTechniqueId: "T1003.001",
      description: "Non-system process accessed LSASS memory — credential dumping indicators present",
      system: "User Endpoint",
    },
    {
      source: "SIEM",
      severity: "MEDIUM",
      visible: false,
      mitreTechniqueId: "T1555",
      description: "Unusual authentication spike — multiple lateral auth attempts with shared credential hash",
      system: "SIEM",
    },
  ],
  EXPLOIT_SERVER: [
    {
      source: "FIREWALL",
      severity: "HIGH",
      visible: true,
      mitreTechniqueId: "T1190",
      description: "Outbound reverse shell connection from web server to unknown external IP on port 4444",
      system: "Perimeter Firewall",
    },
    {
      source: "EDR",
      severity: "CRITICAL",
      visible: false,
      mitreTechniqueId: "T1068",
      description: "Kernel exploit detected on internet-facing server — SYSTEM-level shell spawned",
      system: "Web Server",
    },
  ],
  MOVE_LATERALLY: [
    {
      source: "SIEM",
      severity: "MEDIUM",
      visible: false,
      mitreTechniqueId: "T1550.002",
      description: "Pass-the-hash authentication pattern across 3+ internal hosts in 8 minutes",
      system: "Internal Network",
    },
    {
      source: "FIREWALL",
      severity: "INFO",
      visible: false,
      mitreTechniqueId: "T1021.002",
      description: "Anomalous SMB traffic between workstations — unusual admin share access pattern",
      system: "Internal Firewall",
    },
  ],
  EXFILTRATE_DATA: [
    {
      source: "DLP",
      severity: "CRITICAL",
      visible: true,
      mitreTechniqueId: "T1041",
      description: "Large-volume data transfer to external IP — DLP policy triggered, transfer partially logged",
      system: "DLP System",
    },
    {
      source: "FIREWALL",
      severity: "HIGH",
      visible: false,
      mitreTechniqueId: "T1048",
      description: "Sustained DNS query volume 40x baseline — DNS tunneling covert exfil channel suspected",
      system: "Perimeter Firewall",
    },
  ],
  DEPLOY_RANSOMWARE: [
    {
      source: "EDR",
      severity: "CRITICAL",
      visible: true,
      mitreTechniqueId: "T1486",
      description: "Mass file encryption activity across multiple endpoints — RANSOMWARE DEPLOYMENT CONFIRMED",
      system: "Multiple Endpoints",
    },
    {
      source: "SIEM",
      severity: "CRITICAL",
      visible: true,
      mitreTechniqueId: "T1490",
      description: "Shadow copy deletion + backup service termination detected across domain — recovery inhibition active",
      system: "SIEM",
    },
  ],
};

export function detectAction(
  action: AdversaryActionType,
  adversaryState: AdversaryState,
  worldState: WorldState
): DetectionResult {
  const baseProb = BASE_DETECTION[action] ?? 0.5;

  // Higher sophistication = stealthier adversary = lower base detection
  const sophisticationPenalty = adversaryState.sophistication / 250;

  // Active controls raise detection via their individual detectionBoost values (capped at +0.40)
  const activeControls = getActiveControls(worldState.blockedVectors);
  const controlBoost = Math.min(
    0.40,
    activeControls
      .filter((c) => c.detects.includes(action))
      .reduce((sum, c) => sum + c.detectionBoost, 0)
  );

  const finalProb = Math.min(0.98, Math.max(0.05, baseProb - sophisticationPenalty + controlBoost));
  const detected = Math.random() < finalProb;

  const [primaryAlert, hiddenAlert] = ALERT_TEMPLATES[action];
  const techniques = getMitreTechniques(action);

  // Stamp actual MITRE IDs from the map
  const stamped = (alert: TelemetryEvent, idx: number): TelemetryEvent => ({
    ...alert,
    mitreTechniqueId: techniques[idx]?.id ?? alert.mitreTechniqueId,
    visible: detected ? alert.visible : false,
  });

  const alerts = [stamped(primaryAlert, 0), stamped(hiddenAlert, 1)];

  return {
    detected,
    visibleAlerts: alerts.filter((a) => a.visible),
    hiddenTelemetry: alerts.filter((a) => !a.visible),
  };
}
