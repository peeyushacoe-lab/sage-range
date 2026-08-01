/**
 * Digital Forensics Essentials — full lesson content.
 */

import { type Course, lesson, text, code, callout, check } from "./blocks";

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
