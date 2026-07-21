import type { ScenarioDefinition } from "../types";

export const insiderThreat: ScenarioDefinition = {
  slug: "insider-threat",
  name: "Insider Threat: The Disgruntled Admin",
  description:
    "A senior IT administrator with privileged access begins abusing their position. HR flags behavioral changes. Identify the threat before patient data is exfiltrated and HIPAA obligations are triggered.",
  industry: "Healthcare",
  difficulty: "HARD",

  stages: [
    {
      id: "NORMAL",
      label: "Normal Operations",
      brief:
        "All systems nominal. HR has filed a confidential flag about a senior IT administrator showing signs of disengagement following a denied promotion. No technical indicators yet — but the window to act proactively is open.",
      threat: "LOW",
      autoAdvanceSec: 60,
      nextStage: "SUSPICIOUS_ACCESS",
      evidence: [
        "[08:30] HR: Confidential flag — senior IT admin Marcus Webb denied promotion, expressing frustration",
        "[08:45] SIEM: Baseline — no anomalous access patterns in past 30 days",
        "[08:50] DLP: Routine scan complete, no policy violations",
      ],
      pressures: [
        { id: "pr_it_normal_hr", source: "HR", message: "Confidential: please review the behavioral flag filed this morning before it escalates.", urgency: "LOW" },
      ],
      mitre: [
        { id: "T1078.002", name: "Domain Accounts", tactic: "Initial Access" },
        { id: "T1069.002", name: "Domain Groups", tactic: "Discovery" },
      ],
    },
    {
      id: "SUSPICIOUS_ACCESS",
      label: "Suspicious Access Patterns",
      brief:
        "Anomalous behavior detected. Marcus Webb has been accessing the patient records database outside his normal working hours — late evenings and early mornings over the past three days. Access volumes are 4x baseline.",
      threat: "MEDIUM",
      autoAdvanceSec: 90,
      nextStage: "PRIVILEGE_ABUSE",
      evidence: [
        "[22:14] PAM: Marcus.Webb accessed EHR database at 22:14 — outside normal 08:00-18:00 window",
        "[23:41] SIEM: 4,200 record queries by Marcus.Webb — baseline is ~900/day",
        "[00:12] PAM: Marcus.Webb accessed patient_records_backup schema — not part of his role",
        "[06:03] SIEM: Second after-hours access session began — 3 consecutive days",
      ],
      pressures: [
        { id: "pr_it_susp_hr", source: "HR", message: "Compliance is asking whether the flagged employee's access should be reviewed. Do you need HR involvement?", urgency: "MEDIUM" },
        { id: "pr_it_susp_legal", source: "LEGAL", message: "After-hours bulk database access may constitute unauthorized use. Document everything.", urgency: "MEDIUM" },
      ],
      mitre: [
        { id: "T1078", name: "Valid Accounts", tactic: "Defense Evasion" },
        { id: "T1530", name: "Data from Cloud Storage", tactic: "Collection" },
      ],
    },
    {
      id: "PRIVILEGE_ABUSE",
      label: "Privilege Abuse Confirmed",
      brief:
        "Marcus Webb is using his domain admin rights to access systems well outside his IT infrastructure role. He has queried payroll records, executive compensation data, and bulk-exported 85,000 patient records using a service account he controls.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "DATA_STAGING",
      evidence: [
        "[14:22] PAM: Marcus.Webb used svc-backup account to run bulk export — 85,432 patient records",
        "[14:25] AD: svc-backup permissions modified by Marcus.Webb to include HR and Finance schemas",
        "[14:31] SIEM: HIGH — Privileged account accessing out-of-scope data resources",
        "[14:35] DLP: Bulk export of PII detected — SSN, DOB, insurance data included",
        "[14:40] SIEM: Marcus.Webb accessed executive payroll schema — unauthorized access",
      ],
      pressures: [
        { id: "pr_it_priv_ceo", source: "CEO", message: "Legal just called me directly. We have a potential insider data breach. What is the status?", urgency: "HIGH" },
        { id: "pr_it_priv_cfо", source: "CFO", message: "Payroll records were in that export. If this leaks we have Sarbanes-Oxley exposure.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1548", name: "Abuse Elevation Control Mechanism", tactic: "Privilege Escalation" },
        { id: "T1003", name: "OS Credential Dumping", tactic: "Credential Access" },
      ],
    },
    {
      id: "DATA_STAGING",
      label: "Data Being Staged",
      brief:
        "A 12GB archive is being assembled on Marcus Webb's workstation. The archive contains patient records, payroll exports, and system architecture documentation. USB storage device connected. He appears to be preparing to exfiltrate the data.",
      threat: "HIGH",
      autoAdvanceSec: 75,
      nextStage: "EXFIL_ACTIVE",
      evidence: [
        "[16:02] Endpoint: Archive 'backup_2024.zip' being assembled on WKSTN-IT-WEBB — 12.4GB",
        "[16:05] DLP: USB storage device (SanDisk 32GB) connected to WKSTN-IT-WEBB",
        "[16:08] SIEM: Compression of PII dataset — patient_export_full.csv, hr_payroll.xlsx, network_diagrams.pdf",
        "[16:11] EDR: Attempt to disable DLP agent on WKSTN-IT-WEBB — blocked",
        "[16:14] SIEM: Personal Dropbox sync process started on WKSTN-IT-WEBB",
      ],
      pressures: [
        { id: "pr_it_stag_legal", source: "LEGAL", message: "DLP alert triggered legal hold obligations. Do NOT allow the workstation to be wiped before forensics.", urgency: "CRITICAL" },
        { id: "pr_it_stag_regulator", source: "REGULATOR", message: "HIPAA Breach Rule may apply if 500+ patients are affected. Notify HHS within 60 days of discovery.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1074.001", name: "Local Data Staging", tactic: "Collection" },
        { id: "T1052.001", name: "Exfiltration over USB", tactic: "Exfiltration" },
      ],
    },
    {
      id: "EXFIL_ACTIVE",
      label: "Active Exfiltration",
      brief:
        "Data is being transferred now. 8GB already uploaded to personal Dropbox. USB copy complete. Marcus Webb's workstation shows a cleartext transfer to an external IP address. 340,000 patient records confirmed in the exfiltrated set — HIPAA notification obligations are imminent.",
      threat: "CRITICAL",
      autoAdvanceSec: 60,
      nextStage: "BREACH_CONFIRMED",
      evidence: [
        "[16:19] DLP: 8.2GB uploaded to dropbox.com from WKSTN-IT-WEBB — transfer complete",
        "[16:20] Network: USB transfer confirmed — 12.4GB to SanDisk device",
        "[16:22] SIEM: CRITICAL — PII exfiltration confirmed. Patient count: 340,447",
        "[16:24] Network: Cleartext HTTP transfer to 185.220.101.45 — 340MB additional",
        "[16:26] Legal: HIPAA Breach Rule 60-day notification clock potentially triggered",
      ],
      pressures: [
        { id: "pr_it_exfil_ceo", source: "CEO", message: "340,000 patients. This is catastrophic. Board is convening an emergency session in 2 hours.", urgency: "CRITICAL" },
        { id: "pr_it_exfil_pr", source: "PR", message: "Local news outlet has a source. They are publishing in 4 hours. We need a statement now.", urgency: "CRITICAL" },
      ],
      mitre: [
        { id: "T1567.002", name: "Exfiltration to Cloud Storage", tactic: "Exfiltration" },
        { id: "T1048", name: "Exfiltration Over Alternative Protocol", tactic: "Exfiltration" },
      ],
    },
    {
      id: "BREACH_CONFIRMED",
      label: "Data Breach Confirmed",
      brief:
        "340,447 patient records are confirmed exfiltrated. Marcus Webb's workstation has been wiped remotely. A portion of the data has appeared on a dark web paste site. HIPAA breach notification is mandatory within 60 days. OCR investigation likely.",
      threat: "CRITICAL",
      autoAdvanceSec: 0,
      nextStage: null,
      breachOnAutoAdvance: true,
      evidence: [
        "[17:05] OSINT: Patient PII matching exported dataset found on paste.darkweb — sample of 1,200 records",
        "[17:08] Forensics: WKSTN-IT-WEBB wiped — secure erase performed by Marcus.Webb",
        "[17:10] Legal: HIPAA Breach Notification Rule triggered — 340,447 individuals affected",
        "[17:12] Executive: CEO and Board notified — regulatory exposure confirmed",
        "[17:15] OCR: HHS Office for Civil Rights notification required within 60 days",
      ],
    },
  ],

  actions: [
    // ── Normal (proactive) ─────────────────────────────────────────────────────
    {
      id: "review_hr_flag",
      label: "Review HR Behavioral Flag",
      description: "Pull the confidential HR report on Marcus Webb. Understand the context before acting.",
      availableInStages: ["NORMAL"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    {
      id: "baseline_admin_access",
      label: "Audit Privileged Access Baseline",
      description: "Run a PAM report establishing normal access patterns for all privileged accounts.",
      availableInStages: ["NORMAL", "SUSPICIOUS_ACCESS"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: -5 },
    },
    {
      id: "schedule_performance_review",
      label: "Schedule 1:1 with Marcus Webb",
      description: "HR flagged a performance concern. Book a meeting — address the issue through proper people management channels.",
      availableInStages: ["NORMAL"],
      effects: { stageBlocker: false, scoreChange: -8, stealthChange: 0 },
    },
    // ── Suspicious Access ──────────────────────────────────────────────────────
    {
      id: "restrict_after_hours",
      label: "Restrict After-Hours Database Access",
      description: "Apply time-based access controls to the EHR database. Blocks the suspicious access pattern.",
      availableInStages: ["SUSPICIOUS_ACCESS"],
      effects: { stageBlocker: true, scoreChange: 20, stealthChange: -10 },
    },
    {
      id: "pull_access_logs",
      label: "Pull Full Access Audit Logs",
      description: "Export 30-day PAM and database access logs for Marcus Webb's accounts. Builds the evidence chain.",
      availableInStages: ["SUSPICIOUS_ACCESS", "PRIVILEGE_ABUSE"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "shadow_monitoring",
      label: "Enable Silent Shadow Monitoring",
      description: "Activate covert screen recording and keylogging on WKSTN-IT-WEBB without alerting the subject.",
      availableInStages: ["SUSPICIOUS_ACCESS", "PRIVILEGE_ABUSE"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 15 },
    },
    {
      id: "confront_employee_directly",
      label: "Call Marcus Webb Into Your Office Now",
      description: "You have enough to confront him. Bring him in, show him the logs, demand an explanation.",
      availableInStages: ["SUSPICIOUS_ACCESS"],
      effects: { stageBlocker: false, scoreChange: -18, stealthChange: 0 },
    },
    // ── Privilege Abuse ────────────────────────────────────────────────────────
    {
      id: "revoke_elevated_privileges",
      label: "Revoke Elevated Privileges",
      description: "Strip Marcus Webb's domain admin rights and disable the svc-backup service account immediately.",
      availableInStages: ["PRIVILEGE_ABUSE"],
      effects: { stageBlocker: true, scoreChange: 25, stealthChange: -20 },
      consequences: [
        { system: "Backup Service", status: "OFFLINE", reason: "svc-backup account disabled — scheduled backups halted" },
      ],
    },
    {
      id: "engage_hr_legal",
      label: "Engage HR and Legal",
      description: "Formally loop in HR and Legal. Starts documentation chain for potential disciplinary action.",
      availableInStages: ["PRIVILEGE_ABUSE", "DATA_STAGING"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Data Staging ────────────────────────────────────────────────────────────
    {
      id: "confiscate_devices",
      label: "Remote Wipe and Lock Workstation",
      description: "Remotely lock WKSTN-IT-WEBB and issue a legal hold. Prevents USB transfer and cloud sync.",
      availableInStages: ["DATA_STAGING"],
      effects: { stageBlocker: true, scoreChange: 22, stealthChange: -30 },
      consequences: [
        { system: "WKSTN-IT-WEBB", status: "OFFLINE", reason: "Remote-locked — legal hold in place, IT admin unable to work" },
      ],
    },
    {
      id: "disable_cloud_sync",
      label: "Block Personal Cloud Storage",
      description: "Apply firewall rules blocking Dropbox, Google Drive, and OneDrive at the perimeter.",
      availableInStages: ["DATA_STAGING", "EXFIL_ACTIVE"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: -15 },
    },
    {
      id: "preserve_forensic_image",
      label: "Capture Forensic Disk Image",
      description: "Take a bit-for-bit forensic image of WKSTN-IT-WEBB before any changes are made. Preserves evidence.",
      availableInStages: ["DATA_STAGING", "EXFIL_ACTIVE"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    // ── Exfil Active ────────────────────────────────────────────────────────────
    {
      id: "block_all_egress",
      label: "Emergency Egress Block — All Uplinks",
      description: "Block all outbound traffic from the affected workstation and VLAN. Stops active transfer.",
      availableInStages: ["EXFIL_ACTIVE"],
      effects: { stageBlocker: true, scoreChange: 18, stealthChange: -25 },
    },
    {
      id: "engage_dlp_incident",
      label: "Engage DLP Incident Response",
      description: "Trigger the DLP incident response playbook. Logs full data inventory and begins chain-of-custody.",
      availableInStages: ["EXFIL_ACTIVE", "BREACH_CONFIRMED"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Breach Confirmed ────────────────────────────────────────────────────────
    {
      id: "file_hipaa_notification",
      label: "File HIPAA Breach Notification",
      description: "Submit mandatory HHS/OCR notification. Notify affected individuals. Required within 60 days.",
      availableInStages: ["BREACH_CONFIRMED"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "engage_forensics_firm",
      label: "Engage External Forensics Firm",
      description: "Retain a third-party forensics firm to establish full scope of breach and preserve court-ready evidence.",
      availableInStages: ["BREACH_CONFIRMED"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    {
      id: "suspend_employee",
      label: "Suspend and Escorted Removal",
      description: "Formally suspend Marcus Webb and conduct an escorted removal of building access.",
      availableInStages: ["BREACH_CONFIRMED"],
      effects: { stageBlocker: false, scoreChange: 6, stealthChange: 0 },
    },
    {
      id: "notify_patients",
      label: "Begin Patient Notification",
      description: "Draft and begin mailing breach notification letters to 340,447 affected patients.",
      availableInStages: ["BREACH_CONFIRMED"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
  ],
};
