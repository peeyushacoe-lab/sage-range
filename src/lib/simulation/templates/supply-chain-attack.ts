import type { ScenarioDefinition } from "../types";

export const supplyChainAttack: ScenarioDefinition = {
  slug: "supply-chain-attack",
  name: "Supply Chain Compromise",
  description:
    "A backdoor is discovered in a widely-used npm package your company depends on. The package has 3 million weekly downloads. Assess impact, coordinate vendor disclosure, patch all systems, and navigate a PR firestorm before the press breaks the story.",
  industry: "Software Development",
  difficulty: "HARD",

  stages: [
    {
      id: "NORMAL",
      label: "Normal Operations",
      brief:
        "All systems operational. Your security team subscribes to GitHub Security Advisories and npm audit feeds. A quiet Tuesday morning — until an advisory notification lands in the security inbox flagging 'event-stream' (a package in your build pipeline) as potentially compromised.",
      threat: "LOW",
      autoAdvanceSec: 60,
      nextStage: "DETECTION",
      evidence: [
        "[07:55] GitHub Advisory: GHSA-xxxx-xxxx — 'event-stream@3.3.6' flagged for unexpected dependency injection",
        "[07:58] npm: 'flatmap-stream' dependency added to event-stream without changelog entry",
        "[08:02] SIEM: Routine — no anomalous network activity overnight",
      ],
      pressures: [
        { id: "pr_sc_normal_cto", source: "CEO", message: "Saw a tweet about a supply chain issue in npm. Are we using any affected packages?", urgency: "LOW" },
      ],
      mitre: [
        { id: "T1195.001", name: "Compromise Software Dependencies", tactic: "Initial Access" },
        { id: "T1072", name: "Software Deployment Tools", tactic: "Execution" },
      ],
    },
    {
      id: "DETECTION",
      label: "Backdoor Detected",
      brief:
        "Analysis confirms: 'event-stream@3.3.6' contains 'flatmap-stream', a malicious package that decrypts and executes a payload targeting cryptocurrency wallet credentials. Your production applications — including the customer billing portal — import event-stream. The backdoor has been live in your codebase for 9 weeks.",
      threat: "MEDIUM",
      autoAdvanceSec: 90,
      nextStage: "SCOPE_ANALYSIS",
      evidence: [
        "[08:14] Analysis: flatmap-stream contains AES-256-CBC encrypted payload targeting bitcoin wallet keys",
        "[08:17] Dependency graph: 6 internal services import event-stream — including billing-api and auth-service",
        "[08:21] npm stats: event-stream@3.3.6 has 3.1M weekly downloads — industry-wide impact",
        "[08:25] Git: event-stream first imported into your codebase 9 weeks ago in PR #4821",
        "[08:29] SIEM: Payload decryption requires specific environment variables — may not have executed",
      ],
      pressures: [
        { id: "pr_sc_det_ceo", source: "CEO", message: "Nine weeks. It's been in our code nine weeks. I need to know if it ran — has it executed against our customers?", urgency: "HIGH" },
        { id: "pr_sc_det_pr", source: "PR", message: "I need a statement NOW. Security bloggers are already writing about this. We cannot be seen as reactive.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1059.006", name: "Python/Node.js Execution", tactic: "Execution" },
        { id: "T1552.001", name: "Credentials in Files", tactic: "Credential Access" },
      ],
    },
    {
      id: "SCOPE_ANALYSIS",
      label: "Impact Scope Analysis",
      brief:
        "Deep forensics running. Preliminary findings: the malicious payload appears to have run in 3 production services. Execution logs show decryption attempts in billing-api. However, your environment does not store Bitcoin wallet keys — the payload found no target credentials. Customer PII was NOT directly at risk, but the backdoor could have been repurposed. Legal says disclosure obligations exist regardless.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "VENDOR_NOTIFICATION",
      evidence: [
        "[09:02] Forensics: Payload executed in billing-api, auth-service, and notification-worker",
        "[09:05] Runtime logs: Decryption attempted — no matching wallet credentials found in env",
        "[09:08] DLP: No customer PII exfiltration detected from payload execution",
        "[09:12] Legal: Even without successful exfil, backdoor presence may trigger breach notification in some jurisdictions",
        "[09:15] SIEM: Payload code confirmed capable of C2 communication — but no outbound C2 traffic observed",
      ],
      pressures: [
        { id: "pr_sc_scope_legal", source: "LEGAL", message: "We have to notify affected parties. 'No data stolen' is not the same as 'no breach.' Malicious code executed in production.", urgency: "HIGH" },
        { id: "pr_sc_scope_ceo", source: "CEO", message: "Legal wants full disclosure. PR wants us to wait until patches are ready. I need a decision: do we go public now or after the patch?", urgency: "CRITICAL" },
        { id: "pr_sc_scope_cfо", source: "CFO", message: "Stock price implications are significant if this becomes public before we have a remediation story. Please advise on timing.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1071.001", name: "Application Layer Protocol: Web", tactic: "Command and Control" },
        { id: "T1041", name: "Exfiltration Over C2 Channel", tactic: "Exfiltration" },
      ],
    },
    {
      id: "VENDOR_NOTIFICATION",
      label: "Vendor Coordination",
      brief:
        "You must now coordinate with the npm maintainer and the open-source community. The malicious package owner has been identified as a social engineering attack on the original maintainer. npm Security is aware but has not yet yanked the package — it's still being downloaded 40,000 times per hour. Your patch window is closing as press outlets start publishing.",
      threat: "HIGH",
      autoAdvanceSec: 75,
      nextStage: "PATCH_DEPLOYMENT",
      evidence: [
        "[10:04] npm Security: Aware of issue — removal pending legal verification, ETA 2-4 hours",
        "[10:07] GitHub: 847 repositories have filed issues about event-stream — community aware",
        "[10:09] Press: Motherboard has published initial article — no company names yet",
        "[10:12] npm stats: flatmap-stream still downloading — 40,000 installs/hour ongoing",
        "[10:15] Vendor: Original event-stream maintainer confirms account was socially engineered 9 weeks ago",
      ],
      pressures: [
        { id: "pr_sc_vendor_pr", source: "PR", message: "Motherboard published. We will be named within hours. Get our statement out before we're caught flat-footed.", urgency: "CRITICAL" },
        { id: "pr_sc_vendor_legal", source: "LEGAL", message: "Coordinate disclosure with npm Security before going public. Unilateral disclosure could complicate the vendor's incident response.", urgency: "MEDIUM" },
      ],
      mitre: [
        { id: "T1195.001", name: "Compromise Software Dependencies", tactic: "Initial Access" },
      ],
    },
    {
      id: "PATCH_DEPLOYMENT",
      label: "Patch Deployment",
      brief:
        "Your engineering team has pinned all dependencies to safe versions and is rolling patches through staging and production. 6 services need patching across 4 environments. CI/CD pipelines are running. ETA: 3 hours to full deployment. The press story is live. Industry peers are asking if you were affected.",
      threat: "MEDIUM",
      autoAdvanceSec: 75,
      nextStage: "CUSTOMER_NOTIFICATION",
      evidence: [
        "[11:02] Engineering: event-stream pinned to 3.3.4 in all package.json files — PR merged",
        "[11:05] CI/CD: Patch builds running — billing-api 34% complete, auth-service queued",
        "[11:08] npm: flatmap-stream yanked by npm Security — no longer downloadable",
        "[11:12] Press: The Verge names 3 companies as potentially affected — you are not named yet",
        "[11:15] Peer: Slack message from CISO at competitor — 'are you affected? We are coordinating a joint disclosure'",
      ],
      pressures: [
        { id: "pr_sc_patch_ceo", source: "CEO", message: "Joint disclosure sounds good for liability optics. Do we participate or go it alone with our own statement?", urgency: "MEDIUM" },
        { id: "pr_sc_patch_cfо", source: "CFO", message: "Every hour we delay naming ourselves, we risk being named by the press first. That's a much worse story.", urgency: "HIGH" },
      ],
      mitre: [],
    },
    {
      id: "CUSTOMER_NOTIFICATION",
      label: "Customer Notification",
      brief:
        "Patches are deployed across all production services. Now comes the decision your executive team has been arguing about: how and when to notify your 120,000 customers. Legal recommends transparent disclosure. PR has drafted a holding statement. CEO wants to delay until you can confirm zero data loss with certainty. The clock is running.",
      threat: "MEDIUM",
      autoAdvanceSec: 0,
      nextStage: null,
      breachOnAutoAdvance: true,
      evidence: [
        "[12:01] Engineering: All 6 services patched and deployed to production — verified clean",
        "[12:03] Security: Forensic sweep complete — no evidence of data exfiltration from payload",
        "[12:05] Legal: Recommended customer notification within 24 hours regardless of exfil outcome",
        "[12:08] Press: Wired has named your company — story live with 'investigating' label",
        "[12:10] Customer: 143 inbound support tickets asking if they are affected",
      ],
      pressures: [
        { id: "pr_sc_cust_ceo", source: "CEO", message: "Wired just named us. We are now in full crisis mode. Get the customer notification approved and out within the hour.", urgency: "CRITICAL" },
        { id: "pr_sc_cust_legal", source: "LEGAL", message: "Delay beyond this point creates legal liability. Approve the notification now.", urgency: "CRITICAL" },
        { id: "pr_sc_cust_pr", source: "PR", message: "The story is live. Our silence is the story now. I need approval on this statement in the next 15 minutes.", urgency: "CRITICAL" },
      ],
      mitre: [],
    },
  ],

  actions: [
    // ── Normal (proactive) ──────────────────────────────────────────────────────
    {
      id: "audit_dependencies",
      label: "Run Full Dependency Audit",
      description: "Execute npm audit across all repositories and generate a dependency tree. Identifies the full blast radius of the compromised package.",
      availableInStages: ["NORMAL", "DETECTION"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "pull_the_package",
      label: "Immediately Pin Dependencies to Safe Versions",
      description: "Lock all package.json files to the last known-good event-stream version. Stops new deployments pulling the malicious version.",
      availableInStages: ["NORMAL", "DETECTION"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: -5 },
    },
    // ── Detection ───────────────────────────────────────────────────────────────
    {
      id: "scan_for_compromise",
      label: "Scan All Environments for Payload Execution",
      description: "Search runtime logs and process trees across all environments for evidence the malicious payload decrypted and ran.",
      availableInStages: ["DETECTION", "SCOPE_ANALYSIS"],
      effects: { stageBlocker: false, scoreChange: 18, stealthChange: 0 },
    },
    {
      id: "isolate_affected_services",
      label: "Isolate Affected Services from Production",
      description: "Take billing-api and auth-service offline temporarily while forensics completes. Prevents any active exploitation.",
      availableInStages: ["DETECTION"],
      effects: { stageBlocker: true, scoreChange: 22, stealthChange: -20 },
      consequences: [
        { system: "Billing API", status: "OFFLINE", reason: "Isolated pending forensic review — customer billing paused" },
        { system: "Auth Service", status: "DEGRADED", reason: "Degraded mode — some user logins affected" },
      ],
    },
    // ── Scope Analysis ──────────────────────────────────────────────────────────
    {
      id: "engage_forensics",
      label: "Engage External Forensics Firm",
      description: "Retain a third-party IR firm to perform independent forensic analysis. Provides credible, defensible findings for disclosure.",
      availableInStages: ["SCOPE_ANALYSIS", "VENDOR_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "notify_legal_counsel",
      label: "Engage Legal Counsel on Disclosure Obligations",
      description: "Bring in outside legal counsel to assess disclosure obligations across all jurisdictions where customers are located.",
      availableInStages: ["SCOPE_ANALYSIS"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    {
      id: "early_disclosure",
      label: "Issue Early Transparency Statement",
      description: "Publish a brief public statement acknowledging awareness of the supply chain issue before being named by the press. Controls the narrative.",
      availableInStages: ["SCOPE_ANALYSIS", "VENDOR_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: 0 },
    },
    {
      id: "delay_for_patch",
      label: "Delay Public Disclosure Until Patches Are Ready",
      description: "Withhold public statement until all systems are patched. Lower customer confusion but higher legal and reputational risk if press names you first.",
      availableInStages: ["SCOPE_ANALYSIS"],
      effects: { stageBlocker: false, scoreChange: -8, stealthChange: 10 },
    },
    // ── Vendor Notification ─────────────────────────────────────────────────────
    {
      id: "coordinate_with_npm",
      label: "Coordinate Directly with npm Security Team",
      description: "Establish direct contact with npm Security to share forensic findings and request expedited package removal.",
      availableInStages: ["VENDOR_NOTIFICATION"],
      effects: { stageBlocker: true, scoreChange: 20, stealthChange: -10 },
    },
    {
      id: "join_joint_disclosure",
      label: "Join Industry Joint Disclosure",
      description: "Participate in coordinated multi-vendor disclosure statement. Distributes reputational pressure across affected companies.",
      availableInStages: ["VENDOR_NOTIFICATION", "PATCH_DEPLOYMENT"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: -5 },
    },
    // ── Patch Deployment ────────────────────────────────────────────────────────
    {
      id: "accelerate_patch",
      label: "Accelerate Patch Deployment — Skip Staging",
      description: "Push patches directly to production without full staging validation. Fastest remediation but increases deployment risk.",
      availableInStages: ["PATCH_DEPLOYMENT"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: -15 },
      consequences: [
        { system: "Production Services", status: "DEGRADED", reason: "Accelerated deploy — brief instability during rollout" },
      ],
    },
    {
      id: "notify_customers_early",
      label: "Notify Customers Before Patches Complete",
      description: "Send customer notification immediately, before all patches are deployed. Transparent but may cause premature alarm.",
      availableInStages: ["PATCH_DEPLOYMENT"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    // ── Customer Notification ───────────────────────────────────────────────────
    {
      id: "full_customer_notification",
      label: "Send Full Customer Disclosure Notification",
      description: "Dispatch email to all 120,000 customers explaining the supply chain incident, what was at risk, and what you've done to remediate.",
      availableInStages: ["CUSTOMER_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: 0 },
    },
    {
      id: "press_statement",
      label: "Issue Public Press Statement",
      description: "Publish a detailed technical blog post and press release. Demonstrates transparency and controls the public narrative.",
      availableInStages: ["CUSTOMER_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "ceo_video_statement",
      label: "CEO Public Video Statement",
      description: "CEO records a 2-minute video statement accepting accountability and outlining remediation steps. High visibility, high trust signal.",
      availableInStages: ["CUSTOMER_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
  ],
};
