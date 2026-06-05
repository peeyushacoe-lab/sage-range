import type { ScenarioDefinition } from "../types";

export const dataBreach: ScenarioDefinition = {
  slug: "data-breach",
  name: "Data Breach: SQL Injection",
  description:
    "Your WAF detected and blocked a SQL injection attempt — but logs show it succeeded 6 hours earlier. Customer PII for 450,000 accounts may have been exfiltrated. GDPR requires notification within 72 hours. The clock is ticking.",
  industry: "E-Commerce",
  difficulty: "MEDIUM",

  stages: [
    {
      id: "NORMAL",
      label: "Normal Operations",
      brief:
        "All e-commerce systems operational. Peak trading period — 12,000 active customer sessions. Your WAF is logging a higher-than-usual volume of anomalous requests against the product search endpoint. The on-call analyst has flagged it for morning review.",
      threat: "LOW",
      autoAdvanceSec: 60,
      nextStage: "INITIAL_DETECTION",
      evidence: [
        "[02:14] WAF: 847 anomalous requests to /api/search — patterns consistent with scanning",
        "[02:18] SIEM: Low-confidence alert — unusual query parameter encoding in search requests",
        "[02:23] Web: Search endpoint response times up 12% — possible heavy query load",
      ],
      pressures: [
        { id: "pr_db_normal_eng", source: "IT_HELPDESK", message: "On-call log: WAF showing elevated search endpoint probing — flagged for morning review.", urgency: "LOW" },
      ],
      mitre: [
        { id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access" },
        { id: "T1595.002", name: "Vulnerability Scanning", tactic: "Reconnaissance" },
      ],
    },
    {
      id: "INITIAL_DETECTION",
      label: "SQL Injection Detected",
      brief:
        "The WAF has blocked a confirmed SQL injection attempt at 08:47. However — reviewing overnight logs reveals the same attack pattern succeeded at 02:31, before the WAF rule was tuned. The attacker had a 6-hour window of undetected access to the customer database. GDPR clock may already be running from the point of initial access.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "CONTAINMENT",
      evidence: [
        "[08:47] WAF: BLOCKED — SQL injection attempt on /api/search?q='; DROP TABLE customers--",
        "[08:51] Log Review: WAF rule gap — identical pattern NOT blocked at 02:31 this morning",
        "[08:54] DB Logs: 02:31 — Union-based SQL injection succeeded — INFORMATION_SCHEMA queried",
        "[08:57] DB Logs: 02:31-02:44 — Multiple SELECT queries across customers, orders, and payment_tokens tables",
        "[09:02] SIEM: HIGH — Retrospective SQLi detection — 6-hour undetected access window confirmed",
      ],
      pressures: [
        { id: "pr_db_det_ceo", source: "CEO", message: "Someone got into our database six hours ago and we didn't know? What data did they access?", urgency: "HIGH" },
        { id: "pr_db_det_legal", source: "LEGAL", message: "GDPR Article 33 — 72-hour notification clock runs from when we BECAME AWARE of the breach, not when it happened. We are aware now. Clock is running.", urgency: "CRITICAL" },
      ],
      mitre: [
        { id: "T1190", name: "Exploit Public-Facing Application", tactic: "Initial Access" },
        { id: "T1005", name: "Data from Local System", tactic: "Collection" },
        { id: "T1059.007", name: "JavaScript", tactic: "Execution" },
      ],
    },
    {
      id: "CONTAINMENT",
      label: "Vulnerability Containment",
      brief:
        "The SQL injection vulnerability is confirmed in the search endpoint — unsanitised user input passed directly to a raw query. The vulnerability has been present since a code commit 14 months ago. You must patch the vulnerability, preserve evidence for forensics, and determine the full scope of data accessed — all while the 72-hour GDPR clock is ticking. You have approximately 63 hours remaining.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "FORENSICS",
      evidence: [
        "[09:14] Code Review: /api/search endpoint — `db.query('SELECT * FROM products WHERE name = ' + req.query.q)` — unparameterised",
        "[09:17] Git: Vulnerable code introduced in commit a3f7c12 — 14 months ago, never flagged in code review",
        "[09:21] DB: Attacker queried customers (450,342 rows), orders (1.2M rows), payment_tokens (partial)",
        "[09:25] SIEM: No active exploitation ongoing — attacker has disconnected",
        "[09:28] Timer: GDPR 72-hour notification clock — ~63 hours remaining",
      ],
      pressures: [
        { id: "pr_db_cont_cto", source: "IT_HELPDESK", message: "Engineering wants to deploy the patch immediately. But pushing to prod without forensic preservation could destroy evidence.", urgency: "HIGH" },
        { id: "pr_db_cont_legal", source: "LEGAL", message: "Do NOT wipe or redeploy the affected server before forensics captures a disk image. Destruction of evidence is a separate legal exposure.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1083", name: "File and Directory Discovery", tactic: "Discovery" },
        { id: "T1213", name: "Data from Information Repositories", tactic: "Collection" },
      ],
    },
    {
      id: "FORENSICS",
      label: "Forensic Investigation",
      brief:
        "Forensic analysis is underway. Preliminary findings confirm 450,000 customer records were accessed: names, email addresses, bcrypt-hashed passwords, and partial payment card tokens (last 4 digits only — PCI-DSS scope limited). Full payment card data is NOT compromised. Database access logs show data was exfiltrated via HTTP responses — no secondary C2 channel observed. GDPR clock: ~48 hours remaining.",
      threat: "MEDIUM",
      autoAdvanceSec: 90,
      nextStage: "REGULATORY_NOTIFICATION",
      evidence: [
        "[11:02] Forensics: Disk image captured from web server — evidence preserved",
        "[11:07] DB Logs: 450,342 customer records confirmed accessed: name, email, bcrypt password hash, last-4 card digits",
        "[11:12] PCI-DSS: Full card numbers NOT in scope — payment vault uses tokenisation, not affected",
        "[11:15] Network Logs: Data returned via HTTP response body — no malware installed, no persistence",
        "[11:20] Forensics: Attacker IP 185.234.219.4 — exit node, likely VPN/proxy",
        "[11:25] Timer: GDPR 72-hour clock — approximately 48 hours remaining",
      ],
      pressures: [
        { id: "pr_db_for_ceo", source: "CEO", message: "450,000 customers. What are we obligated to do and when? I need a decision brief in the next hour.", urgency: "HIGH" },
        { id: "pr_db_for_legal", source: "LEGAL", message: "Forensic scope is sufficient to notify the ICO. We must file within 48 hours or face significant fines. Prepare notification now.", urgency: "CRITICAL" },
      ],
      mitre: [],
    },
    {
      id: "REGULATORY_NOTIFICATION",
      label: "Regulatory Notification",
      brief:
        "Legal has confirmed notification obligations: ICO (UK) and relevant EU supervisory authorities must be notified under GDPR Article 33 within 72 hours. Your DPO is preparing the notification. The vulnerability has been patched. You must also decide on customer notification timing — GDPR Article 34 requires direct notification if there is high risk to individuals. GDPR clock: ~24 hours remaining.",
      threat: "MEDIUM",
      autoAdvanceSec: 75,
      nextStage: "CUSTOMER_NOTIFICATION",
      evidence: [
        "[13:04] Legal: GDPR Article 33 notification to ICO prepared — awaiting approval",
        "[13:07] DPO: ICO online portal submission ready — incident reference number allocated",
        "[13:10] Patch: SQL injection fix deployed to production — parameterised queries confirmed",
        "[13:14] WAF: Updated rules deployed — all SQLi variants now blocked",
        "[13:18] Timer: GDPR 72-hour clock — approximately 24 hours remaining",
      ],
      pressures: [
        { id: "pr_db_reg_legal", source: "LEGAL", message: "File the ICO notification now. 24 hours left. A missed deadline carries up to 2% global annual turnover in fines.", urgency: "CRITICAL" },
        { id: "pr_db_reg_pr", source: "PR", message: "We are going to notify 450,000 customers. The press will find out. Let us own this story before it leaks.", urgency: "HIGH" },
        { id: "pr_db_reg_ceo", source: "CEO", message: "Do we notify customers before or after filing with the ICO? I need a recommended sequence of actions.", urgency: "HIGH" },
      ],
      mitre: [],
    },
    {
      id: "CUSTOMER_NOTIFICATION",
      label: "Customer Notification",
      brief:
        "The ICO notification has been filed. Now you must notify affected customers under GDPR Article 34. 450,000 notification emails need to be prepared, approved, and sent. Your customer communications team has drafted an email. Legal wants specific language. PR wants customer-friendly language. The CEO wants it out before the press runs the story. GDPR clock: final hours.",
      threat: "LOW",
      autoAdvanceSec: 0,
      nextStage: null,
      breachOnAutoAdvance: true,
      evidence: [
        "[15:01] DPO: ICO notification filed — reference ICO-2024-XXXXX — acknowledged",
        "[15:05] Comms: Draft customer notification email ready — legal review in progress",
        "[15:08] Timer: GDPR deadline in final hours — delay risks non-compliance",
        "[15:12] Press: A tech journalist has emailed asking for comment on 'reports of a data breach'",
        "[15:15] Customer: First social media posts from customers noticing security notification emails sent by other platforms",
      ],
      pressures: [
        { id: "pr_db_cust_ceo", source: "CEO", message: "A journalist has asked for comment. We have minutes, not hours. Approve the customer notification and the press statement simultaneously.", urgency: "CRITICAL" },
        { id: "pr_db_cust_legal", source: "LEGAL", message: "Customer notification must go out before the GDPR deadline. Approve and send immediately.", urgency: "CRITICAL" },
        { id: "pr_db_cust_pr", source: "PR", message: "If the press story goes live before our customer emails hit inboxes, this becomes a crisis of trust, not just a security incident.", urgency: "CRITICAL" },
      ],
      mitre: [],
    },
  ],

  actions: [
    // ── Normal (proactive) ──────────────────────────────────────────────────────
    {
      id: "review_waf_logs",
      label: "Review WAF Logs Immediately",
      description: "Escalate the WAF anomaly flag from the overnight log. Pull full request logs for the search endpoint across the past 12 hours.",
      availableInStages: ["NORMAL", "INITIAL_DETECTION"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    {
      id: "tune_waf_rules",
      label: "Tune WAF Rules for SQLi Patterns",
      description: "Update WAF ruleset to block common SQL injection patterns including union-based, error-based, and time-based variants.",
      availableInStages: ["NORMAL", "INITIAL_DETECTION"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: -5 },
    },
    // ── Initial Detection ───────────────────────────────────────────────────────
    {
      id: "patch_vulnerability",
      label: "Emergency Patch — Parameterise All Queries",
      description: "Deploy hotfix converting the vulnerable raw query to parameterised prepared statements. Closes the injection vector immediately.",
      availableInStages: ["INITIAL_DETECTION", "CONTAINMENT"],
      effects: { stageBlocker: true, scoreChange: 25, stealthChange: -10 },
      consequences: [
        { system: "Search API", status: "DEGRADED", reason: "Brief downtime during emergency patch deployment" },
      ],
    },
    {
      id: "preserve_evidence",
      label: "Capture Forensic Disk Image",
      description: "Preserve a bit-for-bit forensic image of the affected web server before any changes are made. Critical for legal chain of custody.",
      availableInStages: ["INITIAL_DETECTION", "CONTAINMENT"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: 0 },
    },
    {
      id: "engage_ir_team",
      label: "Activate Incident Response Team",
      description: "Formally declare a P1 incident and convene the IR team. Coordinates legal, security, comms, and engineering under unified command.",
      availableInStages: ["INITIAL_DETECTION", "CONTAINMENT"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    // ── Containment ─────────────────────────────────────────────────────────────
    {
      id: "take_endpoint_offline",
      label: "Take Vulnerable Endpoint Offline",
      description: "Temporarily disable the /api/search endpoint. Eliminates attack surface while forensics completes. Impacts customer search functionality.",
      availableInStages: ["CONTAINMENT"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: -20 },
      consequences: [
        { system: "Product Search", status: "OFFLINE", reason: "Search endpoint disabled — customers cannot search catalogue" },
      ],
    },
    {
      id: "database_audit",
      label: "Run Full Database Access Audit",
      description: "Pull complete DB audit logs for the past 24 hours. Determines exact tables, row counts, and data types accessed during the breach window.",
      availableInStages: ["CONTAINMENT", "FORENSICS"],
      effects: { stageBlocker: false, scoreChange: 18, stealthChange: 0 },
    },
    // ── Forensics ───────────────────────────────────────────────────────────────
    {
      id: "engage_external_forensics",
      label: "Engage External Forensics Firm",
      description: "Retain a specialist DFIR firm for independent forensic investigation. Provides court-defensible findings and independent scope confirmation.",
      availableInStages: ["FORENSICS"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "reset_customer_passwords",
      label: "Force Reset All Customer Passwords",
      description: "Invalidate all customer session tokens and force password resets on next login. Mitigates risk from exposed hashed credentials.",
      availableInStages: ["FORENSICS", "REGULATORY_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: -10 },
      consequences: [
        { system: "Customer Auth", status: "DEGRADED", reason: "Mass password reset — all customers must reset on next login" },
      ],
    },
    // ── Regulatory Notification ─────────────────────────────────────────────────
    {
      id: "file_ico_notification",
      label: "File GDPR Notification with ICO",
      description: "Submit mandatory GDPR Article 33 breach notification to the Information Commissioner's Office. Required within 72 hours.",
      availableInStages: ["REGULATORY_NOTIFICATION"],
      effects: { stageBlocker: true, scoreChange: 22, stealthChange: 0 },
    },
    {
      id: "appoint_dpo",
      label: "Engage Data Protection Officer",
      description: "Formally engage your DPO to oversee GDPR compliance and coordinate regulatory notifications across all applicable jurisdictions.",
      availableInStages: ["REGULATORY_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Customer Notification ───────────────────────────────────────────────────
    {
      id: "send_customer_emails",
      label: "Send Customer Breach Notification Emails",
      description: "Dispatch breach notification emails to all 450,000 affected customers. Complies with GDPR Article 34 and demonstrates transparency.",
      availableInStages: ["CUSTOMER_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 18, stealthChange: 0 },
    },
    {
      id: "publish_incident_post",
      label: "Publish Public Incident Transparency Report",
      description: "Publish a detailed incident report on your blog. Explains what happened, what data was affected, and what you have done. Builds long-term trust.",
      availableInStages: ["CUSTOMER_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "offer_credit_monitoring",
      label: "Offer Affected Customers Free Credit Monitoring",
      description: "Provide 12 months of identity theft protection and credit monitoring to all affected customers. Demonstrates accountability.",
      availableInStages: ["CUSTOMER_NOTIFICATION"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
  ],
};
