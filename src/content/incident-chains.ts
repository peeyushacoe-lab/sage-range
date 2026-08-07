/**
 * Attack chains for incident simulations.
 *
 * Ten authored chains, paired in incident-catalogue.ts against company
 * environments to produce the full catalogue. The pairing is deliberate rather
 * than random: a ransomware chain reads differently in a hospital than in a
 * retailer, and the tasks reference sector-specific detail.
 *
 * The first hard rule, learned from the hunt datasets: every task answer must
 * appear literally in one of that incident's artifacts. A question whose answer
 * cannot be found is unsolvable however plausible it reads, and
 * __tests__/incident-chains.test.ts enforces it for every chain.
 *
 * The second, learned the embarrassing way: no two incidents built from the
 * same chain may share an answer key. Five companies pair with the ransomware
 * chain, and while its indicators were constants, solving one solved all five.
 * Every arbitrary value now comes from incident-indicators.ts, derived per
 * (chain, company); the catalogue test asserts the answer keys stay distinct.
 */

import {
  adIndicators,
  becIndicators,
  cloudIndicators,
  commas,
  ddosIndicators,
  insiderIndicators,
  otIndicators,
  ransomwareIndicators,
  stuffingIndicators,
  supplyIndicators,
  webshellIndicators,
  type ChainContext,
} from "./incident-indicators";

export type { ChainContext };

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
    artifacts: (c) => {
      const i = ransomwareIndicators(c);
      return [
        {
          type: "EMAIL",
          title: `Delivery email — ${i.invoiceFile}`,
          tactic: "INITIAL_ACCESS",
          content: `From: accounts@${i.senderDomain}
To: ${c.user}@${c.domain}
Subject: Outstanding invoice ${i.invoiceRef} — action required
Attachment: ${i.invoiceFile} (84 KB)

Received: from vps-88214.hosting-eu.net (${i.c2Ip})
Authentication-Results: spf=fail dkim=none dmarc=fail

Please find attached the overdue invoice. Enable editing to view.`,
        },
        {
          type: "SYSMON_LOG",
          title: "Sysmon — process creation chain",
          tactic: "INITIAL_ACCESS",
          content: `EventID 1  08:43:12  ${c.host}  User=${c.user}
  Image=C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE
  CommandLine="WINWORD.EXE" /n "C:\\Users\\${c.user}\\Downloads\\${i.invoiceFile}"

EventID 1  08:44:02  ${c.host}  User=${c.user}
  ParentImage=...\\WINWORD.EXE
  Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  CommandLine=powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBq

EventID 3  08:44:31  ${c.host}
  DestinationIp=${i.c2Ip}  DestinationHostname=${i.c2Domain}  Port=443

EventID 11 08:45:02  ${c.host}
  TargetFilename=C:\\Users\\${c.user}\\AppData\\Local\\Temp\\${i.droppedBinary}`,
        },
        {
          type: "EVENT_LOG",
          title: "Security log — privilege use and spread",
          tactic: "PRIVILEGE_ESCALATION",
          content: `4624  09:12:44  Logon Type 3  Account=${i.serviceAccount}  Source=${c.host}
4672  09:12:44  Special privileges assigned: SeDebugPrivilege
4688  09:14:10  Process=vssadmin.exe  CommandLine=vssadmin delete shadows /all /quiet
4688  09:14:52  Process=schtasks.exe  CommandLine=schtasks /create /tn "${i.schedTask}" /sc onlogon
7045  09:15:30  Service installed: ${i.serviceName}`,
        },
        {
          type: "PCAP_SUMMARY",
          title: "Egress summary — 48 hours before encryption",
          tactic: "EXFILTRATION",
          content: `Destination            Port  Sessions  Bytes out     First seen
${i.c2Ip.padEnd(23)}443   ${i.exfilSessions.padEnd(10)}${i.exfilBytes.padEnd(14)}two nights before
update.microsoft.com   443   88        1,204,000     ongoing
${c.domain.padEnd(23)}443   2,140     44,000,000    ongoing

Total to ${i.c2Ip}: ${i.exfilMb} MB over ${i.exfilHours} hours, evenly chunked.`,
        },
        {
          type: "FILE_LISTING",
          title: "Ransom note and encrypted files",
          tactic: "IMPACT",
          content: `${i.ransomNote} present in ${i.noteDirs} directories
Encrypted extension: .${i.ransomExt}
First encrypted file timestamp: 09:21:07
Shadow copies: absent (deleted 09:14:10)`,
        },
      ];
    },
    tasks: (c) => {
      const i = ransomwareIndicators(c);
      return [
        {
          title: "Initial access",
          prompt: "Which file delivered the initial payload? Give the filename exactly.",
          answerType: "FREE_TEXT",
          correctAnswer: i.invoiceFile,
          points: 200,
        },
        {
          title: "Command and control",
          prompt: "Give the domain the compromised host contacted for command and control.",
          answerType: "FREE_TEXT",
          correctAnswer: i.c2Domain,
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
          correctAnswer: i.schedTask,
          points: 250,
        },
        {
          title: "Was data exfiltrated?",
          prompt:
            "From the egress summary, did data leave before encryption — making this a notifiable breach as well as an availability incident?",
          answerType: "RADIO",
          correctAnswer: `Yes — ${i.exfilMb} MB left to the C2 host over ${i.exfilHours} hours before encryption`,
          options: [
            "No — encryption only, no evidence of exfiltration",
            `Yes — ${i.exfilMb} MB left to the C2 host over ${i.exfilHours} hours before encryption`,
            "Cannot be determined from the available evidence",
            "Yes, but only to update.microsoft.com",
          ],
          points: 450,
        },
      ];
    },
  },

  // ── Business email compromise ────────────────────────────────────────────
  {
    key: "bec",
    name: "Business Email Compromise",
    difficulty: "MEDIUM",
    minutes: 120,
    points: 900,
    briefing: (c) => {
      const i = becIndicators(c);
      return `Finance nearly paid ${i.amountText} to a bank account that changed at the last minute. A senior mailbox appears to have been accessed by someone other than its owner. Determine whether it was genuinely compromised, what was done while inside, and what containment actually requires.`;
    },
    artifacts: (c) => {
      const i = becIndicators(c);
      return [
        {
          type: "EVENT_LOG",
          title: "Sign-in log — mailbox access",
          tactic: "INITIAL_ACCESS",
          content: `UTC       User       IP                Location    Result   MFA
07:14:02  ${c.user}  ${i.attackerIp}   ${i.remoteCity}   Success  Not challenged (legacy auth)
07:14:40  ${c.user}  ${i.attackerIp}   ${i.remoteCity}   Success  Not challenged
09:02:11  ${c.user}  ${i.localIp}        ${i.localCity}   Success  Satisfied
09:40:55  ${c.user}  ${i.attackerIp}   ${i.remoteCity}   Success  Not challenged

Protocol used by the ${i.remoteCity.split(",")[0]} sessions: ${i.legacyProtocol} (legacy)`,
        },
        {
          type: "EVENT_LOG",
          title: "Mailbox audit — rules and forwarding",
          tactic: "PERSISTENCE",
          content: `07:16:20  New-InboxRule  Name="."  MoveToFolder=${i.ruleFolder}
          Conditions: SubjectOrBodyContains = "invoice","remittance","bank"
          MarkAsRead = true
07:16:44  Set-Mailbox  ForwardingSmtpAddress=${i.fwdLocalPart}@${i.fwdDomain}
          DeliverToMailboxAndForward = true`,
        },
        {
          type: "EMAIL",
          title: "Fraudulent remittance request",
          tactic: "IMPACT",
          content: `From: "${c.user}" <${c.user}@${c.domain}>
Reply-To: ${i.fwdLocalPart}@${i.fwdDomain}
To: payments@${c.domain}
Subject: RE: Invoice ${i.invoiceRef} — updated bank details

Please note our account has changed. Remit ${i.amountText} to:
  Sort code ${i.sortCode}  Account ${i.accountNo}`,
        },
        {
          type: "TIMELINE",
          title: "Consolidated timeline",
          content: `07:14  First access from ${i.attackerIp} via legacy ${i.legacyProtocol}, no MFA challenge
07:16  Inbox rule created hiding invoice-related mail
07:16  External forwarding configured
09:40  Fraudulent remittance email sent from the mailbox
11:20  Finance queries the change by phone — payment stopped`,
        },
      ];
    },
    tasks: (c) => {
      const i = becIndicators(c);
      return [
        {
          title: "Why MFA did not stop this",
          prompt: "Which protocol did the attacker use to avoid the MFA challenge?",
          answerType: "FREE_TEXT",
          correctAnswer: i.legacyProtocol,
          points: 200,
        },
        {
          title: "Evasion",
          prompt:
            "Where did the inbox rule move invoice-related mail, so the real user would not see replies?",
          answerType: "FREE_TEXT",
          correctAnswer: i.ruleFolder,
          points: 200,
        },
        {
          title: "Persistence",
          prompt: "Give the external address configured for mailbox forwarding.",
          answerType: "FREE_TEXT",
          correctAnswer: `${i.fwdLocalPart}@${i.fwdDomain}`,
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
      ];
    },
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
    artifacts: (c) => {
      const i = webshellIndicators(c);
      return [
        {
          type: "EVENT_LOG",
          title: "Web access log — recon and upload",
          tactic: "INITIAL_ACCESS",
          content: `${i.attackerIp} - - [${i.date}:04:11:02] "GET /admin HTTP/1.1" 404 512 "curl/8.4.0"
${i.attackerIp} - - [${i.date}:04:11:04] "GET /.git/config HTTP/1.1" 404 512 "curl/8.4.0"
${i.attackerIp} - - [${i.date}:04:11:09] "GET /uploads/ HTTP/1.1" 200 1841 "curl/8.4.0"
${i.attackerIp} - - [${i.date}:04:13:20] "POST ${i.uploadEndpoint} HTTP/1.1" 200 18244 "curl/8.4.0"
${i.attackerIp} - - [${i.date}:04:15:01] "POST /uploads/${i.shellFile} HTTP/1.1" 200 3120 "curl/8.4.0"
${i.attackerIp} - - [${i.date}:04:18:44] "POST /uploads/${i.shellFile} HTTP/1.1" 200 88400 "curl/8.4.0"`,
        },
        {
          type: "FILE_LISTING",
          title: "Web root — recently modified",
          tactic: "PERSISTENCE",
          content: `-rw-r--r-- www-data 18244 ${i.date.slice(3, 6)} ${i.date.slice(0, 2)} 04:13 /var/www/uploads/${i.shellFile}
-rw-r--r-- www-data   842 ${i.date.slice(3, 6)} ${i.date.slice(0, 2)} 04:22 /var/www/uploads/${i.secondShell}
-rw-r--r-- root      1610 Mar 11  2024 /var/www/index.php

File type of ${i.shellFile}: PHP script, ASCII text
First line: <?php @eval($_POST['c']); ?>`,
        },
        {
          type: "EVENT_LOG",
          title: "Auth log — privilege escalation",
          tactic: "PRIVILEGE_ESCALATION",
          content: `${i.date.slice(3, 6)} ${i.date.slice(0, 2)} 04:26:11 ${i.webHost} sudo: www-data : command not allowed ; COMMAND=/bin/bash
${i.date.slice(3, 6)} ${i.date.slice(0, 2)} 04:28:03 ${i.webHost} kernel: pkexec: unexpected argv handling
${i.date.slice(3, 6)} ${i.date.slice(0, 2)} 04:28:04 ${i.webHost} sudo: pam_unix(sudo:session): session opened for user root by (uid=33)
${i.date.slice(3, 6)} ${i.date.slice(0, 2)} 04:31:20 ${i.webHost} useradd[9142]: new user: name=${i.rootAccount}, UID=0, GID=0`,
        },
        {
          type: "PCAP_SUMMARY",
          title: `Outbound from ${i.webHost}`,
          tactic: "EXFILTRATION",
          content: `Destination        Port  Bytes out  Notes
${i.attackerIp}      443   2,140,000  post-compromise, steady
${i.c2Domain}  443   840,000    resolves to ${i.attackerIp}
${i.dbIp}             3306  9,240,000  internal database — unusual for this host`,
        },
      ];
    },
    tasks: (c) => {
      const i = webshellIndicators(c);
      return [
        {
          title: "The web shell",
          prompt: "Give the filename of the web shell dropped in the uploads directory.",
          answerType: "FREE_TEXT",
          correctAnswer: i.shellFile,
          points: 200,
        },
        {
          title: "Upload vector",
          prompt: "Which endpoint did the attacker POST to in order to place the shell?",
          answerType: "FREE_TEXT",
          correctAnswer: i.uploadEndpoint,
          points: 200,
        },
        {
          title: "Privilege escalation",
          prompt: "The attacker reached root. Name the account created afterwards with UID 0.",
          answerType: "FREE_TEXT",
          correctAnswer: i.rootAccount,
          points: 250,
        },
        {
          title: "Beyond the web tier",
          prompt: `What does the outbound traffic to ${i.dbIp} on port 3306 indicate?`,
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
      ];
    },
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
    artifacts: (c) => {
      const i = cloudIndicators(c);
      return [
        {
          type: "EVENT_LOG",
          title: "CloudTrail — key usage",
          tactic: "INITIAL_ACCESS",
          content: `eventTime            eventName            sourceIP          userIdentity
2026-07-14T02:11:04Z GetCallerIdentity    ${i.attackerIp}   ${i.accessKeyId} (${i.leakedRole})
2026-07-14T02:11:22Z ListBuckets          ${i.attackerIp}   ${i.accessKeyId}
2026-07-14T02:14:50Z GetObject (x ${i.objectsText}) ${i.attackerIp}   ${i.accessKeyId}
2026-07-14T02:41:09Z CreateUser           ${i.attackerIp}   new user: ${i.iamUser}
2026-07-14T02:41:31Z AttachUserPolicy     ${i.attackerIp}   AdministratorAccess
2026-07-14T02:42:02Z CreateAccessKey      ${i.attackerIp}   for user ${i.iamUser}`,
        },
        {
          type: "EVENT_LOG",
          title: "CloudTrail — trail state and regions",
          tactic: "PERSISTENCE",
          content: `2026-07-14T03:02:44Z StopLogging   ${i.attackerIp}  trailName: ${i.trailName} (${i.homeRegion})
2026-07-14T03:05:10Z RunInstances  ${i.attackerIp}  region: ${i.quietRegion}  count: ${i.instanceCount}  type: ${i.instanceType}

No trail is configured in ${i.quietRegion}.`,
        },
        {
          type: "FILE_LISTING",
          title: "Repository exposure",
          tactic: "PRIVILEGE_ESCALATION",
          content: `Repository: ${i.repo} (public)
Committed:  2026-07-13T18:22Z
File:       .github/workflows/deploy.yml
Line 34:    AWS_ACCESS_KEY_ID: ${i.accessKeyId}
Key age at time of leak: ${i.keyAgeDays} days, never rotated`,
        },
        {
          type: "TIMELINE",
          title: "Consolidated timeline",
          content: `13 Jul 18:22  Key committed publicly
14 Jul 02:11  First use from ${i.attackerIp}
14 Jul 02:14  ${i.objectsText} objects read from storage
14 Jul 02:41  IAM user ${i.iamUser} created with AdministratorAccess
14 Jul 03:02  Audit trail stopped in ${i.homeRegion}
14 Jul 03:05  ${i.instanceCount} GPU instances launched in ${i.quietRegion}, an unused region`,
        },
      ];
    },
    tasks: (c) => {
      const i = cloudIndicators(c);
      return [
        {
          title: "Persistence beyond the key",
          prompt:
            "Revoking the leaked key is not sufficient. Name the IAM user the attacker created.",
          answerType: "FREE_TEXT",
          correctAnswer: i.iamUser,
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
          prompt: `Why did the attacker launch instances in ${i.quietRegion} specifically?`,
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
          correctAnswer: i.objectsText,
          points: 300,
        },
      ];
    },
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
    artifacts: (c) => {
      const i = insiderIndicators(c);
      const rows = i.isoDates
        .map((d, n) => {
          const last = n === i.isoDates.length - 1;
          const vol = last ? i.finalVolume : i.volumes[n];
          // The final transfer has to read 02:14 — the endpoint artifact times
          // that upload session, and a learner cross-referencing the two would
          // otherwise find them describing different events.
          const time = last ? "02:14" : ["23:40", "22:55", "23:12", "01:48", "22:20"][n % 5];
          return `${d}  ${time}  ${c.user.padEnd(10)}${i.storageDomain.padEnd(30)}${vol} GB   CONFIDENTIAL`;
        })
        .reverse()
        .join("\n");
      return [
        {
          type: "EVENT_LOG",
          title: "DLP — egress events",
          tactic: "EXFILTRATION",
          content: `Date        Time   User       Destination                   Volume   Class
${rows}

Resignation date: ${i.resignationDate}
Distinct transfer events: ${i.transfers}`,
        },
        {
          type: "FILE_LISTING",
          title: `Transferred content — ${i.dates[i.dates.length - 1]}`,
          tactic: "EXFILTRATION",
          content: `${i.sourceA.padEnd(38)}${i.finalSplitA} GB   source and working files
${i.sourceB.padEnd(38)}${i.finalSplitB} GB   archived material
${i.hrFolder.padEnd(38)}0.3 GB   salary data for ${i.staffCount} staff

Access route: mapped drive ${i.mappedDrive} (legitimate access for this role)`,
        },
        {
          type: "EVENT_LOG",
          title: "Endpoint — activity around the transfer",
          tactic: "PERSISTENCE",
          content: `02:02  USB device inserted: ${i.usbDevice} (removed later, no copy recorded)
02:14  Browser upload session begins to ${i.storageDomain}
04:41  Upload completes
04:44  Browser history cleared for the session
04:45  Recycle Bin emptied`,
        },
        {
          type: "TIMELINE",
          title: "Consolidated timeline",
          content: `${i.dates
            .map((d, n) => {
              const last = n === i.dates.length - 1;
              const vol = last ? i.finalVolume : i.volumes[n];
              return `${d}  Transfer ${n + 1}, ${vol} GB${last ? `, including ${i.hrFolder}` : ""}`;
            })
            .join("\n")}

Resignation submitted 22 Jul — ${i.transfers - 1} of the ${i.transfers} transfers precede it.`,
        },
      ];
    },
    tasks: (c) => {
      const i = insiderIndicators(c);
      return [
        {
          title: "Scope",
          prompt: "How many separate transfer events are evidenced in total?",
          answerType: "FREE_TEXT",
          correctAnswer: String(i.transfers),
          points: 200,
        },
        {
          title: "The complicating find",
          prompt: `One folder in the ${i.dates[i.dates.length - 1]} transfer turns this from an IP matter into a notifiable personal data breach. Name it.`,
          answerType: "FREE_TEXT",
          correctAnswer: i.hrFolder,
          points: 300,
        },
        {
          // Added alongside the folder question so this chain has two answers
          // that vary: six companies pair with it, and one varying answer
          // collides too readily to keep their answer keys distinct.
          title: "Volume of the final transfer",
          prompt: `Give the volume of the ${i.dates[i.dates.length - 1]} transfer as the DLP log reports it, including the unit.`,
          answerType: "FREE_TEXT",
          correctAnswer: `${i.finalVolume} GB`,
          points: 200,
        },
        {
          title: "Premeditation",
          prompt: "What does the timeline establish about intent?",
          answerType: "RADIO",
          correctAnswer:
            "Transfers began weeks before resignation, indicating a sustained pattern",
          options: [
            "This was opportunistic, on the final day",
            "Transfers began weeks before resignation, indicating a sustained pattern",
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
      ];
    },
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
    artifacts: (c) => {
      const i = adIndicators(c);
      return [
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

Ticket lifetime observed: ${i.ticketYears} years`,
        },
        {
          type: "REGISTRY",
          title: "Persistence on DC hosts",
          tactic: "PERSISTENCE",
          content: `HKLM\\SYSTEM\\CurrentControlSet\\Services\\NTDS\\DSA
  Value: "${i.dsaValue}" -> C:\\Windows\\System32\\${i.dsaDll}  (added 02:52)

HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
  Value: "${i.runValue}" -> rundll32.exe C:\\Windows\\Temp\\${i.runDll},Start  (added 02:53)`,
        },
        {
          type: "PCAP_SUMMARY",
          title: "Egress from tier-0",
          tactic: "EXFILTRATION",
          content: `Destination      Port  Bytes out  Source
${i.c2Ip}        443   410,000    ${i.dcName}
${i.c2Domain}  443   1,240,000  ${i.dcName} (resolves to ${i.c2Ip})

A ${i.ntdsSize} GB transfer consistent with the size of NTDS.dit was observed at 03:14.`,
        },
      ];
    },
    tasks: (c) => {
      const i = adIndicators(c);
      return [
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
          prompt: `A ${i.ticketYears}-year ticket lifetime with RC4 encryption against krbtgt indicates which attack?`,
          answerType: "RADIO",
          correctAnswer: "Golden Ticket",
          options: ["Silver Ticket", "Golden Ticket", "Pass-the-Hash", "AS-REP Roasting"],
          points: 400,
        },
        {
          // Added so this chain has at least one answer that differs between the
          // companies it is paired with. The three technique questions around it
          // are knowledge checks and are meant to stay constant.
          title: "Persistence on the controllers",
          prompt:
            "Name the registry value added under the NTDS\\DSA service key to load the attacker's DLL.",
          answerType: "FREE_TEXT",
          correctAnswer: i.dsaValue,
          points: 300,
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
          prompt: `A ${i.ntdsSize} GB transfer from ${i.dcName} is consistent with theft of which specific file?`,
          answerType: "FREE_TEXT",
          correctAnswer: "NTDS.dit",
          points: 600,
        },
      ];
    },
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
    artifacts: (c) => {
      const i = supplyIndicators(c);
      return [
        {
          type: "EVENT_LOG",
          title: `CI build log — release ${i.release}`,
          tactic: "INITIAL_ACCESS",
          content: `09:03:51  npm ci --ignore-scripts  (${i.packageCount} packages)
09:05:30  build succeeded — dist/app.bundle.js (${commas(i.cleanBytes)} bytes)
09:05:31  sha256 ${i.cleanHash}
09:05:33  [step: ${i.buildStep}]
09:05:33    fetching https://${i.c2Domain}/${i.payloadFile}
09:06:12    optimisation complete — dist/app.bundle.js (${commas(i.cleanBytes + 7792)} bytes)
09:06:40  published sha256 ${i.publishedHash}`,
        },
        {
          type: "FILE_LISTING",
          title: "Committed pipeline definition",
          tactic: "PERSISTENCE",
          content: `.ci/pipeline.yml at commit ${i.commit}:

stages: [install, build, publish]

install:  npm ci --ignore-scripts
build:    npm run build && sha256sum dist/app.bundle.js
publish:  ci-publish dist/app.bundle.js

No ${i.buildStep} stage is defined.`,
        },
        {
          type: "EVENT_LOG",
          title: "Dependency resolution",
          tactic: "INITIAL_ACCESS",
          content: `${i.safePkg}@2.4.0     registry.npmjs.org   (internal package name)
${i.hijackedPkg}@9.9.9  registry.npmjs.org   (internal package name)

Internal registry versions on file:
  ${i.safePkg}     2.4.0
  ${i.hijackedPkg}  ${i.internalVersion}   — 9.9.9 does not exist internally`,
        },
        {
          type: "PCAP_SUMMARY",
          title: "Runner egress during build",
          tactic: "COMMAND_AND_CONTROL",
          content: `Destination        Port  Bytes       Time
${i.c2Domain}  443   12,400      09:05:33
${i.c2Ip}    443   840         09:06:10
registry.npmjs.org     443   88,000,000  09:02-09:03`,
        },
      ];
    },
    tasks: (c) => {
      const i = supplyIndicators(c);
      return [
        {
          title: "The unauthorised step",
          prompt: "Name the build step present in the log but absent from the committed pipeline.",
          answerType: "FREE_TEXT",
          correctAnswer: i.buildStep,
          points: 400,
        },
        {
          title: "Entry point",
          prompt: "Which internal package was resolved from the public registry?",
          answerType: "FREE_TEXT",
          correctAnswer: i.hijackedPkg,
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
          correctAnswer: i.cleanHashShort,
          points: 500,
        },
      ];
    },
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
    artifacts: (c) => {
      const i = otIndicators(c);
      const plc = `${i.otPrefix}.${i.plcOctet}`;
      const hmi = `${i.otPrefix}.${i.hmiOctet}`;
      return [
        {
          type: "EVENT_LOG",
          title: "Jump host — remote access",
          tactic: "INITIAL_ACCESS",
          content: `Date/Time         Account         Source IP     Method
2026-07-09 21:44  ${i.vendorAccount}  ${i.attackerIp}   ${i.remoteTool} (unmanaged)
2026-07-09 21:52  ${i.vendorAccount}  ${i.attackerIp}   RDP to ${i.jumpHost}
2026-07-09 22:10  ${i.jumpHost} -> OT VLAN ${i.otVlan}

${i.vendorAccount} is a shared account, no MFA, password unchanged since ${i.passwordYear}.`,
        },
        {
          type: "PCAP_SUMMARY",
          title: "OT network — protocol summary",
          tactic: "LATERAL_MOVEMENT",
          content: `Source        Destination   Protocol    Function
${hmi}  ${plc}  Modbus/TCP  Read Holding Registers (normal)
${i.jumpHost}   ${plc}  Modbus/TCP  Write Single Register (unusual source)
${i.jumpHost}   ${plc}  S7comm      Download block (firmware write)
${plc}  ${i.attackerIp}   HTTPS       outbound from the PLC — should never occur`,
        },
        {
          type: "EVENT_LOG",
          title: "PLC — firmware and setpoint changes",
          tactic: "IMPACT",
          content: `22:31  Firmware version changed: ${i.firmware} -> ${i.firmware}-mod
22:33  Setpoint ${i.tag} changed: ${i.setpointOld} C -> ${i.setpointNew} C
22:33  Alarm threshold ${i.tag} raised: ${i.alarmOld} C -> ${i.alarmNew} C
22:34  Operator HMI display unchanged — still reporting ${i.setpointOld} C`,
        },
        {
          type: "TIMELINE",
          title: "Consolidated timeline",
          content: `21:44  Vendor account used from ${i.attackerIp} over unmanaged remote access
22:10  Jump host reaches the OT VLAN — boundary crossed
22:31  PLC firmware replaced
22:33  Setpoint raised, and the alarm threshold raised to mask it
22:34  HMI continues to display the original value`,
        },
      ];
    },
    tasks: (c) => {
      const i = otIndicators(c);
      return [
        {
          title: "Boundary crossing",
          prompt: "Which account was used to reach the OT network?",
          answerType: "FREE_TEXT",
          correctAnswer: i.vendorAccount,
          points: 400,
        },
        {
          title: "Process manipulation",
          prompt: `What was setpoint ${i.tag} changed to?`,
          answerType: "FREE_TEXT",
          correctAnswer: i.setpointNew,
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
      ];
    },
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
    artifacts: (c) => {
      const i = stuffingIndicators(c);
      return [
        {
          type: "EVENT_LOG",
          title: "Authentication summary — 24 hours",
          tactic: "PRIVILEGE_ESCALATION",
          content: `Total login attempts     : ${i.attempts}
Distinct usernames tried : ${i.usernames}
Distinct source IPs      : ${i.sourceIps}
Success rate             : ${i.successRate}% (${i.successes} successes)
Top ASN                  : residential proxy network
User-Agent diversity     : ${i.userAgents} distinct strings

Normal day: ${i.baseline} attempts, 94% success rate.`,
        },
        {
          type: "EVENT_LOG",
          title: "Successful takeover sessions",
          tactic: "INITIAL_ACCESS",
          content: `Time   Account         Source IP      Action after login
02:14  ${i.accounts[0]}  ${i.attackerIp}  ${i.takeoverAction}
02:15  ${i.accounts[0]}  ${i.attackerIp}  Added new payment method
02:41  ${i.accounts[1]}  ${i.attackerIp}  ${i.takeoverAction}
03:02  ${i.accounts[2]}  ${i.attackerIp}  Order placed, express delivery

Common factor: none of the affected accounts had MFA enabled.`,
        },
        {
          type: "PCAP_SUMMARY",
          title: "API access pattern",
          tactic: "LATERAL_MOVEMENT",
          content: `Endpoint                   Requests   Notes
POST ${i.loginPath}         ${i.attempts}  no rate limit observed
GET  ${i.accountPath}       ${i.successes}      only after successful login
POST ${i.emailPath} ${i.successes}      immediately after login

Destination for scraped data: ${i.scrapeDomain} (${i.attackerIp})`,
        },
      ];
    },
    tasks: (c) => {
      const i = stuffingIndicators(c);
      return [
        {
          title: "Attack identification",
          prompt: `A ${i.successRate}% success rate across ${i.usernames} distinct usernames indicates what?`,
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
          correctAnswer: i.takeoverAction,
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
          correctAnswer: i.loginPath,
          points: 200,
        },
        {
          // The endpoint and the takeover action are both drawn from short
          // lists of plausible phrasings, and four companies pair with this
          // chain — often enough for two to land on the same pair. This answer
          // is a raw figure from the log, so it effectively never collides.
          title: "Accounts affected",
          prompt:
            "How many login attempts succeeded in the 24-hour window? Give the figure as the summary reports it.",
          answerType: "FREE_TEXT",
          correctAnswer: i.successes,
          points: 150,
        },
      ];
    },
  },

  // ── DDoS extortion ───────────────────────────────────────────────────────
  {
    key: "ddos",
    name: "DDoS Extortion",
    difficulty: "EASY",
    minutes: 90,
    points: 700,
    briefing: (c) => {
      const i = ddosIndicators(c);
      return `Public services went down for ${i.durationMin} minutes this morning, and an extortion email arrived shortly afterwards demanding payment to prevent a larger attack. Establish the nature of the attack, whether anything was actually compromised, and what to advise.`;
    },
    artifacts: (c) => {
      const i = ddosIndicators(c);
      return [
        {
          type: "EVENT_LOG",
          title: "Edge logs — the week before",
          tactic: null,
          content: `${i.probeDays} days before the outage, repeated probing from a small set of hosts:

2026-07-26  HTTP HEAD / from ${i.attackerIp}          x 40 over 10 minutes
2026-07-26  DNS ANY queries for the apex domain     x 220
2026-07-27  TCP connect scan, ports 80/443/8080     from 3 hosts in the same /24
2026-07-28  Repeated requests to /health and /status x ${i.probeCount}

None of this triggered an alert: each source stayed under the per-IP threshold.`,
        },
        {
          type: "PCAP_SUMMARY",
          title: "Traffic profile during the outage",
          tactic: "IMPACT",
          content: `Peak inbound      : ${i.peakGbps} Gbps
Protocol          : ${i.reflector.port} (${i.reflector.proto}) 78%, ${i.secondary.port} (${i.secondary.proto}) 19%, other 3%
Distinct sources  : ${i.sources}
Amplification     : average response/request ratio ${i.reflector.ratio}:1
Duration          : ${i.durationMin} minutes
Normal baseline   : ${i.baseline} Gbps`,
        },
        {
          type: "EMAIL",
          title: "Extortion demand",
          tactic: "IMPACT",
          content: `From: contact@${i.extortionDomain}
Subject: Your network

You experienced ${i.durationMin} minutes of downtime this morning. That was a demonstration.
Pay ${i.ransomBtc} BTC within 48 hours or the next attack will last a week.

Received: from ${i.attackerIp}`,
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
      ];
    },
    tasks: (c) => {
      const i = ddosIndicators(c);
      return [
        {
          title: "Attack type",
          prompt: `A ${i.reflector.ratio}:1 response ratio over ${i.reflector.port} indicates which technique?`,
          answerType: "RADIO",
          correctAnswer: i.reflector.name,
          options: [...i.reflectorNames],
          points: 200,
        },
        {
          title: "Scale",
          prompt: "Give the peak inbound traffic figure observed.",
          answerType: "FREE_TEXT",
          correctAnswer: `${i.peakGbps} Gbps`,
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
      ];
    },
  },
];
