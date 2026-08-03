"""
Insert terminal replays, guided walkthroughs and attack-chain diagrams into
existing Academy lessons.

Blocks are placed immediately before each lesson's closing knowledge check, so
the check still tests what the learner has just worked through. Run once; it
refuses to insert a block a lesson already has.

Usage: python scripts/add-paced-blocks.py
"""

import io
import os
import re
import sys

ROOT = os.path.join("src", "content", "academy")

# ── Blocks, keyed by (file, lesson title) ──────────────────────────────────
# Each value is TypeScript source inserted at block indentation (12 spaces).

BLOCKS = {}


def add(course, lesson_title, source):
    BLOCKS.setdefault(course, {})[lesson_title] = source.rstrip() + "\n"


# ── Network security ───────────────────────────────────────────────────────

add("network-security", "DNS as an investigative goldmine", '''
            terminal(
              "Pulling a day of resolver logs apart",
              "analyst@soc-jump",
              [
                note("Start wide. Which hosts made the most unique lookups today?"),
                cmd("awk '{print $3, $4}' dns.log | sort -u | awk '{print $1}' | sort | uniq -c | sort -rn | head -5"),
                out(`   4127 10.20.4.88
    612 10.20.4.15
    588 10.20.9.31
    401 10.20.4.02
    377 10.20.7.14`),
                note("10.20.4.88 made almost seven times more unique lookups than anything else. That is not a person browsing."),
                cmd("grep '10.20.4.88' dns.log | awk '{print $4}' | rev | cut -d. -f1,2 | rev | sort | uniq -c | sort -rn | head -3"),
                out(`   3981 updates-cdn.info
     94 windowsupdate.com
     52 office365.com`),
                note("Nearly four thousand distinct names under one parent domain. Now look at what they resolved to."),
                cmd("grep 'updates-cdn.info' dns.log | awk '{print $6}' | sort | uniq -c"),
                out(`   3974 NXDOMAIN
      7 NOERROR`),
                note("A 99.8% failure rate. The malware is walking a generated list; the operator registered seven of them."),
                cmd("grep 'updates-cdn.info' dns.log | grep NOERROR | awk '{print $4, $7}'"),
                out(`9c2e0b47.updates-cdn.info  91.203.44.18
b81f70a3.updates-cdn.info  91.203.44.18
d40c9e15.updates-cdn.info  91.203.44.18
7a2b8f60.updates-cdn.info  185.244.25.171
e93d1c8a.updates-cdn.info  185.244.25.171
1f6a04b2.updates-cdn.info  185.244.25.171
55ce7d90.updates-cdn.info  185.244.25.171`),
                note("Seven names, two addresses. Those two IPs are your blocking targets — and the pattern is your detection."),
              ],
            ),''')

add("network-security", "Beacon detection", '''
            walkthrough(
              "Separating a beacon from a busy application",
              "A host is talking to the same external address every few minutes. So is your monitoring agent. Work through what actually distinguishes them.",
              [
                step(
                  "Start from the interval, not the destination",
                  "Reputation lists will not help here — the destination is a rented VPS with no history. What you can measure without any external data is the rhythm of the connections.",
                  {
                    evidence: {
                      label: "conn.log — intervals between connections (seconds)",
                      code: `10.20.4.88 -> 185.244.25.171
  302 298 301 300 299 303 297 301 300 302 298 300

10.20.4.15 -> 34.117.59.81
  61 447 12 890 33 1204 8 76 2311 44 19 655`,
                    },
                    insight: "The first host's intervals sit within six seconds of five minutes, every time. The second wanders across three orders of magnitude.",
                  },
                ),
                step(
                  "Quantify the regularity rather than eyeballing it",
                  "Standard deviation over the intervals turns the impression into a number you can alert on. Low deviation relative to the mean means a timer is driving the traffic.",
                  {
                    evidence: {
                      label: "Interval statistics",
                      code: `host          mean    stddev   stddev/mean
10.20.4.88    300.1     1.9        0.006
10.20.4.15    563.3    712.4        1.264`,
                    },
                    insight: "A ratio near zero is a machine on a schedule. Near or above one is a human, or an application reacting to a human.",
                  },
                ),
                step(
                  "Check whether the monitoring agent looks the same",
                  "This is the step people skip, and it is why beacon rules get switched off. Your own agents also poll on a fixed timer, so regularity alone will flag them too.",
                  {
                    evidence: {
                      label: "Known-good comparison",
                      code: `10.20.9.31 -> edr-cloud.vendor.net
  60 60 61 60 60 60 59 60 61 60
  stddev/mean = 0.008`,
                    },
                    insight: "The EDR agent is *more* regular than the suspect. Regularity is necessary but nowhere near sufficient.",
                  },
                ),
                step(
                  "Bring in payload size and destination age",
                  "What separates the two is not the timing — it is everything around it. The agent talks to a domain registered in 2014 with a valid certificate and transfers varying amounts of data. The beacon talks to a three-week-old VPS and sends near-identical byte counts every time.",
                  {
                    evidence: {
                      label: "Bytes per connection",
                      code: `10.20.4.88 -> 185.244.25.171
  bytes out: 148 152 148 149 148 151 148
  bytes in:  96  96  96  96  96  102 96

10.20.9.31 -> edr-cloud.vendor.net
  bytes out: 2841 19722 3106 88410 2977
  bytes in:  412  388   9911 402   1204`,
                    },
                    insight: "Constant payload size means the beacon is asking the same question and mostly hearing 'nothing to do'. Real telemetry varies because there is real telemetry.",
                  },
                ),
                step(
                  "Write the detection with all three conditions",
                  "Alert on: interval deviation under 5% of the mean, byte counts varying by under 10%, and a destination first seen in your environment within the last 30 days. Any one alone is noise. Together they are specific enough to page someone.",
                  {
                    insight: "Every condition you add cuts false positives — and the third one, destination age, costs nothing but an asset database you already have.",
                  },
                ),
              ],
            ),''')

add("network-security", "Staged exfiltration", '''
            diagram(
              "Collection to exfiltration, one stage at a time",
              "Data rarely leaves in the shape it was stored. Watch where the observable moments are — each stage leaves different evidence.",
              [
                stage("Discovery", "T1083", "The operator enumerates file shares and mapped drives looking for anything worth taking. High-volume directory listings from a single account, often outside business hours."),
                stage("Local collection", "T1074.001", "Files are copied to one staging directory on a compromised host — usually somewhere unremarkable like a temp or profile folder. This is the loudest stage on the endpoint and the quietest on the network."),
                stage("Compression", "T1560.001", "The staging directory is archived, often split into fixed-size volumes. A large archive appearing where no archive belongs is a strong host-based signal."),
                stage("Encryption", "T1560", "The archive is encrypted before it leaves, so DLP inspecting content sees nothing. This is why network content inspection alone will not save you."),
                stage("Transfer", "T1567.002", "The archive goes out — commonly to a cloud storage provider, because that traffic is expected and TLS-wrapped. Look for volume asymmetry: a workstation uploading far more than it downloads."),
                stage("Cleanup", "T1070.004", "The staging directory and archive are deleted. Deletion timestamps clustered minutes after a large upload are frequently the clearest evidence left behind."),
              ],
            ),''')

# ── Cloud security ─────────────────────────────────────────────────────────

add("cloud-security", "Anatomy of an audit event", '''
            terminal(
              "Reading CloudTrail without a SIEM",
              "analyst@ir-box",
              [
                note("You have a day of CloudTrail JSON and an access key you believe was stolen. Start with what that key did."),
                cmd("jq -r 'select(.userIdentity.accessKeyId==\\"AKIA4XMPL3EXAMPLE\\") | .eventName' trail.json | sort | uniq -c | sort -rn"),
                out(`     42 GetCallerIdentity
     18 ListBuckets
     11 DescribeInstances
      6 ListUsers
      3 CreateAccessKey
      1 AttachUserPolicy`),
                note("GetCallerIdentity forty-two times is orientation — whoever holds the key does not know what it is. The last two lines are the problem."),
                cmd("jq -r 'select(.eventName==\\"CreateAccessKey\\") | [.eventTime, .userIdentity.arn, .requestParameters.userName] | @tsv' trail.json"),
                out(`2026-07-31T02:41:07Z  arn:aws:iam::4021:user/ci-deploy  ci-deploy
2026-07-31T02:41:34Z  arn:aws:iam::4021:user/ci-deploy  svc-backup
2026-07-31T02:42:02Z  arn:aws:iam::4021:user/ci-deploy  svc-backup`),
                note("The compromised identity minted a key for itself, then two for a different user. That second user is now the persistence."),
                cmd("jq -r 'select(.eventName==\\"AttachUserPolicy\\") | [.eventTime, .requestParameters.userName, .requestParameters.policyArn] | @tsv' trail.json"),
                out(`2026-07-31T02:42:19Z  svc-backup  arn:aws:iam::aws:policy/AdministratorAccess`),
                note("Twelve minutes from first API call to full administrator. Now find every source address involved."),
                cmd("jq -r 'select(.userIdentity.accessKeyId==\\"AKIA4XMPL3EXAMPLE\\") | .sourceIPAddress' trail.json | sort -u"),
                out(`185.244.25.171
203.0.113.44`),
                note("Two addresses, neither in your VPC ranges. Revoke svc-backup's keys first — that is the access that survives rotating the original."),
              ],
            ),''')

add("cloud-security", "Detecting cloud persistence", '''
            diagram(
              "One leaked key to durable access",
              "Every stage after the first exists to survive the remediation you are about to perform. Read it as a list of things to check before you declare the incident closed.",
              [
                stage("Credential exposure", "T1552.001", "A long-lived access key reaches somewhere it should not — a public repository, a build log, a laptop. No API call has happened yet, and this is the last moment prevention is cheap."),
                stage("Orientation", "T1580", "GetCallerIdentity, ListBuckets, DescribeInstances. The operator does not know what the key can do, so they ask. A burst of read-only enumeration from a new address is the earliest detectable moment."),
                stage("Second identity", "T1136.003", "A new IAM user or access key is created. This is the pivot that matters: rotating the original key now achieves nothing, because the access no longer depends on it."),
                stage("Privilege escalation", "T1098.001", "A managed policy — usually AdministratorAccess, because it is the one that always exists — is attached to the new identity."),
                stage("Trail tampering", "T1562.008", "Logging is stopped, deleted, or pointed at a bucket the operator controls. StopLogging and DeleteTrail should page someone at any hour; they have no legitimate emergency use."),
                stage("Resource abuse or exfiltration", "T1496", "Compute is spun up for mining, or storage is read out. This is the stage the finance team notices, days later, which is far too late to be your detection."),
              ],
            ),''')

add("cloud-security", "Public by accident", '''
            walkthrough(
              "Working out whether the exposure was actually read",
              "A bucket holding customer exports has been world-readable for eleven days. The disclosure question is not whether it was public — it is whether anyone took anything.",
              [
                step(
                  "Establish exactly when it became public",
                  "The policy change is in the management trail. Get the precise timestamp before anything else, because it bounds every question that follows.",
                  {
                    evidence: {
                      label: "CloudTrail — management events",
                      code: `2026-07-20T14:22:51Z  PutBucketPolicy
  bucket: acme-customer-exports
  principal: arn:aws:iam::4021:user/data-eng-intern
  policy: Principal "*", Action s3:GetObject`,
                    },
                    insight: "Eleven days of exposure, and an identifiable human who did it. Resist the urge to focus on the human — the exposure window is the finding.",
                  },
                ),
                step(
                  "Check whether data-plane logging was even on",
                  "This is where most of these investigations end badly. Management events are on by default; object-level reads are not. If S3 access logging was off, you cannot prove absence of access.",
                  {
                    evidence: {
                      label: "Bucket configuration",
                      code: `ServerAccessLogging: Enabled -> s3://acme-logs/exports/
ObjectLevelLogging (CloudTrail data events): Disabled`,
                    },
                    insight: "Server access logs are enabled. That is a lucky break — without them the honest answer to the disclosure question would be 'we do not know'.",
                  },
                ),
                step(
                  "Separate your own traffic from everyone else's",
                  "The vast majority of requests will be your own application. Filter to unauthenticated requests, since a public read needs no credentials.",
                  {
                    evidence: {
                      label: "Access log — anonymous GETs in the window",
                      code: `requester: - (anonymous)
2026-07-24T03:11:02Z GET /exports/2026-q2-customers.csv  200  41822190
2026-07-24T03:11:44Z GET /exports/2026-q1-customers.csv  200  38911204
2026-07-29T18:02:19Z GET /                               403  -`,
                    },
                    insight: "Two successful anonymous reads of full customer exports, forty megabytes each. The 403 is a scanner that found nothing.",
                  },
                ),
                step(
                  "Attribute the reads as far as you honestly can",
                  "Source addresses give you geography and hosting provider, not identity. Say what the evidence supports and no more — a disclosure that overstates certainty is worse than one that admits a gap.",
                  {
                    evidence: {
                      label: "Source analysis",
                      code: `45.9.148.99   hosting provider, no PTR, seen scanning /24 broadly
45.9.148.99   both requests, 42 seconds apart, curl/7.81.0 user agent`,
                    },
                    insight: "One source, automated client, two targeted requests. It knew the object names — which means it had already listed the bucket.",
                  },
                ),
                step(
                  "State the finding in terms the business can act on",
                  "Two customer export files containing personal data were downloaded by an unidentified party on 24 July. The bucket was public from 20 to 31 July. Object-level logging was disabled, so reads before server access logging rotated cannot be ruled out. That last sentence is the one people want to delete, and the one that must stay.",
                  {
                    insight: "Notification obligations turn on 'was personal data accessed', not 'was it exposed'. You now have a defensible answer to both.",
                  },
                ),
              ],
            ),''')

# ── Forensics ──────────────────────────────────────────────────────────────

add("forensics", "Imaging and hashing", '''
            terminal(
              "Acquiring a disk image with verification",
              "examiner@fw-station",
              [
                note("The disk is attached through a hardware write blocker. Confirm that before touching anything."),
                cmd("blockdev --getro /dev/sdb"),
                out("1"),
                note("A 1 means read-only. If this returns 0, stop — you are about to alter evidence."),
                cmd("hdparm -I /dev/sdb | grep -E 'Model|Serial|device size with M'"),
                out(`  Model Number:       SAMSUNG MZVLB512HBJQ-000L7
  Serial Number:      S4ENNF0N612345
  device size with M = 488386 MiBytes (512110 MB)`),
                note("Record the model and serial in your notes now. This is what ties the image to the physical device later."),
                cmd("dc3dd if=/dev/sdb of=/eve/case-2026-114/sdb.raw hash=sha256 log=/evi/case-2026-114/acquire.log"),
                out(`dc3dd 7.2.646 started at 2026-08-03 09:14:02 +0000
compiled options: DEFAULT_BLOCKSIZE=32768
device size: 1000215216 sectors
   512110190592 bytes ( 477 G ) copied ( 100% ),  3412 s,  143 M/s

  sha256 total (dc3dd): 8f2a1c9e04b7d3116a55c8ef920d4b73c1e08fa62d95b4470ac3ed81f6b209ca

512110190592 bytes ( 477 G ) copied ( 100% ), 3413.2088 s, 143 M/s`),
                note("dc3dd hashed while it read, so the hash covers what was actually on the wire. Now verify the file on disk independently."),
                cmd("sha256sum /evi/case-2026-114/sdb.raw"),
                out("8f2a1c9e04b7d3116a55c8ef920d4b73c1e08fa62d95b4470ac3ed81f6b209ca  /evi/case-2026-114/sdb.raw"),
                note("The two hashes match, computed by different code paths. That is what makes the image defensible — and why the source hash must be taken during acquisition, not after."),
                cmd("chmod 444 /evi/case-2026-114/sdb.raw && ls -l /evi/case-2026-114/"),
                out(`-r--r--r-- 1 examiner examiner        2841 Aug  3 10:11 acquire.log
-r--r--r-- 1 examiner examiner 512110190592 Aug  3 10:11 sdb.raw`),
                note("Work from a copy of this file, never the file itself. The original image is now as close to the evidence as you will get."),
              ],
            ),''')

add("forensics", "Evidence of execution", '''
            walkthrough(
              "Proving a binary ran, and when",
              "Someone claims a tool was never executed on this host. No single artefact settles that. Four weak signals, agreeing, do.",
              [
                step(
                  "Prefetch: did Windows prepare to run it?",
                  "A prefetch file exists because the loader saw the executable start. Its embedded run count and last-run timestamps are among the most direct execution evidence Windows keeps.",
                  {
                    evidence: {
                      label: "C:\\\\Windows\\\\Prefetch\\\\",
                      code: `RCLONE.EXE-9F2A11C4.pf
  run count:  3
  last run:   2026-07-29 02:14:51
  prior runs: 2026-07-28 23:40:02, 2026-07-28 23:07:19
  loaded from: \\\\VOLUME{01d9...}\\\\USERS\\\\SVC-BACKUP\\\\APPDATA\\\\LOCAL\\\\TEMP\\\\`,
                    },
                    insight: "Three executions, and the path is a user temp directory — not where an administrator installs a legitimate transfer tool.",
                  },
                ),
                step(
                  "ShimCache: was it present, and where?",
                  "AppCompatCache records the path and file modification time of binaries the shim engine evaluated. It is often called execution evidence; it is closer to presence evidence, which is a distinction worth being exact about.",
                  {
                    evidence: {
                      label: "SYSTEM\\\\CurrentControlSet\\\\Control\\\\Session Manager\\\\AppCompatCache",
                      code: `C:\\\\Users\\\\svc-backup\\\\AppData\\\\Local\\\\Temp\\\\rclone.exe
  file modified: 2026-07-28 22:51:04
  entry position: 4 of 1024`,
                    },
                    insight: "Corroborates presence and gives a file modification time earlier than the first prefetch run — consistent with the file being dropped, then run.",
                  },
                ),
                step(
                  "Amcache: what was the file itself?",
                  "Amcache carries a SHA-1 of the binary. This is the artefact that survives the file being deleted, and it lets you identify the exact build rather than just a filename anyone could have chosen.",
                  {
                    evidence: {
                      label: "Amcache.hve — InventoryApplicationFile",
                      code: `rclone.exe|8a1f...  SHA1: 9c2b7e40d18a3f5510cc0e2288a1b64d7f03e9aa
  link date: 2026-01-14
  publisher: (none)  signed: no`,
                    },
                    insight: "Unsigned, no publisher, and a hash you can check against known rclone builds. The filename was honest, which is not always the case.",
                  },
                ),
                step(
                  "Cross-check against something outside the disk",
                  "Every artefact so far lives on the machine under investigation, and anything on that machine could have been altered. An independent source is what turns a strong case into a closed one.",
                  {
                    evidence: {
                      label: "Firewall logs — same host, same window",
                      code: `2026-07-29 02:15:04  10.20.4.88 -> 185.244.25.171:443  outbound  4.1 GB
2026-07-28 23:41:12  10.20.4.88 -> 185.244.25.171:443  outbound  11.8 GB`,
                    },
                    insight: "Large outbound transfers beginning seconds after two of the three prefetch run times. The disk says it ran; the network says what it did.",
                  },
                ),
                step(
                  "State what the evidence supports",
                  "Four artefacts from three independent subsystems place the same binary on the host, executing three times, immediately followed by multi-gigabyte outbound transfers. The claim that it never ran does not survive that. Note also what you cannot say: none of this identifies who typed the command.",
                  {
                    insight: "Being precise about the boundary of your findings is what makes the findings usable. Overreach on attribution and the whole report gets discounted.",
                  },
                ),
              ],
            ),''')

add("forensics", "Building a super timeline", '''
            terminal(
              "From image to reviewable timeline",
              "examiner@fw-station",
              [
                note("Timeline first, theory second. Parse everything, then narrow — going the other way means you only find what you already suspected."),
                cmd("log2timeline.py --status_view window --storage-file case114.plaso /evi/case-2026-114/sdb.raw"),
                out(`Source path        : /evi/case-2026-114/sdb.raw
Source type        : storage media image
Processing started : 2026-08-03 11:02:14

Identifier   PID    Status     Events    File
Main         8841   running    1841204   filestat
Worker_00    8842   running     412009   winreg
Worker_01    8843   running     288115   winevtx

Processing completed. 4 812 655 events in 41m18s.`),
                note("Nearly five million events. That is unreadable as-is, which is the point of the next step."),
                cmd("psort.py -o l2tcsv -w case114.csv case114.plaso 'date > \\"2026-07-28 00:00:00\\" AND date < \\"2026-07-30 00:00:00\\"'"),
                out(`Filter string: date > "2026-07-28 00:00:00" AND date < "2026-07-30 00:00:00"
Events filtered : 4 798 002
Events written  :    14 653
Processing completed in 2m41s.`),
                note("Two days around the suspected activity leaves fourteen thousand events. Still a lot, but now it is a day of reading rather than a month."),
                cmd("grep -iE 'prefetch|\\\\.pf$|EventLog:4624|EventLog:4688' case114.csv | head -6"),
                out(`2026-07-28T22:51:04Z,FILE,NTFS $MFT,...,rclone.exe created in \\\\Users\\\\svc-backup\\\\AppData\\\\Local\\\\Temp
2026-07-28T23:07:19Z,PE,Prefetch,...,RCLONE.EXE-9F2A11C4.pf run 1
2026-07-28T23:07:21Z,LOG,WinEVTX,...,4688 New Process rclone.exe parent cmd.exe
2026-07-28T23:40:02Z,PE,Prefetch,...,RCLONE.EXE-9F2A11C4.pf run 2
2026-07-29T02:14:51Z,PE,Prefetch,...,RCLONE.EXE-9F2A11C4.pf run 3
2026-07-29T02:41:33Z,FILE,NTFS $MFT,...,rclone.exe deleted`),
                note("Dropped at 22:51, run three times, deleted at 02:41. The sequence is the finding — no single line above would have been enough."),
              ],
            ),''')

# ── Detection engineering ──────────────────────────────────────────────────

add("detection-engineering", "Parent-child process logic", '''
            terminal(
              "Writing and testing a parent-child rule",
              "detect@rules-ci",
              [
                note("The hypothesis: Office applications should not spawn script interpreters. Write it as a rule before checking whether it holds."),
                cmd("cat rules/office_spawns_interpreter.yml"),
                out(`title: Office Application Spawning Script Interpreter
id: 8c1f4a20-0d7e-4a11-9f33-2b6ce0a51d84
status: experimental
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    ParentImage|endswith:
      - '\\\\WINWORD.EXE'
      - '\\\\EXCEL.EXE'
      - '\\\\POWERPNT.EXE'
    Image|endswith:
      - '\\\\wscript.exe'
      - '\\\\cscript.exe'
      - '\\\\powershell.exe'
      - '\\\\mshta.exe'
  condition: selection
level: high`),
                note("Now the part people skip: run it against thirty days of production telemetry before it goes anywhere near an analyst."),
                cmd("sigma-cli check --rule rules/office_spawns_interpreter.yml --baseline prod-30d.parquet"),
                out(`Matches over 30 days: 218
Distinct hosts:        4
Distinct parents:      1 (EXCEL.EXE)
Distinct children:     1 (powershell.exe)`),
                note("Two hundred and eighteen hits across four hosts. If this shipped as written, the analyst gets seven alerts a day from the same four machines."),
                cmd("sigma-cli explain --rule rules/office_spawns_interpreter.yml --baseline prod-30d.parquet --group CommandLine | head -4"),
                out(`  214  powershell.exe -ExecutionPolicy Bypass -File C:\\\\FinOps\\\\refresh-rates.ps1
    2  powershell.exe -enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoA...
    1  powershell.exe -nop -w hidden -c IEX(New-Object Net...
    1  powershell.exe Get-Process`),
                note("Two hundred and fourteen of those are one finance macro doing its job. The three below it are exactly what the rule was written to catch."),
                note("Exclude the specific script path — not EXCEL.EXE, and not powershell.exe. A broad exclusion here would have discarded the real detections too."),
                cmd("sigma-cli check --rule rules/office_spawns_interpreter.yml --baseline prod-30d.parquet --after-tuning"),
                out(`Matches over 30 days: 4
Distinct hosts:        3
Estimated alerts/day:  0.13`),
                note("One alert every eight days, and every one worth opening. That ratio is the deliverable — not the rule file."),
              ],
            ),''')

add("detection-engineering", "Detecting living-off-the-land", '''
            walkthrough(
              "Turning a noisy binary into a usable detection",
              "certutil.exe is signed, present on every Windows host, and used constantly by legitimate software. It is also a download tool. Work out what you can actually alert on.",
              [
                step(
                  "Measure the noise before writing anything",
                  "Start by counting how often the binary runs at all across the estate. The number decides whether you are writing a detection or a hunting query.",
                  {
                    evidence: {
                      label: "30 days of process creation",
                      code: `certutil.exe executions: 41 802
distinct hosts:          3 914
distinct command lines:    127`,
                    },
                    insight: "Alerting on execution is out of the question. But 127 distinct command lines across 3,914 hosts means the *arguments* are highly repetitive.",
                  },
                ),
                step(
                  "Group by argument, not by binary",
                  "The legitimate uses cluster tightly — certificate store operations, mostly from management software. The interesting flags barely appear.",
                  {
                    evidence: {
                      label: "Top command lines by frequency",
                      code: `38 114  certutil -verifystore My
  2 902  certutil -f -p **** -importpfx
    701  certutil -store -enterprise NTAuth
     78  certutil -hashfile ... SHA256
      6  certutil -urlcache -split -f http://...
      1  certutil -decode payload.b64 payload.exe`),
                    },
                    insight: "The bottom two lines are 0.017% of all executions, and they are the only ones that download or decode.",
                  },
                ),
                step(
                  "Check the rare arguments have no legitimate owner",
                  "Six urlcache executions is few enough to check individually. If one turns out to be a deployment script, your rule needs an exclusion rather than a lower threshold.",
                  {
                    evidence: {
                      label: "The six -urlcache executions",
                      code: `4x  host WKS-4412, parent w3wp.exe,  http://10.20.1.9/agent.msi   (internal, patch server)
2x  host WKS-0088, parent cmd.exe,   http://185.244.25.171/a.txt  (external, VPS)`,
                    },
                    insight: "Four are an internal patch server and belong in an exclusion by destination. Two are an external IP address with no hostname — which is the detection.",
                  },
                ),
                step(
                  "Write the rule around intent, not the binary name",
                  "Alert on certutil with -urlcache, -decode or -encode where the destination is not an internal address. The binary being signed and common is irrelevant once the arguments carry the intent.",
                  {
                    evidence: {
                      label: "Tuned rule — 30-day replay",
                      code: `matches:              2
distinct hosts:       1
estimated alerts/day: 0.07`,
                    },
                    insight: "Two alerts in a month, both true positives. The same log source that looked hopeless at 41,802 events produced a precise detection — because the grouping was on arguments.",
                  },
                ),
                step(
                  "Accept what this rule does not cover",
                  "An operator who knows this rule exists uses a different binary. That is fine, and it is why living-off-the-land coverage is a set of narrow rules rather than one clever one. Write the same analysis for bitsadmin, mshta and regsvr32 next.",
                  {
                    insight: "Narrow rules that fire rarely and correctly are worth more than a broad rule that gets muted in week two.",
                  },
                ),
              ],
            ),''')

add("detection-engineering", "Detection as code", '''
            terminal(
              "A detection pipeline that refuses bad rules",
              "detect@rules-ci",
              [
                note("Rules live in git and ship through CI, exactly like application code. Here is what a pull request runs."),
                cmd("cat .github/workflows/detections.yml"),
                out(`name: detections
on: [pull_request]
jobs:
  validate:
    steps:
      - run: sigma-cli validate rules/            # schema and syntax
      - run: sigma-cli lint rules/ --strict       # required metadata
      - run: pytest tests/detections/             # true and false positives
      - run: sigma-cli baseline rules/ --max-per-day 1.0`),
                note("Four gates. The last one is the one that keeps the alert queue survivable."),
                cmd("sigma-cli validate rules/"),
                out(`rules/office_spawns_interpreter.yml   OK
rules/certutil_remote_fetch.yml       OK
rules/lsass_handle_access.yml         ERROR
    line 14: 'condition' references undefined selection 'filter_legit'

1 error, 2 passed`),
                note("A typo in a condition would have shipped a rule that silently never fires. This is the failure mode CI exists to catch."),
                cmd("pytest tests/detections/ -q"),
                out(`tests/detections/test_office_spawns.py::test_fires_on_maldoc      PASSED
tests/detections/test_office_spawns.py::test_ignores_finops_macro PASSED
tests/detections/test_certutil.py::test_fires_on_external_fetch   PASSED
tests/detections/test_certutil.py::test_ignores_patch_server      FAILED

E  Expected 0 matches, got 4
E  Sample: certutil -urlcache -split -f http://10.20.1.9/agent.msi`),
                note("The exclusion was written against the wrong field. Every rule needs both tests: one proving it fires, one proving it stays quiet."),
                cmd("git log --oneline -3 -- rules/certutil_remote_fetch.yml"),
                out(`a3f1c04  tune: exclude internal patch server by destination
7b20e91  fix: match on urlcache and decode, not binary name
c14d8a2  add: certutil remote fetch detection`),
                note("Every change to a detection has an author, a reason and a diff. When an alert misbehaves at 3am, that history is what tells you why the rule looks the way it does."),
              ],
            ),''')

# ── Cryptography ───────────────────────────────────────────────────────────

add("cryptography", "Encoding, hashing, encryption", '''
            terminal(
              "Three operations people confuse, side by side",
              "student@crypto-lab",
              [
                note("Encoding. Reversible by anyone, no key involved. It is a change of alphabet, not a security control."),
                cmd("echo -n 'transfer 50000 to acct 9912' | base64"),
                out("dHJhbnNmZXIgNTAwMDAgdG8gYWNjdCA5OTEy"),
                cmd("echo 'dHJhbnNmZXIgNTAwMDAgdG8gYWNjdCA5OTEy' | base64 -d"),
                out("transfer 50000 to acct 9912"),
                note("No key was supplied in either direction. Anything protected only by base64 is not protected."),
                note("Hashing. One-way, fixed length, and deterministic — the same input always gives the same digest."),
                cmd("echo -n 'transfer 50000 to acct 9912' | sha256sum"),
                out("6b8e15d1a3f2c0e9847bb50d21c7f4a0938e5c1642dd7fa03b9e1c8055a47f2d  -"),
                cmd("echo -n 'transfer 50001 to acct 9912' | sha256sum"),
                out("f10c4a7e92b3d5081ca6ef4471d0982b5e63a1c07f8b294de5013ab6c7f8290e  -"),
                note("One digit changed and the entire digest changed. That avalanche property is what makes a hash useful for integrity — and useless for confidentiality, since you cannot get the message back."),
                note("Encryption. Reversible, but only with the key."),
                cmd("openssl enc -aes-256-cbc -pbkdf2 -in payment.txt -out payment.enc -pass pass:correct-horse"),
                cmd("xxd payment.enc | head -2"),
                out(`00000000: 5361 6c74 6564 5f5f 91c4 0a2f 88bd 3e17  Salted__.../..>.
00000010: c209 4ab7 3f10 e582 6d41 f0a9 27cc 5b3e  ..J.?...mA..'.[>`),
                cmd("openssl enc -d -aes-256-cbc -pbkdf2 -in payment.enc -pass pass:wrong-key"),
                out("bad decrypt\\n40E7A1B2:error:1C800064:Provider routines:ossl_cipher_unpadblock:bad decrypt"),
                note("Wrong key, no plaintext. Encoding gives it up to anyone, hashing gives it to no one, encryption gives it to whoever holds the key. Choosing the wrong one of the three is the most common crypto mistake in production code."),
              ],
            ),''')

add("cryptography", "Password storage", '''
            terminal(
              "Why the algorithm choice decides the outcome",
              "student@crypto-lab",
              [
                note("A database of password hashes has leaked. What happens next depends entirely on how they were stored."),
                cmd("head -3 leaked_md5.txt"),
                out(`5f4dcc3b5aa765d61d8327deb882cf99
e10adc3949ba59abbe56e057f20f883e
25d55ad283aa400af464c76d713c07ad`),
                cmd("hashcat -m 0 -a 0 leaked_md5.txt rockyou.txt --quiet --status"),
                out(`Speed.#1.........: 68914.2 MH/s (58.11ms)
Recovered........: 3/3 (100.00%) Digests

5f4dcc3b5aa765d61d8327deb882cf99:password
e10adc3949ba59abbe56e057f20f883e:123456
25d55ad283aa400af464c76d713c07ad:password123`),
                note("Sixty-eight billion guesses per second. MD5 was designed to be fast, and speed is precisely the wrong property here."),
                note("Now the same passwords stored with bcrypt at cost factor 12."),
                cmd("head -1 leaked_bcrypt.txt"),
                out("$2b$12$Nt9AGb1zaTiSD8UEjyKrLuJm4ROlR1r6xtqzeCA0hZvxpDrDdU2Vy"),
                cmd("hashcat -m 3200 -a 0 leaked_bcrypt.txt rockyou.txt --quiet --status"),
                out(`Speed.#1.........: 4218 H/s (61.44ms)
Recovered........: 1/3 (33.33%) Digests
Progress.........: 14344385/14344385 (100.00%)

$2b$12$Nt9AGb1zaTiSD8UEjyKrLuJm4ROlR1r6xtqzeCA0hZvxpDrDdU2Vy:password`),
                note("Four thousand guesses per second instead of sixty-eight billion — sixteen million times slower. The whole rockyou list took hours rather than milliseconds."),
                note("Note what did not change: 'password' still fell. A slow hash buys time against weak passwords; it does not rescue them."),
                cmd("grep -c . leaked_bcrypt.txt && awk -F'$' '{print $2, $3}' leaked_bcrypt.txt | sort -u"),
                out(`3
2b 12`),
                note("The cost factor is stored in the hash itself, so you can raise it later and re-hash on next login. Designing for that from the start is the difference between a tunable system and a rewrite."),
              ],
            ),''')

add("cryptography", "Certificate validation", '''
            walkthrough(
              "Diagnosing a chain that will not validate",
              "A client is refusing a certificate the server team insists is valid. Both can be true — validation depends on what the client can see, not on what exists.",
              [
                step(
                  "Ask what the server actually sent",
                  "A certificate is valid in the abstract; a chain is valid as presented. Start by looking at the wire, not at the certificate file on the server.",
                  {
                    evidence: {
                      label: "openssl s_client -connect api.internal:443",
                      code: `Certificate chain
 0 s:CN = api.internal
   i:CN = Acme Issuing CA G2

Verify return code: 21 (unable to verify the first certificate)`,
                    },
                    insight: "The server sent one certificate. The chain has depth 0 — the intermediate is missing from what was presented.",
                  },
                ),
                step(
                  "Work out why it appeared to work elsewhere",
                  "Browsers often cache intermediates from previous sessions, or fetch them via the Authority Information Access extension. A command-line client with a cold cache does neither.",
                  {
                    evidence: {
                      label: "AIA extension on the leaf",
                      code: `X509v3 Authority Information Access:
    CA Issuers - URI:http://pki.acme.internal/g2.crt
    OCSP - URI:http://ocsp.acme.internal`,
                    },
                    insight: "The pointer exists, but fetching it needs network access to an internal PKI host — which this client, in a different segment, does not have.",
                  },
                ),
                step(
                  "Check the trust anchor separately from the chain",
                  "Missing intermediate and untrusted root are different failures with different fixes. Supply the intermediate manually and see what the error becomes.",
                  {
                    evidence: {
                      label: "With the intermediate supplied",
                      code: `openssl verify -untrusted g2.crt -CAfile /etc/ssl/certs/ca-certificates.crt leaf.crt

leaf.crt: CN = api.internal
error 2 at 2 depth lookup: unable to get issuer certificate`,
                    },
                    insight: "The error moved from depth 0 to depth 2. The intermediate is now fine; the private root is not in the client's trust store.",
                  },
                ),
                step(
                  "Confirm the name and validity while you are here",
                  "Two failures often hide a third. Check the subject alternative names and dates before declaring the diagnosis complete — hostname mismatch produces a similar user-visible symptom.",
                  {
                    evidence: {
                      label: "Leaf details",
                      code: `Not Before: 2026-03-01  Not After: 2027-03-01
X509v3 Subject Alternative Name:
    DNS:api.internal, DNS:api-v2.internal`,
                    },
                    insight: "Dates are fine and the name matches. Two problems, not three.",
                  },
                ),
                step(
                  "Fix both, in the right places",
                  "Configure the server to present the full chain — that is a server misconfiguration, and it will bite every cold client. Separately, distribute the internal root to the client's trust store, which is a provisioning gap. Fixing only one leaves the failure intermittent, which is far harder to diagnose next time.",
                  {
                    insight: "'It works in my browser' almost always means an intermediate was cached. Test with a cold client before believing a chain is correct.",
                  },
                ),
              ],
            ),''')

# ── Threat intelligence ────────────────────────────────────────────────────

add("threat-intelligence", "Mapping to ATT&CK", '''
            diagram(
              "An intrusion report, mapped technique by technique",
              "Mapping is only useful if each stage points at something you could detect or prevent. Read each node as a question: would we have seen this?",
              [
                stage("Spearphishing attachment", "T1566.001", "A macro-enabled document reaches three finance mailboxes. Detectable at the mail gateway by attachment type and sender reputation; preventable by disabling macros from the internet."),
                stage("User execution", "T1204.002", "One recipient enables content. The only control left at this point is the endpoint, which is why the earlier stages matter so much more."),
                stage("Command and scripting interpreter", "T1059.001", "The macro spawns PowerShell with an encoded command. Parent-child telemetry catches this cleanly — Office spawning an interpreter has almost no legitimate use."),
                stage("Ingress tool transfer", "T1105", "A second-stage implant is fetched over HTTPS from a three-week-old domain. Domain age and destination reputation are the signal; the traffic itself looks ordinary."),
                stage("OS credential dumping", "T1003.001", "LSASS is accessed for credential material. Handle-access telemetry with a process filter is one of the highest-value detections available on Windows."),
                stage("Remote services", "T1021.002", "Harvested credentials are used for SMB admin shares to two servers. Look for a workstation authenticating to servers it has never touched before."),
                stage("Exfiltration to cloud storage", "T1567.002", "Data leaves via a consumer file-sharing service. Volume asymmetry on a workstation is the practical detection, since the destination is legitimate."),
              ],
            ),''')

add("threat-intelligence", "Attribution", '''
            walkthrough(
              "Building an attribution assessment you can defend",
              "Two intrusions share a malware family. Work through what that supports, what it does not, and how to write the difference down.",
              [
                step(
                  "List the observations before interpreting any of them",
                  "Separate what you saw from what you concluded. Mixing the two is how a weak assessment ends up sounding certain.",
                  {
                    evidence: {
                      label: "Shared characteristics",
                      code: `- Same loader family (PlugX variant), compiled 4 days apart
- Both used a legitimate signed binary for DLL sideloading
- C2 infrastructure in the same /24, registered via same registrar
- Both targeted the manufacturing sector, 6 weeks apart
- Operator activity clusters 01:00-09:00 UTC in both cases`,
                    },
                    insight: "Five overlaps. Each has a very different evidential weight, and treating them as five equal points is the core error.",
                  },
                ),
                step(
                  "Discount what is commodity or coincidental",
                  "Malware families are shared, sold and stolen. Sector targeting is a function of what is profitable. Neither narrows the field much on its own.",
                  {
                    evidence: {
                      label: "Weight assessment",
                      code: `Loader family      LOW    — PlugX used by many groups, builder leaked
Sector overlap     LOW    — manufacturing broadly targeted
Working hours      LOW    — consistent with a large timezone band
Sideloading TTP    MEDIUM — common technique, specific host binary less so
Infrastructure     MEDIUM — same /24 and registrar is a real link`,
                    },
                    insight: "Nothing here is high confidence alone. That is the normal state of attribution evidence, not a failure of collection.",
                  },
                ),
                step(
                  "Look for the details that are expensive to fake",
                  "Operational habits — the specific staging directory, a typo in a hardcoded path, the order operations are performed in — are harder to copy than tooling, because they are unconscious.",
                  {
                    evidence: {
                      label: "Operational detail",
                      code: `Both intrusions:
  staged to C:\\\\Windows\\\\Temp\\\\vmware_tmp\\\\ (directory does not exist by default)
  archived with the same non-default rar switches: -m5 -v200m -hp
  disabled Defender via the same three registry writes, same order`,
                    },
                    insight: "A directory name that must be created, identical archive switches, and an identical sequence of registry writes. This is the strongest link in the set.",
                  },
                ),
                step(
                  "State the assessment at the right level of specificity",
                  "There are three separable claims: same malware, same operator, same sponsor. The evidence supports them to very different degrees, and collapsing them is what makes attribution reporting untrustworthy.",
                  {
                    evidence: {
                      label: "Assessment",
                      code: `Same tooling:   HIGH confidence
Same operator:  MODERATE confidence  (tradecraft overlap, infra proximity)
Same sponsor:   LOW confidence       (no evidence bearing on this)`,
                    },
                    insight: "The third line is the one a reader will assume you meant if you do not write it. Say it explicitly, even though it is the weakest.",
                  },
                ),
                step(
                  "Write down what would change your mind",
                  "An assessment without falsifiers is an opinion. Naming the observation that would overturn it makes the reasoning auditable, and gives collection something specific to look for.",
                  {
                    insight: "Here: evidence that the staging directory and rar switches appear in a public playbook or leaked toolkit would drop 'same operator' to LOW immediately.",
                  },
                ),
              ],
            ),''')

add("threat-intelligence", "Indicators and their lifespan", '''
            terminal(
              "Checking whether a feed is still worth ingesting",
              "analyst@ti-box",
              [
                note("A feed supplies 40,000 indicators. The question is not how many — it is how many are still true, and whether any ever matched."),
                cmd("wc -l feed_ips.txt && head -3 feed_ips.txt"),
                out(`40218 feed_ips.txt
185.244.25.171,2024-11-02,c2
91.203.44.18,2025-01-17,c2
45.9.148.99,2023-06-30,scanner`),
                note("First check the age distribution. An indicator's usefulness decays fast, and the decay rate differs enormously by type."),
                cmd("awk -F, '{print substr($2,1,4)}' feed_ips.txt | sort | uniq -c | sort -k2"),
                out(`   9114 2023
  18402 2024
  11288 2025
    414 2026`),
                note("Two-thirds of this feed predates 2025. IP addresses get reassigned — an address that hosted C2 in 2023 is very likely someone's mail server now."),
                cmd("awk -F, '$2 < \\"2025-01-01\\"' feed_ips.txt | ti-check --resolve-current | head -4"),
                out(`185.244.25.171  now: unassigned, no PTR
45.9.148.99     now: shared hosting, 812 domains
203.0.113.44    now: CDN edge node  <-- blocking this would break traffic
198.51.100.7    now: corporate mail relay  <-- blocking this would break mail`),
                note("Two of four old indicators now point at infrastructure you would damage yourself by blocking. This is the concrete cost of stale intelligence."),
                note("Now the question that actually decides renewal: did any of it ever fire?"),
                cmd("siem-query --index proxy,firewall --last 180d --match-file feed_ips.txt --summary"),
                out(`Indicators matched at least once:      11 / 40218  (0.03%)
Total matches:                        847
  of which from indicators <90d old:  831
  of which from indicators >1y old:    16 (all 2 addresses, both CDN)`),
                note("Eleven indicators out of forty thousand ever matched, and the recent ones did nearly all the work. The old bulk is not neutral — it generated sixteen false positives."),
                note("The decision is not 'drop the feed'. It is 'ingest indicators newer than ninety days and expire the rest automatically'. Volume was never the value."),
              ],
            ),''')


# ── Insertion ──────────────────────────────────────────────────────────────

HELPERS = ["terminal", "cmd", "out", "note", "walkthrough", "step", "diagram", "stage"]


def ensure_imports(source, needed):
    """Extend the ./blocks import with any helper this file now uses."""
    match = re.search(r'import \{([^}]*)\} from "\./blocks";', source)
    if not match:
        raise SystemExit("could not find the blocks import")

    existing = [n.strip() for n in match.group(1).split(",") if n.strip()]
    names = list(existing)
    for helper in needed:
        if helper not in names:
            names.append(helper)

    if names == existing:
        return source

    # Wrap so the line stays readable rather than running to 200 characters.
    joined = ", ".join(names)
    replacement = 'import {\n  ' + joined.replace("type Course, ", "type Course,\n  ") + ',\n} from "./blocks";'
    return source[: match.start()] + replacement + source[match.end() :]


def insert_block(source, lesson_title, block_src):
    """Place a block immediately before the lesson's closing check()."""
    title_line = '          "%s",' % lesson_title
    at = source.find(title_line)
    if at == -1:
        return source, "lesson title not found"

    check_at = source.find("\n            check(", at)
    if check_at == -1:
        return source, "no closing check() found"

    # Guard against a second run duplicating content.
    if block_src.strip().split("(")[0].strip() in source[at:check_at]:
        return source, "already present"

    return source[: check_at + 1] + block_src + source[check_at + 1 :], None


def main():
    total = 0
    for course, lessons in BLOCKS.items():
        path = os.path.join(ROOT, course + ".ts")
        with io.open(path, encoding="utf-8") as fh:
            source = fh.read()

        used = set()
        for lesson_title, block_src in lessons.items():
            source, err = insert_block(source, lesson_title, block_src)
            if err:
                print("  SKIP %-28s %s — %s" % (course, lesson_title, err))
                continue
            for helper in HELPERS:
                if re.search(r"\b%s\(" % helper, block_src):
                    used.add(helper)
            print("  ok   %-28s %s" % (course, lesson_title))
            total += 1

        if used:
            source = ensure_imports(source, sorted(used))

        with io.open(path, "w", encoding="utf-8") as fh:
            fh.write(source)

    print("\n%d block(s) inserted" % total)
    return 0


if __name__ == "__main__":
    sys.exit(main())
