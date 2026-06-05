import type { ScenarioDefinition } from "../types";

export const phishingRansomware: ScenarioDefinition = {
  slug: "phishing-to-ransomware",
  name: "Phishing to Ransomware",
  description:
    "A targeted phishing campaign against your organization escalates to full ransomware deployment. Detect early, contain fast — every minute counts.",
  industry: "Financial Services",
  difficulty: "MEDIUM",

  stages: [
    {
      id: "NORMAL",
      label: "Normal Operations",
      brief:
        "All systems nominal. Threat intelligence feeds report increased phishing activity targeting financial services firms in your region. Review your options.",
      threat: "LOW",
      autoAdvanceSec: 60,
      nextStage: "PHISHING_ACTIVE",
      evidence: [
        "[09:12] TI Feed: APT group CARBON SPIDER targeting financial sector with invoice lure emails",
        "[09:15] Email gateway: 3 suspicious emails quarantined from domain invoice-secure[.]net",
        "[09:18] SIEM: Low-confidence alert — unusual email volume to Finance department",
      ],
      pressures: [
        { id: "pr_normal_ceo", source: "CEO", message: "Heard there's a phishing warning going around. Keep me posted.", urgency: "LOW" },
      ],
      mitre: [
        { id: "T1595", name: "Active Scanning", tactic: "Reconnaissance" },
        { id: "T1589", name: "Gather Victim Identity Info", tactic: "Reconnaissance" },
      ],
    },
    {
      id: "PHISHING_ACTIVE",
      label: "Phishing Campaign Active",
      brief:
        "Phishing emails are hitting your employees. Multiple Finance staff received convincing invoice lure emails with macro-enabled attachments. One user has already opened a suspicious file.",
      threat: "MEDIUM",
      autoAdvanceSec: 90,
      nextStage: "INITIAL_COMPROMISE",
      evidence: [
        "[10:03] Email gateway: Malicious attachment received by 7 Finance users from invoice-secure[.]net",
        "[10:07] EDR: User opened 'Invoice_Q4_Final.xlsm' — macro execution attempted on WKSTN-FIN-04",
        "[10:09] SIEM: Alert — Office macro execution by finance user",
        "[10:11] Proxy: Connection attempt to invoice-secure[.]net from 192.168.1.45",
      ],
      pressures: [
        { id: "pr_phish_ceo", source: "CEO", message: "Three VPs just forwarded me suspicious invoice emails. What are we doing about this?", urgency: "MEDIUM" },
        { id: "pr_phish_legal", source: "LEGAL", message: "If any client data was targeted we may have notification obligations. Please advise.", urgency: "MEDIUM" },
      ],
      mitre: [
        { id: "T1566.001", name: "Spearphishing Attachment", tactic: "Initial Access" },
        { id: "T1204.002", name: "Malicious File", tactic: "Execution" },
      ],
    },
    {
      id: "INITIAL_COMPROMISE",
      label: "Initial Compromise",
      brief:
        "A Finance workstation (192.168.1.45) has been compromised. A PowerShell reverse shell is active connecting to attacker C2 at 198.51.100.42:4444. The attacker has a foothold.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "LATERAL_MOVEMENT",
      evidence: [
        "[10:14] EDR: PowerShell spawned by WINWORD.EXE — base64-encoded command on WKSTN-FIN-04",
        "[10:14] Network: Outbound connection to 198.51.100.42:4444 established",
        "[10:16] EDR: Reverse shell active. LSASS memory accessed by powershell.exe",
        "[10:18] SIEM: HIGH — C2 beacon pattern, 5-min DNS queries to ms-update[.]net",
        "[10:20] EDR: Credential dump in progress on WKSTN-FIN-04",
      ],
      pressures: [
        { id: "pr_comp_legal", source: "LEGAL", message: "We need to know immediately if any client financial data was accessed. SEC disclosure may apply.", urgency: "HIGH" },
        { id: "pr_comp_cfо", source: "CFO", message: "Finance systems are slow — is this related to the phishing alert? Payroll runs tonight.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1059.001", name: "PowerShell", tactic: "Execution" },
        { id: "T1003.001", name: "LSASS Memory", tactic: "Credential Access" },
        { id: "T1071.001", name: "Web Protocols C2", tactic: "Command and Control" },
      ],
    },
    {
      id: "LATERAL_MOVEMENT",
      label: "Lateral Movement",
      brief:
        "The attacker is pivoting through the network using stolen credentials. Three additional hosts compromised. They are moving toward the domain controller. VPN admin credentials used externally.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "DOMAIN_COMPROMISE",
      evidence: [
        "[10:31] EDR: PsExec execution detected on WKSTN-IT-01, WKSTN-IT-03, SRV-FILE-01",
        "[10:33] AD: Account used from 3 different hosts within 4 minutes",
        "[10:35] Network: SMB lateral movement 192.168.1.45 → 192.168.1.10-15",
        "[10:38] VPN: Admin credentials used from external IP 185.234.219.4",
        "[10:40] SIEM: CRITICAL — Kerberoasting attack against AD service accounts",
      ],
      pressures: [
        { id: "pr_lat_ceo", source: "CEO", message: "I can't log into my laptop. Three other execs are locked out too. What is happening?", urgency: "HIGH" },
        { id: "pr_lat_hr", source: "HR", message: "Staff are getting panic messages in Teams. Should we issue internal comms?", urgency: "MEDIUM" },
      ],
      mitre: [
        { id: "T1021.002", name: "SMB/Windows Admin Shares", tactic: "Lateral Movement" },
        { id: "T1550.002", name: "Pass the Hash", tactic: "Lateral Movement" },
        { id: "T1558.003", name: "Kerberoasting", tactic: "Credential Access" },
      ],
    },
    {
      id: "DOMAIN_COMPROMISE",
      label: "Domain Controller Compromised",
      brief:
        "DC01 has been compromised. The attacker has Domain Admin privileges. Shadow copies deleted. Persistence established via registry Run key. Staging for exfiltration is underway.",
      threat: "CRITICAL",
      autoAdvanceSec: 75,
      nextStage: "DATA_EXFILTRATION",
      evidence: [
        "[10:47] EDR: DCSync attack — credentials extracted for 340 domain accounts",
        "[10:48] AD: New admin account 'svc-backup-admin' created by DA account",
        "[10:50] Registry: HKCU\\Run key — 'WindowsUpdate.exe' persistence added",
        "[10:52] EDR: vssadmin delete shadows /all executed on DC01",
        "[10:54] SIEM: CRITICAL — Domain Admin escalation confirmed",
      ],
      pressures: [
        { id: "pr_dc_ceo", source: "CEO", message: "Half the company can't authenticate. Operations are halting. I need answers NOW.", urgency: "CRITICAL" },
        { id: "pr_dc_pr", source: "PR", message: "Financial press is calling. We have no statement. Do you authorize a holding statement?", urgency: "HIGH" },
        { id: "pr_dc_regulator", source: "REGULATOR", message: "We have received anomaly reports from your sector. Formal response required within 24 hours.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1003.006", name: "DCSync", tactic: "Credential Access" },
        { id: "T1136.002", name: "Create Domain Account", tactic: "Persistence" },
        { id: "T1490", name: "Inhibit System Recovery", tactic: "Impact" },
      ],
    },
    {
      id: "DATA_EXFILTRATION",
      label: "Data Exfiltration Underway",
      pressures: [
        { id: "pr_exfil_legal", source: "LEGAL", message: "47GB is a GDPR/SEC reportable event. Clock starts when you confirm. Have you confirmed?", urgency: "CRITICAL" },
        { id: "pr_exfil_cfo", source: "CFO", message: "Client data is in that archive. Our biggest accounts will pull contracts if this leaks.", urgency: "CRITICAL" },
      ],
      mitre: [
        { id: "T1567", name: "Exfiltration Over Web Service", tactic: "Exfiltration" },
        { id: "T1074.001", name: "Local Data Staging", tactic: "Collection" },
      ],
      brief:
        "47GB of sensitive financial data is being staged and transferred to external infrastructure. Payroll records, client data, and proprietary documents included. Tor browser installed on endpoints.",
      threat: "CRITICAL",
      autoAdvanceSec: 60,
      nextStage: "RANSOMWARE_DEPLOYED",
      evidence: [
        "[11:02] DLP: 47GB archive staged on SRV-FILE-01 — payroll, client data, IP docs",
        "[11:05] Network: Large outbound transfer to 45.142.212.100 — 40GB in 8 minutes",
        "[11:08] Proxy: Tor Browser installed on 12 endpoints",
        "[11:10] Email: Encrypted channel communication to external alias observed",
        "[11:12] SIEM: CRITICAL — Bulk data exfiltration confirmed",
      ],
    },
    {
      id: "RANSOMWARE_DEPLOYED",
      label: "Ransomware Deployed",
      brief:
        "Ransomware detonated across 847 endpoints. All financial systems encrypted. Ransom note demands $2.4M BTC within 72 hours. Backup infrastructure also compromised. Business continuity at risk.",
      threat: "CRITICAL",
      autoAdvanceSec: 0,
      nextStage: null,
      breachOnAutoAdvance: true,
      mitre: [
        { id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact" },
        { id: "T1491.001", name: "Internal Defacement", tactic: "Impact" },
      ],
      evidence: [
        "[11:18] EDR: RANSOMWARE DETECTED — .sage_enc extension on 847 endpoints",
        "[11:19] File: README_DECRYPT.txt on all desktops — $2.4M BTC / 72hrs",
        "[11:20] Operations: ERP offline, trading platform down, Exchange encrypted",
        "[11:22] Executive: CFO reports all financial systems locked",
        "[11:24] Legal: Regulatory notification obligations triggered (GDPR / SEC)",
      ],
    },
  ],

  actions: [
    // ── Proactive (NORMAL) ───────────────────────────────────────────────────
    {
      id: "block_email_domains",
      label: "Block Malicious Email Domains",
      description: "Block invoice-secure[.]net and lookalike domains at the email gateway.",
      availableInStages: ["NORMAL", "PHISHING_ACTIVE"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: -10 },
    },
    {
      id: "phishing_training",
      label: "Deploy Emergency Phishing Drill",
      description: "Send instant phishing awareness drill to identify at-risk employees.",
      availableInStages: ["NORMAL", "PHISHING_ACTIVE"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Phishing Active ───────────────────────────────────────────────────────
    {
      id: "brief_employees",
      label: "Brief All Employees",
      description: "Send company-wide alert about the active phishing campaign. Stops the attack from advancing.",
      availableInStages: ["PHISHING_ACTIVE"],
      effects: { stageBlocker: true, scoreChange: 20, stealthChange: -5 },
    },
    // ── Initial Compromise ────────────────────────────────────────────────────
    {
      id: "isolate_endpoint",
      label: "Isolate Compromised Endpoint",
      description: "Network-isolate WKSTN-FIN-04 via EDR. Cuts the reverse shell and stops lateral movement.",
      availableInStages: ["INITIAL_COMPROMISE", "LATERAL_MOVEMENT"],
      effects: { stageBlocker: true, scoreChange: 25, stealthChange: -15 },
      consequences: [
        { system: "WKSTN-FIN-04", status: "OFFLINE", reason: "Network-isolated via EDR — Finance user offline" },
      ],
    },
    {
      id: "investigate_machine",
      label: "Pull Forensic Memory Dump",
      description: "Capture memory and process tree from the compromised host. Reveals full attacker TTP chain.",
      availableInStages: ["INITIAL_COMPROMISE"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: -5 },
    },
    {
      id: "monitor_silently",
      label: "Monitor Silently",
      description: "Observe attacker behavior without alerting them. Intelligence gain — but the attack continues.",
      availableInStages: ["INITIAL_COMPROMISE"],
      effects: { stageBlocker: false, scoreChange: 5, stealthChange: 15 },
    },
    {
      id: "notify_ir",
      label: "Activate Incident Response Team",
      description: "Formally engage the IR team. Coordinates response and preserves chain-of-custody.",
      availableInStages: ["INITIAL_COMPROMISE", "LATERAL_MOVEMENT", "DOMAIN_COMPROMISE"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: -5 },
    },
    // ── Lateral Movement ─────────────────────────────────────────────────────
    {
      id: "disable_vpn",
      label: "Revoke All VPN Sessions",
      description: "Kill all active VPN sessions and require re-auth. Cuts attacker's external access path.",
      availableInStages: ["LATERAL_MOVEMENT", "DOMAIN_COMPROMISE"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: -10 },
      consequences: [
        { system: "VPN Gateway", status: "OFFLINE", reason: "All sessions terminated — remote workers disconnected" },
      ],
    },
    {
      id: "segment_network",
      label: "Emergency Network Segmentation",
      description: "Isolate the Finance VLAN. Stops lateral movement propagation across the network.",
      availableInStages: ["LATERAL_MOVEMENT"],
      effects: { stageBlocker: true, scoreChange: 22, stealthChange: -20 },
      consequences: [
        { system: "Finance VLAN", status: "DEGRADED", reason: "Isolated from corporate network — payroll systems unreachable" },
      ],
    },
    {
      id: "reset_credentials",
      label: "Force Domain-Wide Credential Reset",
      description: "Reset all privileged account passwords. Invalidates stolen credentials immediately.",
      availableInStages: ["LATERAL_MOVEMENT", "DOMAIN_COMPROMISE"],
      effects: { stageBlocker: true, scoreChange: 22, stealthChange: -15 },
    },
    // ── Domain Compromise ─────────────────────────────────────────────────────
    {
      id: "take_dc_offline",
      label: "Take Domain Controller Offline",
      description: "Emergency shutdown of DC01. Stops all domain-authenticated movement — major business impact.",
      availableInStages: ["DOMAIN_COMPROMISE", "DATA_EXFILTRATION"],
      effects: { stageBlocker: true, scoreChange: 15, stealthChange: -30 },
      consequences: [
        { system: "Active Directory", status: "OFFLINE", reason: "DC01 shut down — all domain auth failing" },
        { system: "VPN Gateway", status: "DEGRADED", reason: "Kerberos authentication unavailable" },
        { system: "Exchange Server", status: "DEGRADED", reason: "AD dependency broken — email auth failing" },
      ],
    },
    {
      id: "preserve_forensics",
      label: "Snapshot Systems for Forensics",
      description: "Preserve disk images of all affected systems before remediation alters evidence.",
      availableInStages: ["DOMAIN_COMPROMISE", "DATA_EXFILTRATION"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Data Exfiltration ─────────────────────────────────────────────────────
    {
      id: "block_egress",
      label: "Block All Outbound Traffic",
      description: "Emergency egress block on affected VLANs. Stops data leaving the network.",
      availableInStages: ["DATA_EXFILTRATION"],
      effects: { stageBlocker: true, scoreChange: 18, stealthChange: -25 },
      consequences: [
        { system: "Internet Access", status: "OFFLINE", reason: "Egress blocked — all outbound traffic halted" },
        { system: "Bloomberg Terminal", status: "OFFLINE", reason: "External feeds severed — trading desk offline" },
      ],
    },
    {
      id: "notify_legal",
      label: "Notify Legal & Compliance",
      description: "Engage legal counsel and begin mandatory regulatory notification process.",
      availableInStages: ["DATA_EXFILTRATION", "RANSOMWARE_DEPLOYED"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Ransomware Aftermath ──────────────────────────────────────────────────
    {
      id: "restore_from_backup",
      label: "Initiate Backup Restoration",
      description: "Begin restore from last clean backup. Estimated 48+ hours. Do not pay the ransom.",
      availableInStages: ["RANSOMWARE_DEPLOYED"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: 0 },
    },
    {
      id: "notify_regulators",
      label: "File Regulatory Breach Notification",
      description: "Submit mandatory notifications to GDPR / SEC regulators within required timeframe.",
      availableInStages: ["RANSOMWARE_DEPLOYED"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    {
      id: "engage_law_enforcement",
      label: "Engage FBI / CISA",
      description: "Report to FBI IC3 and CISA. Access threat intelligence sharing and potential decryption keys.",
      availableInStages: ["RANSOMWARE_DEPLOYED"],
      effects: { stageBlocker: false, scoreChange: 6, stealthChange: 0 },
    },
    {
      id: "pay_ransom",
      label: "Authorize Ransom Payment",
      description: "Pay $2.4M BTC. No guarantee of decryption. Funds future attacks. Legal risk in some jurisdictions.",
      availableInStages: ["RANSOMWARE_DEPLOYED"],
      effects: { stageBlocker: false, scoreChange: -15, stealthChange: 0 },
    },
  ],
};
