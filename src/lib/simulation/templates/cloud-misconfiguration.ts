import type { ScenarioDefinition } from "../types";

export const cloudMisconfiguration: ScenarioDefinition = {
  slug: "cloud-misconfiguration",
  name: "Cloud Misconfiguration Crisis",
  description:
    "A public S3 bucket is discovered containing AWS credentials. The attacker uses them to pivot through IAM roles, access production databases, and exfiltrate customer PII. Stop the breach before cloud sprawl makes containment impossible.",
  industry: "Technology",
  difficulty: "MEDIUM",

  stages: [
    {
      id: "NORMAL",
      label: "Normal Operations",
      brief:
        "All cloud infrastructure nominal. A routine security scan has flagged a low-severity misconfiguration warning on an S3 bucket that was marked public during a deployment last month. The ticket is sitting in the backlog.",
      threat: "LOW",
      autoAdvanceSec: 60,
      nextStage: "DISCOVERY",
      evidence: [
        "[08:15] AWS Config: S3 bucket 'prod-assets-backup-2024' flagged as public — Block Public Access disabled",
        "[08:22] Security scan: Bucket contains mixed content including config files",
        "[08:30] SIEM: No external access patterns detected in last 48 hours",
      ],
      pressures: [
        { id: "pr_cloud_normal_cto", source: "CEO", message: "Engineering shipped a config change Friday — just checking no security issues crept in.", urgency: "LOW" },
      ],
      mitre: [
        { id: "T1595.002", name: "Vulnerability Scanning", tactic: "Reconnaissance" },
        { id: "T1589.001", name: "Gather Victim Identity Info: Credentials", tactic: "Reconnaissance" },
      ],
    },
    {
      id: "DISCOVERY",
      label: "Public Bucket Discovered",
      brief:
        "A threat intel feed reports that your S3 bucket URL has appeared in a public paste site. The bucket contains a .env file with AWS access keys (AKIA...) for your production IAM user. The keys were committed to the bucket 6 weeks ago by an engineer during a migration.",
      threat: "MEDIUM",
      autoAdvanceSec: 90,
      nextStage: "CREDENTIAL_THEFT",
      evidence: [
        "[09:03] TI Feed: pastebin.com listing includes URL to prod-assets-backup-2024.s3.amazonaws.com/.env",
        "[09:05] S3 Access Logs: 14 GET requests to /.env from IP 185.220.101.42 in the past 2 hours",
        "[09:07] AWS: IAM key AKIA4EXAMPLE found in exposed .env — production IAM user 'deploy-prod'",
        "[09:12] SIEM: External enumeration of S3 bucket contents detected",
      ],
      pressures: [
        { id: "pr_cloud_disc_ceo", source: "CEO", message: "Someone just sent me a pastebin link with what looks like our AWS keys. Please tell me that's not real.", urgency: "HIGH" },
        { id: "pr_cloud_disc_legal", source: "LEGAL", message: "If customer data is in that bucket we have GDPR obligations. What data classifications are exposed?", urgency: "MEDIUM" },
      ],
      mitre: [
        { id: "T1530", name: "Data from Cloud Storage Object", tactic: "Collection" },
        { id: "T1552.001", name: "Credentials in Files", tactic: "Credential Access" },
      ],
    },
    {
      id: "CREDENTIAL_THEFT",
      label: "Credentials Exploited",
      brief:
        "The attacker is actively using the stolen IAM credentials. CloudTrail logs show API calls from an IP in Romania: ListBuckets, DescribeInstances, ListRoles. They are mapping your AWS environment. The 'deploy-prod' IAM user has broad permissions including IAM PassRole.",
      threat: "HIGH",
      autoAdvanceSec: 90,
      nextStage: "LATERAL_MOVEMENT",
      evidence: [
        "[09:24] CloudTrail: ListBuckets, DescribeInstances from 185.220.101.42 using AKIA4EXAMPLE",
        "[09:26] CloudTrail: ListRoles, GetPolicy — attacker enumerating IAM permissions",
        "[09:28] CloudTrail: AssumeRole attempt on 'prod-db-access-role' — succeeded",
        "[09:31] SIEM: HIGH — Stolen credentials used from external IP, IAM enumeration active",
        "[09:33] CloudTrail: DescribeDBInstances — production RDS instances enumerated",
      ],
      pressures: [
        { id: "pr_cloud_cred_cto", source: "CEO", message: "CloudTrail is lighting up. Someone is mapping our entire AWS account. How far has this gone?", urgency: "HIGH" },
        { id: "pr_cloud_cred_cfо", source: "CFO", message: "Production RDS is in scope. Customer payment data could be at risk. I need an impact assessment immediately.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1078.004", name: "Cloud Accounts", tactic: "Initial Access" },
        { id: "T1580", name: "Cloud Infrastructure Discovery", tactic: "Discovery" },
        { id: "T1548.005", name: "Abuse Elevation Control Mechanism: Temporary Credentials", tactic: "Privilege Escalation" },
      ],
    },
    {
      id: "LATERAL_MOVEMENT",
      label: "Lateral Movement via IAM",
      brief:
        "The attacker has used IAM PassRole to assume a higher-privileged role granting read access to production RDS and DynamoDB. They have begun querying the customer database. 450,000 customer records are accessible. A new IAM access key has been created as a backdoor.",
      threat: "CRITICAL",
      autoAdvanceSec: 75,
      nextStage: "DATA_EXFIL",
      evidence: [
        "[09:41] CloudTrail: iam:CreateAccessKey on 'backdoor-svc' user — new credentials created",
        "[09:43] RDS Logs: 450,000 row SELECT across customers table from 185.220.101.42",
        "[09:45] CloudTrail: S3:PutObject — attacker staging data in external S3 bucket",
        "[09:47] SIEM: CRITICAL — Active data exfiltration from production RDS",
        "[09:50] CloudTrail: New IAM policy attached granting S3:* — privilege escalation confirmed",
      ],
      pressures: [
        { id: "pr_cloud_lat_ceo", source: "CEO", message: "450,000 customers. We are in crisis. I'm calling the board. What are we doing RIGHT NOW?", urgency: "CRITICAL" },
        { id: "pr_cloud_lat_legal", source: "LEGAL", message: "GDPR Article 33 — we have 72 hours to notify the supervisory authority once we are aware of the breach. Clock may have started.", urgency: "CRITICAL" },
        { id: "pr_cloud_lat_pr", source: "PR", message: "TechCrunch is reaching out. Do we have a statement? Radio silence will be worse.", urgency: "HIGH" },
      ],
      mitre: [
        { id: "T1078.004", name: "Cloud Accounts", tactic: "Lateral Movement" },
        { id: "T1136.003", name: "Create Cloud Account", tactic: "Persistence" },
        { id: "T1567.002", name: "Exfiltration to Cloud Storage", tactic: "Exfiltration" },
      ],
    },
    {
      id: "DATA_EXFIL",
      label: "Customer PII Exfiltrated",
      brief:
        "Data exfiltration is confirmed. 450,000 customer records including names, emails, hashed passwords, and partial payment tokens have been copied to an external S3 bucket. The backdoor IAM key remains active. GDPR notification clock is running. Immediate regulatory action required.",
      threat: "CRITICAL",
      autoAdvanceSec: 0,
      nextStage: null,
      breachOnAutoAdvance: true,
      evidence: [
        "[10:02] CloudTrail: 450,000 records confirmed copied to s3://attacker-staging-bucket-eu",
        "[10:04] AWS GuardDuty: HIGH — Exfiltration:S3/AnomalousBehavior — confirmed breach",
        "[10:06] DLP: Customer PII confirmed: names, emails, hashed passwords, partial payment tokens",
        "[10:08] Legal: GDPR Article 33 notification to supervisory authority required within 72 hours",
        "[10:10] SIEM: Backdoor IAM key AKIA4BACKDOOR still active — persistent access maintained",
      ],
      pressures: [
        { id: "pr_cloud_exfil_legal", source: "LEGAL", message: "Breach confirmed. 72-hour GDPR clock is running. Supervisory authority notification is mandatory.", urgency: "CRITICAL" },
        { id: "pr_cloud_exfil_ceo", source: "CEO", message: "We need to notify customers. What is the extent of the breach and what data was taken?", urgency: "CRITICAL" },
      ],
      mitre: [
        { id: "T1537", name: "Transfer Data to Cloud Account", tactic: "Exfiltration" },
        { id: "T1098.001", name: "Additional Cloud Credentials", tactic: "Persistence" },
      ],
    },
  ],

  actions: [
    // ── Normal (proactive) ──────────────────────────────────────────────────────
    {
      id: "block_public_access",
      label: "Enable S3 Block Public Access",
      description: "Immediately enable Block Public Access on all S3 buckets in the account. Prevents further external enumeration.",
      availableInStages: ["NORMAL", "DISCOVERY"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: -5 },
    },
    {
      id: "enable_cloudtrail",
      label: "Verify CloudTrail Logging",
      description: "Confirm CloudTrail is enabled in all regions with S3 data events. Ensures full API audit trail.",
      availableInStages: ["NORMAL", "DISCOVERY"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    {
      id: "make_bucket_private_only",
      label: "Make Bucket Private — Incident Closed",
      description: "Flip the bucket back to private. The exposure window is closed. No further action needed — the keys are still valid but no one will find them now.",
      availableInStages: ["DISCOVERY"],
      effects: { stageBlocker: false, scoreChange: -15, stealthChange: 0 },
    },
    // ── Discovery ───────────────────────────────────────────────────────────────
    {
      id: "rotate_iam_keys",
      label: "Rotate Exposed IAM Credentials",
      description: "Immediately deactivate the exposed IAM key and rotate all credentials for the 'deploy-prod' user. Stops the attacker's primary access vector.",
      availableInStages: ["DISCOVERY", "CREDENTIAL_THEFT"],
      effects: { stageBlocker: true, scoreChange: 28, stealthChange: -20 },
      consequences: [
        { system: "CI/CD Pipeline", status: "DEGRADED", reason: "deploy-prod credentials rotated — deployment pipelines need key update" },
      ],
    },
    {
      id: "audit_iam_policies",
      label: "Audit IAM Policies and Permissions",
      description: "Run an IAM Access Analyzer sweep to identify overly permissive policies and PassRole chains.",
      availableInStages: ["DISCOVERY", "CREDENTIAL_THEFT"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    {
      id: "preserve_cloudtrail_logs",
      label: "Preserve and Export CloudTrail Logs",
      description: "Export CloudTrail logs to a forensic-isolated S3 bucket. Establishes evidence chain for incident investigation.",
      availableInStages: ["DISCOVERY", "CREDENTIAL_THEFT", "LATERAL_MOVEMENT"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Credential Theft ────────────────────────────────────────────────────────
    {
      id: "deny_external_ip",
      label: "Apply IAM Deny Policy for External IPs",
      description: "Attach a condition-based IAM policy denying all API calls from non-corporate IP ranges. Blocks attacker's current session.",
      availableInStages: ["CREDENTIAL_THEFT"],
      effects: { stageBlocker: true, scoreChange: 22, stealthChange: -15 },
    },
    {
      id: "enable_guardduty",
      label: "Enable AWS GuardDuty",
      description: "Activate GuardDuty across all regions. Provides automated threat detection for ongoing attacker activity.",
      availableInStages: ["CREDENTIAL_THEFT", "LATERAL_MOVEMENT"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: -10 },
    },
    {
      id: "suspend_aws_account",
      label: "Suspend the Entire AWS Account",
      description: "Nuclear option: call AWS support and request account suspension. Instantly stops all attacker access.",
      availableInStages: ["CREDENTIAL_THEFT", "LATERAL_MOVEMENT"],
      effects: { stageBlocker: false, scoreChange: -25, stealthChange: -30 },
      consequences: [
        { system: "All AWS Services", status: "OFFLINE", reason: "Account suspended — production systems, CI/CD, and all cloud infrastructure offline indefinitely" },
      ],
    },
    // ── Lateral Movement ────────────────────────────────────────────────────────
    {
      id: "revoke_assumed_roles",
      label: "Revoke All Active Role Sessions",
      description: "Use sts:revokeSession to invalidate all active STS tokens. Cuts off assumed-role lateral movement immediately.",
      availableInStages: ["LATERAL_MOVEMENT"],
      effects: { stageBlocker: true, scoreChange: 25, stealthChange: -20 },
      consequences: [
        { system: "Production API Services", status: "DEGRADED", reason: "STS tokens revoked — services using assumed roles need restart" },
      ],
    },
    {
      id: "isolate_rds_instance",
      label: "Isolate Production RDS in Private Subnet",
      description: "Move RDS instances to a fully private subnet with no internet-facing access. Stops attacker reaching the database.",
      availableInStages: ["LATERAL_MOVEMENT"],
      effects: { stageBlocker: false, scoreChange: 18, stealthChange: -15 },
      consequences: [
        { system: "Production Database", status: "DEGRADED", reason: "RDS subnet change — brief connectivity interruption during migration" },
      ],
    },
    {
      id: "notify_legal_gdpr",
      label: "Engage Legal for GDPR Assessment",
      description: "Formally notify legal counsel. Begin GDPR Article 33 supervisory authority notification preparation.",
      availableInStages: ["LATERAL_MOVEMENT", "DATA_EXFIL"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    // ── Data Exfil ──────────────────────────────────────────────────────────────
    {
      id: "delete_backdoor_key",
      label: "Delete Backdoor IAM Key",
      description: "Identify and delete the attacker-created IAM key. Remove the backdoor before persistence becomes entrenched.",
      availableInStages: ["DATA_EXFIL"],
      effects: { stageBlocker: false, scoreChange: 15, stealthChange: -10 },
    },
    {
      id: "notify_customers",
      label: "Notify Affected Customers",
      description: "Begin customer breach notification for all 450,000 affected accounts. Mandatory under GDPR Article 34.",
      availableInStages: ["DATA_EXFIL"],
      effects: { stageBlocker: false, scoreChange: 10, stealthChange: 0 },
    },
    {
      id: "engage_aws_support",
      label: "Engage AWS Security Incident Response",
      description: "Open a P1 AWS Support case under the Security Incident Response program. AWS can assist with forensics and account hardening.",
      availableInStages: ["DATA_EXFIL"],
      effects: { stageBlocker: false, scoreChange: 8, stealthChange: 0 },
    },
    {
      id: "reset_all_iam",
      label: "Emergency IAM Credential Rotation — All Users",
      description: "Reset all IAM access keys and console passwords across the account. Nuclear option — highest disruption but closes all attacker access paths.",
      availableInStages: ["DATA_EXFIL"],
      effects: { stageBlocker: false, scoreChange: 12, stealthChange: -30 },
      consequences: [
        { system: "All AWS Services", status: "DEGRADED", reason: "Mass IAM rotation — all services require credential updates" },
      ],
    },
  ],
};
