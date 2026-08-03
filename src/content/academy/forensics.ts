/**
 * Digital Forensics Essentials — full lesson content.
 */

import {
  type Course, lesson, text, code, callout, check, cmd, note, out, step, terminal, walkthrough, practice,
} from "./blocks";

export const FORENSICS: Course = {
  slug: "digital-forensics-essentials",
  modules: [
    {
      title: "Acquisition",
      description: "Getting the evidence without changing it.",
      lessons: [
        lesson(
          "Order of volatility",
          "Why memory comes before disk, and what powering off costs you.",
          10,
          [
            text(
              "Evidence disappears at different rates. Some of it survives a reboot; some of it is gone the instant power is cut. **Order of volatility** simply means collecting the fastest-disappearing evidence first.\n\nThe practical ranking, most volatile first: CPU registers and cache, memory, network state, running processes, disk, then anything archived elsewhere.",
            ),
            text(
              "Memory is where the interesting material lives during an intrusion. Injected code that never touched disk, decrypted configuration, credentials in cleartext, active network connections, and the command lines of processes that have since exited — none of that is on the disk image.",
            ),
            callout(
              "danger",
              "Pulling the plug is a decision, not a default",
              "Powering off stops encryption or exfiltration immediately, and destroys every memory-resident artefact in the same instant. Sometimes that trade is right. It should be made deliberately, not reflexively.",
            ),
            code(
              `Survives power loss        Lost at power loss
─────────────────────      ─────────────────────
Disk contents              Injected code in memory
Event logs (if written)    Decrypted keys
Registry hives             Active network connections
Prefetch, Amcache          Process list and command lines
                           Clipboard, unsaved buffers`,
              "text",
            ),
            check(
              "A host is actively encrypting a file share. Which action best balances containment and evidence?",
              [
                "Power it off immediately",
                "Network-isolate it, keeping it powered on, then capture memory",
                "Run antivirus and wait",
                "Image the disk before doing anything",
              ],
              1,
              "Isolation stops the spread while memory remains available for capture. Powering off destroys volatile evidence; imaging first lets encryption continue.",
            ),
          ],
        ),
        lesson(
          "Imaging and hashing",
          "Demonstrating that a copy is unchanged since collection.",
          8,
          [
            text(
              "A forensic image is a bit-for-bit copy, including unallocated space and slack — the parts a normal file copy silently omits, and often where deleted material survives.\n\nHashing at acquisition is what makes the copy defensible. Hash the source, hash the image, and record both. Any later challenge that the evidence was altered can be answered by re-hashing.",
            ),
            code(
              `Acquisition record
  Source device   : /dev/sdb  (Samsung 860 EVO, S/N ...)
  Acquired by     : A. Patel
  Started         : 2026-08-02 09:14 UTC
  Image           : case-2026-0812.dd
  SHA-256 source  : 4c1f9a2e7d3b...
  SHA-256 image   : 4c1f9a2e7d3b...   ← match
  Write blocker   : Tableau T35u, verified`,
              "bash",
              "The record matters as much as the image.",
            ),
            callout(
              "important",
              "Write blockers exist because mounting writes",
              "Attaching a disk to a running system can update timestamps and journals before you touch anything. A hardware write blocker removes the argument entirely.",
            ),

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
            ),

            practice(
              "You have just acquired sdb.raw and recorded the acquisition hash. Write the command that independently verifies the image file on disk still matches it.",
              ["sha256sum"],
              "sha256sum /evi/case-2026-114/sdb.raw",
              "The point is a second, independent computation — the acquisition tool hashed what it read from the wire, and this hashes what landed on disk. Two code paths agreeing is what makes the image defensible.",
              {
                forbids: ["md5sum"],
              },
            ),
            check(
              "Why hash an image at the moment of acquisition rather than later?",
              [
                "It compresses the image",
                "It establishes a verifiable point from which any change can be detected",
                "It is required to mount the image",
                "It speeds up analysis",
              ],
              1,
              "The hash is a baseline. Without one taken at acquisition, there is no way to demonstrate the evidence is in the state it was collected in.",
            ),
          ],
        ),
        lesson(
          "Live response trade-offs",
          "Collecting from a system that cannot be taken offline.",
          8,
          [
            text(
              "Sometimes the system is a production database that cannot be stopped, or a domain controller the business depends on. Live response accepts a compromise: you will change the system slightly by running tools on it, in exchange for getting evidence at all.\n\nThe discipline is to make those changes **known and minimal**. Use statically linked tools from removable media, record exactly what you ran and when, and write output off the host.",
            ),
            callout(
              "tip",
              "Document your own footprint",
              "You will create processes, network connections and file handles. An analyst reading the evidence later needs to distinguish yours from the attacker's — so write down what you ran, from where, and at what time.",
            ),
            code(
              `Live collection order, tools run from removable media

  1. record the collection clock
  2. netstat -anob      active connections and owning processes
  3. tasklist /v        processes with command lines
  4. arp -a             recent layer-2 neighbours
  5. memory capture     full physical memory
  6. logs, hives        least volatile

Output written to an external volume, never back to the host.`,
              "bash",
              "Volatile first, and nothing written to the evidence.",
            ),
            text(
              "Writing output to the host being examined overwrites unallocated space, which may be exactly where deleted material still survives. Collect to removable media or across the network, and record which you used and when.",
            ),
            check(
              "What is the main trade-off in live response?",
              [
                "It takes longer than imaging",
                "It changes the system slightly in exchange for capturing volatile evidence",
                "It cannot capture memory",
                "It requires the system to be offline",
              ],
              1,
              "Any interaction alters state. Live response accepts that in exchange for volatile evidence that would otherwise be lost, and manages it by documenting the footprint.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Windows artefacts",
      description: "Which artefact answers which question, and the limits of each.",
      lessons: [
        lesson(
          "Evidence of execution",
          "Prefetch, Amcache and ShimCache — and what each does not prove.",
          10,
          [
            text(
              "'Did this binary run?' is one of the most common forensic questions, and Windows answers it several times over in different places — each with different coverage and different caveats.",
            ),
            code(
              `Artefact    Evidences                    Caveat
─────────   ──────────────────────────   ──────────────────────────────
Prefetch    Execution, run count, last   Often disabled on servers
            eight run times
Amcache     Presence, SHA-1, install     Presence is not execution
ShimCache   Presence in a path           Entry can exist without a run
UserAssist  GUI launches by a user       Only interactive launches
Sysmon EID1 Execution with full command  Only if Sysmon is deployed
            line and parent`,
              "text",
            ),
            text(
              "The distinction between **presence** and **execution** is where conclusions most often go wrong. ShimCache records that Windows saw a file at a path — enumerating a directory can create an entry. Reporting that as 'the binary executed' is an overstatement that a competent reviewer will find.",
            ),
            callout(
              "warning",
              "Corroborate before concluding",
              "One artefact is a lead. Two independent artefacts agreeing is a finding. State which you have.",
            ),

            walkthrough(
              "Proving a binary ran, and when",
              "Someone claims a tool was never executed on this host. No single artefact settles that. Four weak signals, agreeing, do.",
              [
                step(
                  "Prefetch: did Windows prepare to run it?",
                  "A prefetch file exists because the loader saw the executable start. Its embedded run count and last-run timestamps are among the most direct execution evidence Windows keeps.",
                  {
                    evidence: {
                      label: "C:\\Windows\\Prefetch\\",
                      code: `RCLONE.EXE-9F2A11C4.pf
  run count:  3
  last run:   2026-07-29 02:14:51
  prior runs: 2026-07-28 23:40:02, 2026-07-28 23:07:19
  loaded from: \\VOLUME{01d9...}\\USERS\\SVC-BACKUP\\APPDATA\\LOCAL\\TEMP\\`,
                    },
                    insight: "Three executions, and the path is a user temp directory — not where an administrator installs a legitimate transfer tool.",
                  },
                ),
                step(
                  "ShimCache: was it present, and where?",
                  "AppCompatCache records the path and file modification time of binaries the shim engine evaluated. It is often called execution evidence; it is closer to presence evidence, which is a distinction worth being exact about.",
                  {
                    evidence: {
                      label: "SYSTEM\\CurrentControlSet\\Control\\Session Manager\\AppCompatCache",
                      code: `C:\\Users\\svc-backup\\AppData\\Local\\Temp\\rclone.exe
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
            ),
            check(
              "A binary appears in ShimCache but not in Prefetch or Amcache. What is the safest conclusion?",
              [
                "The binary definitely executed",
                "Windows encountered the file at that path; execution is not established",
                "The binary was deleted",
                "Prefetch was cleared by the attacker",
              ],
              1,
              "ShimCache evidences that the file was seen, which directory enumeration alone can cause. Without corroboration, execution is unproven.",
            ),
          ],
        ),
        lesson(
          "Registry as a record",
          "Persistence, USB history and user activity.",
          8,
          [
            text(
              "The registry is a database of configuration that also happens to be an excellent record of what has happened on a system. Persistence mechanisms have to be written somewhere, and most of them are written here.",
            ),
            code(
              `Persistence
  HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
  HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
  HKLM\\SYSTEM\\CurrentControlSet\\Services            (service install)

Device history
  HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR        (serial numbers)

User activity
  NTUSER.DAT → RecentDocs, TypedPaths, RunMRU`,
              "text",
            ),
            text(
              "Registry keys carry **LastWrite** timestamps. A Run key whose last write is the afternoon of the intrusion, in an estate where every other value dates from the build, is a strong signal on its own.",
            ),
            check(
              "Which registry location would evidence that a specific USB device was connected?",
              [
                "HKLM\\SOFTWARE\\...\\CurrentVersion\\Run",
                "HKLM\\SYSTEM\\CurrentControlSet\\Enum\\USBSTOR",
                "NTUSER.DAT\\RecentDocs",
                "HKLM\\SYSTEM\\CurrentControlSet\\Services",
              ],
              1,
              "USBSTOR records connected mass-storage devices including serial numbers, which is what ties a specific physical device to the host.",
            ),
          ],
        ),
        lesson(
          "Browser and file system artefacts",
          "Reconstructing user actions from ordinary usage traces.",
          8,
          [
            text(
              "Browsers keep extensive records: history, downloads, cache, cookies and session data. In insider cases this is frequently the core of the evidence, because the activity looks like ordinary work until you read it in sequence.\n\nOn the file system, the **MFT** on NTFS records every file including deleted ones whose entries have not yet been reused — often the only remaining trace of something removed.",
            ),
            callout(
              "info",
              "Download records outlive the file",
              "A browser's download history persists after the file itself is deleted. In exfiltration and insider cases this is regularly the artefact that establishes what was taken.",
            ),
            code(
              `Chrome   History      visits, typed URLs, transition types
         Downloads    source URL, target path, size, timestamps
         Cache        response bodies, often outliving deletion

NTFS     $MFT         every file, including many deleted entries
         $UsnJrnl     rolling record of creations, deletions, renames`,
              "text",
            ),
            text(
              "The change journal is frequently the most useful of these in exfiltration cases. It records creations, deletions and renames with timestamps, so it can evidence that a file existed and was removed even after both the file and its directory entry are gone.",
            ),
            check(
              "A user deleted a downloaded file and emptied the Recycle Bin. What is most likely to still evidence the download?",
              [
                "The file contents in unallocated space only",
                "The browser's download history and the MFT entry",
                "Nothing — the evidence is gone",
                "The Prefetch entry for the browser",
              ],
              1,
              "Download history is stored separately from the file, and the MFT entry commonly survives deletion until reused. Prefetch shows only that the browser ran.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Timelines and anti-forensics",
      description: "Assembling a narrative, and spotting attempts to break it.",
      lessons: [
        lesson(
          "Building a super timeline",
          "Merging sources without drowning in them.",
          10,
          [
            text(
              "A super timeline merges every timestamped artefact — file system, registry, events, browser — into one chronological view. It is the most powerful technique in forensics and the easiest to drown in: a single workstation can produce millions of entries.\n\nThe discipline is to **anchor and window**. Find one event you are confident about, then examine a narrow period around it. Expand only when that window is exhausted.",
            ),
            code(
              `08:43:12  FILE     Invoice_4471.docm created in Downloads
08:43:44  EVENT    WINWORD.EXE started (Sysmon 1)
08:44:02  EVENT    powershell.exe, parent WINWORD.EXE   ← anchor
08:44:31  NET      Connection to 45.87.212.9:443
08:45:02  FILE     svchost_helper.exe created in Temp
08:45:19  REG      Run key written: "SystemHealthCheck"`,
              "text",
              "Six entries, from millions, telling the whole story.",
            ),
            callout(
              "tip",
              "Mind the timezones",
              "Artefacts record in different zones — some UTC, some local, some both. Normalise everything to UTC before merging, or you will construct a sequence that never happened.",
            ),

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
                cmd("psort.py -o l2tcsv -w case114.csv case114.plaso 'date > \"2026-07-28 00:00:00\" AND date < \"2026-07-30 00:00:00\"'"),
                out(`Filter string: date > "2026-07-28 00:00:00" AND date < "2026-07-30 00:00:00"
Events filtered : 4 798 002
Events written  :    14 653
Processing completed in 2m41s.`),
                note("Two days around the suspected activity leaves fourteen thousand events. Still a lot, but now it is a day of reading rather than a month."),
                cmd("grep -iE 'prefetch|\\.pf$|EventLog:4624|EventLog:4688' case114.csv | head -6"),
                out(`2026-07-28T22:51:04Z,FILE,NTFS $MFT,...,rclone.exe created in \\Users\\svc-backup\\AppData\\Local\\Temp
2026-07-28T23:07:19Z,PE,Prefetch,...,RCLONE.EXE-9F2A11C4.pf run 1
2026-07-28T23:07:21Z,LOG,WinEVTX,...,4688 New Process rclone.exe parent cmd.exe
2026-07-28T23:40:02Z,PE,Prefetch,...,RCLONE.EXE-9F2A11C4.pf run 2
2026-07-29T02:14:51Z,PE,Prefetch,...,RCLONE.EXE-9F2A11C4.pf run 3
2026-07-29T02:41:33Z,FILE,NTFS $MFT,...,rclone.exe deleted`),
                note("Dropped at 22:51, run three times, deleted at 02:41. The sequence is the finding — no single line above would have been enough."),
              ],
            ),
            check(
              "What is the most effective way to approach a super timeline with millions of entries?",
              [
                "Read chronologically from the earliest entry",
                "Anchor on a known event and examine a narrow window around it",
                "Filter to only file system events",
                "Sort by artefact type",
              ],
              1,
              "Anchoring turns an unbounded problem into a bounded one. Reading chronologically from the start almost never reaches the relevant period.",
            ),
          ],
        ),
        lesson(
          "Timestomping",
          "Why $STANDARD_INFORMATION and $FILE_NAME disagreeing is itself a finding.",
          8,
          [
            text(
              "Attackers alter timestamps to hide files among system binaries. On NTFS each file carries two sets: **$STANDARD_INFORMATION**, which the Windows API can modify, and **$FILE_NAME**, which normally only the kernel updates.\n\nMost timestomping tools change only the first. The disagreement between them is the tell.",
            ),
            code(
              `svchost_helper.exe

$STANDARD_INFORMATION   Created: 2019-03-11 04:22:10
$FILE_NAME              Created: 2026-08-02 08:45:02   ← actual

A file cannot be created seven years before it was created.`,
              "text",
            ),
            callout(
              "important",
              "Sub-second precision is another tell",
              "Genuine NTFS timestamps carry 100-nanosecond precision. Timestamps ending in a run of zeros were usually set by a tool rather than the file system.",
            ),
            check(
              "A file's $STANDARD_INFORMATION timestamps predate its $FILE_NAME timestamps by years. What does this indicate?",
              [
                "Normal file copying between volumes",
                "Timestomping — $SI was modified while $FN retains the true value",
                "Disk corruption",
                "The file was restored from backup",
              ],
              1,
              "$SI is modifiable through the API; $FN generally is not. A large disagreement in that direction is deliberate manipulation.",
            ),
          ],
        ),
        lesson(
          "Log deletion and gaps",
          "Treating an absence as evidence in its own right.",
          8,
          [
            text(
              "Clearing the Windows Security log generates **event 1102**, which records that the log was cleared. Attackers accept this because the alternative — leaving the log — is worse for them.\n\nMore subtly, an unexplained gap is itself evidence. A log that runs continuously and then contains nothing for forty minutes during the period of interest is telling you something, even though it contains nothing.",
            ),
            callout(
              "warning",
              "Do not report a gap as 'no activity'",
              "There is a large difference between 'we looked and found nothing' and 'we had no visibility during that window'. Conflating them in a report is how a scope conclusion gets overturned later.",
            ),
            code(
              `Windows Security log
  1102   The audit log was cleared        clearing is itself audited
  104    The System log file was cleared

Sysmon
  service stopped, or configuration replaced — check for both`,
              "text",
            ),
            text(
              "Attackers increasingly avoid clearing logs precisely because it is so loud, and instead stop the collector or quietly narrow its configuration. A log that continues cleanly but stops recording one *category* of event is the subtler version of the same idea, and is easy to miss because the file itself looks perfectly healthy.",
            ),

            practice(
              "Write the PowerShell command that returns every Security log entry recording that the log itself was cleared.",
              ["Get-WinEvent", "1102"],
              "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=1102}",
              "Clearing the Security log writes event 1102 before the clear takes effect, so the destruction records itself. The absence of everything else is the finding, and 1102 is what proves the absence was deliberate.",
              {
                forbids: ["4624"],
              },
            ),
            check(
              "Security log entries stop for 40 minutes during a suspected intrusion, then resume. How should the report characterise this?",
              [
                "As a period of no malicious activity",
                "As a visibility gap, noting that absence of logs is not absence of activity",
                "As evidence the system was powered off",
                "As a normal logging behaviour",
              ],
              1,
              "The only defensible statement is that visibility was absent. Anything stronger asserts a conclusion the evidence does not support.",
            ),
          ],
        ),
      ],
    },
  ],
};
