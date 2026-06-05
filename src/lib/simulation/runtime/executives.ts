import type { Executive } from "../types";

export type ExecReaction = {
  role: "CEO" | "CFO" | "CISO" | "LEGAL" | "PR";
  delta: number;
  reason: string;
};

export type ExecDemands = Record<string, Record<string, string>>;

const PHISHING_RANSOMWARE_DEMANDS: ExecDemands = {
  INITIAL_COMPROMISE: {
    CEO: "Assess impact quickly. We need this resolved.",
    CFO: "How long until payroll systems are back?",
    CISO: "Isolate affected systems now — don't let this spread.",
    LEGAL: "Do NOT touch any evidence before we document it.",
    PR: "I need a statement ready before this hits social media.",
  },
  LATERAL_MOVEMENT: {
    CEO: "This is getting worse. I want options on the table.",
    CFO: "Finance servers must stay online for tomorrow's payroll.",
    CISO: "We need to cut off their pivot paths.",
    LEGAL: "Any ransom payment must go through me first.",
    PR: "Employees are starting to ask questions. I need talking points.",
  },
  RANSOMWARE_DEPLOYED: {
    CEO: "What's our fastest path to recovery?",
    CFO: "Calculate the cost of paying vs not paying — I need numbers.",
    CISO: "We cannot pay. It sets a precedent.",
    LEGAL: "Paying may violate sanctions. Stand by.",
    PR: "Full comms blackout until we have a position.",
  },
};

const INSIDER_THREAT_DEMANDS: ExecDemands = {
  PRIVILEGE_ABUSE: {
    CEO: "Legal just called me directly. What is the status of this internal breach?",
    CFO: "Payroll records were in that export. What is our Sarbanes-Oxley exposure?",
    CISO: "Revoke his access immediately. Every minute increases our exposure.",
    LEGAL: "Do not alert the employee until we have legal hold documentation in place.",
    PR: "If this leaks to staff before we communicate, panic will follow. Prepare internal messaging.",
  },
  DATA_STAGING: {
    CEO: "Why is this person still on the network? I need answers.",
    CFO: "Quantify the financial exposure if this data reaches a competitor.",
    CISO: "Lock the workstation now. Evidence preservation is secondary to stopping the transfer.",
    LEGAL: "DLP alert triggered legal hold. Do NOT allow the workstation to be wiped.",
    PR: "Keep this internal. No external statement until Legal clears it.",
  },
  BREACH_CONFIRMED: {
    CEO: "340,000 patients. The board is convening. I need a full brief in one hour.",
    CFO: "HIPAA penalties can reach $1.9M per violation. Get Legal and Finance aligned.",
    CISO: "Engage external forensics. We need court-ready evidence immediately.",
    LEGAL: "HIPAA Breach Notification Rule is triggered. 60-day clock starts now.",
    PR: "Local press has a source. We need a statement in the next two hours.",
  },
};

const DEMANDS_BY_TEMPLATE: Record<string, ExecDemands> = {
  "phishing-to-ransomware": PHISHING_RANSOMWARE_DEMANDS,
  "insider-threat": INSIDER_THREAT_DEMANDS,
};

export function getExecDemandsForStage(
  templateSlug: string,
  stage: string
): Record<string, string> | null {
  return DEMANDS_BY_TEMPLATE[templateSlug]?.[stage] ?? null;
}

function actionMatchesKeyword(actionId: string, keywords: string[]): boolean {
  const lower = actionId.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function getExecReactionsForAction(actionId: string): ExecReaction[] {
  if (actionMatchesKeyword(actionId, ["isolate", "contain", "segment", "revoke_elevated", "confiscate", "block_all_egress"])) {
    return [
      { role: "CISO", delta: 15, reason: "Good call — containment first." },
      { role: "CFO", delta: -10, reason: "That system was critical. What's the business impact?" },
    ];
  }

  if (actionMatchesKeyword(actionId, ["notify", "report", "engage_hr", "engage_dlp", "file_hipaa", "engage_law"])) {
    return [
      { role: "LEGAL", delta: 10, reason: "Proper documentation. Well done." },
      { role: "PR", delta: 5, reason: "Good. Keep comms controlled." },
      { role: "CISO", delta: 5, reason: "Coordinated response — noted." },
    ];
  }

  if (actionMatchesKeyword(actionId, ["pay_ransom"])) {
    return [
      { role: "CEO", delta: 10, reason: "Quick resolution is what matters." },
      { role: "CISO", delta: -20, reason: "Absolutely not. This makes us a target forever." },
      { role: "LEGAL", delta: -15, reason: "This may violate OFAC sanctions." },
      { role: "PR", delta: -5, reason: "Paying will leak to press." },
    ];
  }

  if (actionMatchesKeyword(actionId, ["preserve", "forensic", "evidence", "pull_access", "investigate"])) {
    return [
      { role: "LEGAL", delta: 15, reason: "Excellent — chain of custody matters." },
      { role: "CISO", delta: 10, reason: "Right call." },
      { role: "CFO", delta: -5, reason: "This is slowing our recovery." },
    ];
  }

  if (actionMatchesKeyword(actionId, ["monitor_silently", "shadow_monitoring", "delay"])) {
    return [
      { role: "CEO", delta: -5, reason: "We need faster decisions." },
      { role: "CFO", delta: -5, reason: "We need faster decisions." },
      { role: "CISO", delta: -5, reason: "We need faster decisions." },
      { role: "LEGAL", delta: -5, reason: "We need faster decisions." },
      { role: "PR", delta: -5, reason: "We need faster decisions." },
    ];
  }

  return [];
}

const PHISHING_RANSOMWARE_EXECS: Executive[] = [
  { name: "Marcus Webb", title: "Chief Executive Officer", role: "CEO", priority: "Minimal disclosure and fast resolution", satisfaction: 70, demand: "" },
  { name: "Diana Chen", title: "Chief Financial Officer", role: "CFO", priority: "Business continuity", satisfaction: 70, demand: "" },
  { name: "Raj Patel", title: "Chief Information Security Officer", role: "CISO", priority: "Security-first decisions", satisfaction: 70, demand: "" },
  { name: "Sophia Torres", title: "General Counsel", role: "LEGAL", priority: "Evidence preservation and controlled disclosure", satisfaction: 70, demand: "" },
  { name: "James O'Brien", title: "VP Public Relations", role: "PR", priority: "Controlled communications", satisfaction: 70, demand: "" },
];

const INSIDER_THREAT_EXECS: Executive[] = [
  { name: "Victoria Nash", title: "Chief Executive Officer", role: "CEO", priority: "Minimal disclosure and fast resolution", satisfaction: 70, demand: "" },
  { name: "Howard Kim", title: "Chief Financial Officer", role: "CFO", priority: "Business continuity and financial exposure", satisfaction: 70, demand: "" },
  { name: "Priya Sharma", title: "Chief Information Security Officer", role: "CISO", priority: "Security-first decisions", satisfaction: 70, demand: "" },
  { name: "Ethan Cross", title: "General Counsel", role: "LEGAL", priority: "Evidence preservation and legal hold compliance", satisfaction: 70, demand: "" },
  { name: "Camille Dubois", title: "VP Public Relations", role: "PR", priority: "Controlled external communications", satisfaction: 70, demand: "" },
];

export function getExecutivesForTemplate(templateSlug: string): Executive[] {
  if (templateSlug === "phishing-to-ransomware") return PHISHING_RANSOMWARE_EXECS;
  if (templateSlug === "insider-threat") return INSIDER_THREAT_EXECS;
  return PHISHING_RANSOMWARE_EXECS;
}
