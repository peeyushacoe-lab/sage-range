/**
 * SOC Analyst Fundamentals — full lesson content.
 *
 * This course averaged 3.0 blocks per lesson, the thinnest in the catalogue,
 * for the role most learners actually enter the field through. Rewritten to
 * teach the work rather than describe it: what a shift looks like, how a log
 * line is read, and how an alert becomes a verdict you can defend.
 *
 * Titles must match scripts/seed-academy/course-2-soc.ts exactly.
 */

import {
  type Course, lesson, text, code, callout, check,
  terminal, cmd, out, note, walkthrough, step, diagram, stage, practice,
} from "./blocks";

export const SOC_ANALYST: Course = {
  slug: "soc-analyst-fundamentals",
  modules: [
    {
      title: "Introduction to the SOC",
      description: "What a Security Operations Centre actually does.",
      lessons: [
        lesson(
          "What is a SOC?",
          "The function a security operations centre performs, and the two numbers everything in it is measured against.",
          7,
          [
            text(
              "A Security Operations Centre is the team responsible for detecting, investigating and responding to security events. It is a function rather than a room — plenty of effective SOCs are six people spread across three time zones with no wall of screens anywhere.\n\nWhat defines it is continuity. Attacks do not respect business hours, and the value of a SOC comes from someone competent looking at the right thing quickly, at three in the morning as much as at three in the afternoon.",
            ),
            text(
              "Two measurements govern almost everything a SOC does.\n\n**Mean time to detect (MTTD)** — how long between an attacker acting and someone noticing. **Mean time to respond (MTTR)** — how long between noticing and the harm being stopped. Every process, tool and staffing decision is ultimately an argument about reducing one of these two numbers.",
            ),
            callout(
              "important",
              "Dwell time is the number that matters most",
              "The gap between compromise and detection is where all the damage accumulates. An intrusion caught in an hour is an incident; the same intrusion caught in six months is a breach with regulatory consequences. Almost everything else a SOC does is instrumental to shortening that gap.",
            ),
            text(
              "It is worth being honest about what the work is actually like. The overwhelming majority of alerts are not attacks — they are a backup job that looks like exfiltration, an administrator whose script resembles an attacker's, a scanner your own team is running.\n\nThe skill is not spotting the obvious intrusion. It is working through high volumes of ambiguity quickly without becoming so numb that the real one goes past unread.",
            ),
            check(
              "A SOC reduces its mean time to detect from 20 days to 6 hours but leaves response time unchanged. Why is this still a major improvement?",
              [
                "It has no real effect until response time also improves",
                "Damage accumulates throughout the undetected period, so shortening it limits how far an intrusion progresses before anyone acts",
                "Regulators only measure detection time",
                "Faster detection automatically reduces alert volume",
              ],
              1,
              "An attacker with twenty days establishes persistence, escalates, moves laterally and stages data. One with six hours has usually managed the first foothold and little else — the response begins against a far smaller problem.",
            ),
          ],
        ),
        lesson(
          "SOC Tiers & Roles",
          "How the work is divided, why escalation exists, and what each tier is genuinely accountable for.",
          8,
          [
            text(
              "SOCs divide work into tiers so that the most experienced people are not consumed by the highest-volume tasks. The structure varies, but the logic is consistent: triage at the front, investigation behind it, and specialist functions alongside.",
            ),
            code(
              `Tier / role           Owns                              Escalates when
───────────────────   ───────────────────────────────   ─────────────────────
Tier 1 — triage       First look at every alert.        Cannot be explained
                      Close the explainable, escalate   as benign with
                      the rest with what they found     confidence
Tier 2 — analyst      Full investigation. Scope,        Confirmed incident
                      timeline, verdict                 needing containment
Tier 3 — IR / hunt    Response, complex intrusions,     Rarely — this is the
                      proactive hunting                 end of the line
Detection engineer    Writes and tunes the rules that   n/a — receives the
                      generate the alerts               feedback loop`,
              "text",
              "The escalation column is the important one. Each tier is defined by what it hands on.",
            ),
            text(
              "The most misunderstood part is what Tier 1 is accountable for. It is **not** getting the verdict right — with a few minutes per alert, that is not a reasonable expectation.\n\nIt is making a defensible decision quickly and passing on enough context that the next person does not start from nothing. A good escalation says what was checked, what was found and what the analyst could not rule out. A bad one forwards the alert unchanged.",
            ),
            callout(
              "tip",
              "The feedback loop is what separates good SOCs from busy ones",
              "When Tier 1 closes the same false positive forty times a week, that is a detection engineering problem, not a staffing problem. SOCs without a route from triage back to rule tuning slowly drown in their own alerts, and the people who notice first are the ones who leave.",
            ),
            check(
              "A Tier 1 analyst spends 40 minutes on one alert and concludes correctly that it is benign. What is the concern?",
              [
                "Reaching the correct conclusion is not a Tier 1 responsibility",
                "The time cost — while they investigated one alert, the queue grew, and escalating after ten minutes would have served the SOC better",
                "They should have escalated regardless of what they found",
                "Nothing; thorough triage is always correct",
              ],
              1,
              "Tier 1's constraint is throughput. Forty minutes on one benign alert is forty minutes the queue was unattended, and the tiering exists precisely so deep investigation happens where there is time for it.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Security Monitoring",
      description: "What we watch, and why.",
      lessons: [
        lesson(
          "What We Monitor",
          "The three domains that generate security telemetry, and what each one can and cannot tell you.",
          7,
          [
            text(
              "Security monitoring draws from three broad sources, and they answer different questions. Knowing which source answers which question is most of the skill in knowing where to look first.\n\n**Endpoints** tell you what ran. **Networks** tell you what was communicated. **Identity** tells you who did it.",
            ),
            code(
              `Domain     Answers                        Blind to
────────   ────────────────────────────   ─────────────────────────────
Endpoint   What executed, what changed,   Anything on a device with no
           parent-child relationships     agent installed
Network    Who talked to whom, volumes,   Payload of encrypted sessions;
           destinations, timing           activity that never leaves host
Identity   Who authenticated, from        What the account did after
           where, to what, when           authenticating
Cloud      Which API calls were made,     Anything inside a VM or
           by which credential            container`,
              "text",
              "No single domain is sufficient. Investigations move between them constantly.",
            ),
            text(
              "The blind spots are the reason you need more than one. An attacker operating entirely inside a host generates no network signal. One who steals a laptop with no agent installed generates no endpoint signal. One using stolen but valid credentials generates identity events that look correct in every respect.\n\nThis is why the strongest investigations correlate across domains: an endpoint event and a network event agreeing about the same minute is far harder to explain away than either alone.",
            ),
            callout(
              "warning",
              "Coverage gaps are silent",
              "A log source that stops sending produces no alerts, which looks exactly like a quiet period. Monitoring that your monitoring is working — alerting on the *absence* of expected telemetry — catches an entire class of problem that is otherwise invisible until an incident reveals it.",
            ),
            check(
              "An attacker uses stolen valid credentials to log in and read files during working hours. Which domain is least likely to flag this on its own?",
              [
                "Identity, because the authentication is legitimate in every technical respect",
                "Endpoint, because no process was created",
                "Network, because no traffic was generated",
                "Cloud, because no API calls occurred",
              ],
              0,
              "The authentication succeeds with a valid credential from a plausible time, so identity telemetry records something entirely normal. Detecting this needs behavioural context — is this account doing what it usually does — rather than the authentication event itself.",
            ),
          ],
        ),
        lesson(
          "Baselines & Anomalies",
          "Why you cannot recognise abnormal without first defining normal, and how baselines fail.",
          7,
          [
            text(
              "Almost all detection is comparison. An event is interesting because it differs from what usually happens — which means the quality of your detection is limited by the quality of your understanding of 'usual'.\n\nThis sounds obvious and is routinely skipped. Teams deploy rules written for someone else's environment and then wonder why the alerts are meaningless.",
            ),
            text(
              "A useful baseline is specific and dimensional. Not 'this server is busy at night' but *which* accounts authenticate to it, from which hosts, at which hours, using which protocols, moving how much data.\n\nEach dimension is a place an attacker can differ from normal, and they rarely differ in only one.",
            ),
            code(
              `Dimension            Normal for WKS-FIN-04        Attacker deviation
──────────────────   ──────────────────────────   ──────────────────────
Logon hours          07:30 – 18:00 weekdays       02:14 Sunday
Authenticates to     FS-FIN-01, print-02          DC-01, FS-HR-01
Protocols used       SMB, HTTPS                   WinRM, RDP
Outbound volume      50 MB/day, mostly inbound    4.1 GB outbound
Processes            Office, Chrome, Teams        powershell, rclone`,
              "text",
              "One deviation is a question. Five at once is an answer.",
            ),
            callout(
              "danger",
              "A baseline built during a compromise bakes the compromise in",
              "Automatic baselining learns whatever it observes. If the learning window includes attacker activity, that activity becomes 'normal' and stops generating alerts permanently. This is a known technique — move slowly enough during the learning period and the tooling adapts to you.",
            ),
            check(
              "A workstation's baseline is built automatically over 30 days. An attacker had access throughout. What has happened?",
              [
                "Nothing — anomaly detection compensates for this automatically",
                "The attacker's activity is now part of 'normal', so the behaviour it learned will never alert",
                "The baseline will be more accurate for having seen varied activity",
                "Only volume metrics are affected",
              ],
              1,
              "The system learns what it observes without any notion of whether it should have been happening. Baselines built from live data need either a known-clean window or human review, which is exactly the step usually skipped.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Logs Fundamentals",
      description: "The raw evidence of everything.",
      lessons: [
        lesson(
          "Reading Logs",
          "The anatomy of a log entry, the fields that carry meaning, and the traps in timestamps.",
          9,
          [
            text(
              "A log entry is a claim that something happened. Reading one well means knowing which parts are reliable, which are attacker-controlled, and what is missing.\n\nMost entries carry the same skeleton regardless of format: when, where, who, what, and the outcome. Finding those five in an unfamiliar format is the first thing to do with any new log source.",
            ),
            code(
              `2026-08-06T02:14:51.204Z  web-01  sshd[31882]:  Failed password for
invalid user admin from 185.244.25.171 port 51422 ssh2
└──────── when ────────┘  └where┘  └─ what ─┘   └──── who / outcome ────┘

WHEN     2026-08-06T02:14:51.204Z   ISO 8601, UTC, milliseconds
WHERE    web-01                      the host that produced the record
WHAT     sshd[31882]                 the service and its process id
WHO      185.244.25.171              source of the attempt
OUTCOME  Failed password             what the system decided`,
              "text",
              "Five questions. Every log format answers them somewhere.",
            ),
            text(
              "**Timestamps cause more wasted investigation than any other field.** Three problems recur.\n\nTime zones: one system logs UTC, another local time, and events that were simultaneous appear an hour apart. Clock drift: a host whose clock is wrong by minutes produces a timeline that is subtly and consistently misleading. Ingestion time versus event time: many platforms record when they received a log, not when the thing happened — and under load those differ substantially.",
            ),
            callout(
              "warning",
              "Some fields are attacker-controlled",
              "User agent strings, hostnames supplied by the client, and process names are all things an attacker can set to whatever they like. Treat them as claims rather than facts. Source IP and the outcome recorded by the system itself are much harder to forge.",
            ),
            practice(
              "From the log lines below, write a one-liner that prints the source addresses of failed SSH logins, with a count each, most frequent first.",
              ["grep", "uniq -c", "sort -rn"],
              `grep 'Failed password' auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn`,
              "Counting by source is the standard first cut on authentication logs. One failure is noise; four hundred from one address is a brute-force attempt, and the count is what turns individual lines into a finding.",
              {
                setup: {
                  label: "auth.log",
                  code: `Aug  6 02:14:51 web-01 sshd[31882]: Failed password for invalid user admin from 185.244.25.171 port 51422 ssh2
Aug  6 02:14:53 web-01 sshd[31884]: Failed password for invalid user root from 185.244.25.171 port 51424 ssh2
Aug  6 02:15:02 web-01 sshd[31890]: Accepted publickey for deploy from 10.20.4.15 port 44120 ssh2`,
                },
              },
            ),
            check(
              "Two systems record the same event 60 minutes apart. Both clocks are correct. What is the most likely cause?",
              [
                "One of the events is fabricated",
                "One system logs in UTC and the other in local time",
                "The event genuinely occurred twice",
                "Log compression altered the timestamp",
              ],
              1,
              "A whole-hour offset between correct clocks is almost always a time zone difference rather than drift, which tends to be irregular. Normalising everything to UTC at ingestion is the standard fix and removes a large category of confusion.",
            ),
          ],
        ),
        lesson(
          "Log Types & Sources",
          "Which log answers which question, and why knowing this is faster than searching everything.",
          7,
          [
            text(
              "An analyst who knows which log source answers a question moves several times faster than one who searches everything. The mapping is learnable and largely stable across environments.",
            ),
            code(
              `Question                              Look here first
───────────────────────────────────   ──────────────────────────────────
Did this binary run, and as who?      Endpoint process creation
                                      (Sysmon 1, Windows 4688)
Who logged in, from where?            Windows 4624/4625, Linux auth.log
Was a privileged group changed?       Windows 4728/4732, directory audit
Where did this host connect?          Firewall, proxy, Zeek conn.log
What name did it look up?             DNS resolver logs
Was a file shared publicly?           Cloud provider audit trail
Was a service installed?              Windows 7045, systemd journal
Was the log cleared?                  Windows 1102 — clearing logs itself`,
              "text",
              "Worth committing to memory. It is the difference between minutes and hours.",
            ),
            text(
              "Two of these deserve emphasis.\n\n**Process creation with command line** is the single highest-value endpoint source. It is not enabled by default on Windows and needs both an audit policy change and a registry setting to include the command line — without which you see that PowerShell ran but not what it was told to do, which is nearly useless.\n\n**Event 1102**, the log-clearing record, is written before the clear takes effect. The destruction records itself, which makes an otherwise invisible act into one of the strongest signals you can get.",
            ),
            callout(
              "info",
              "Default logging is designed for troubleshooting, not investigation",
              "Most platforms ship with enough logging to diagnose a crash and nowhere near enough to reconstruct an intrusion. Command-line capture, PowerShell script block logging and cloud data-plane events are all off by default, and all of them are the thing you will wish you had.",
            ),
            check(
              "You need to know whether a specific PowerShell command ran on a host last Tuesday. Which source answers it directly?",
              [
                "Firewall logs, filtered to that host",
                "Process creation events including the command line, if that capture was enabled",
                "The current process list on the host",
                "DNS resolver logs",
              ],
              1,
              "Process creation with command line is the only source that records both that PowerShell ran and what it was instructed to do. The conditional matters — without command-line capture enabled beforehand, the question cannot be answered retrospectively at all.",
            ),
          ],
        ),
        lesson(
          "Mini Assessment: Log Triage",
          "Work a set of raw log lines into a conclusion, in the order a real triage would happen.",
          8,
          [
            text(
              "This lesson is practice rather than instruction. Below is a set of log lines from a single host across twenty minutes. Read them before the walkthrough and decide what you think happened.\n\nThe skill being exercised is sequencing: no individual line here is conclusive, and the conclusion comes entirely from the order.",
            ),
            code(
              `02:09:51  sshd     Failed password for invalid user admin from 185.244.25.171
02:11:03  sshd     Failed password for invalid user oracle from 185.244.25.171
02:12:40  sshd     Failed password for invalid user deploy from 185.244.25.171
02:13:18  sshd     Accepted password for deploy from 185.244.25.171 port 51999
02:13:22  sudo     deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
02:14:02  kernel   [UFW ALLOW] OUT=eth0 DST=185.244.25.171 DPT=443 LEN=148
02:19:02  kernel   [UFW ALLOW] OUT=eth0 DST=185.244.25.171 DPT=443 LEN=148
02:24:02  kernel   [UFW ALLOW] OUT=eth0 DST=185.244.25.171 DPT=443 LEN=151`,
              "text",
              "Twenty minutes on one host. Read it before continuing.",
            ),
            walkthrough(
              "Turning eight log lines into a verdict",
              "Nothing above is conclusive alone — failed logins happen constantly, sudo is normal for a deploy account, and outbound HTTPS is unremarkable. The conclusion comes from the sequence and the timing.",
              [
                step(
                  "Read the failures as reconnaissance, not as the event",
                  "Three failed logins for three different usernames from one address in three minutes is username enumeration. On an internet-facing host this happens continuously and is not, by itself, worth an alert.",
                  {
                    insight: "What makes these three matter is not that they failed. It is what comes 38 seconds after the third one.",
                  },
                ),
                step(
                  "Notice that the guessing stopped because it worked",
                  "The fourth attempt succeeds, for the same username that had just failed, from the same address. That is a guessed or sprayed password landing — and it means every line after this point is attacker activity.",
                  {
                    evidence: {
                      label: "The pivot",
                      code: `02:12:40  Failed password for invalid user deploy from 185.244.25.171
02:13:18  Accepted password for deploy       from 185.244.25.171`,
                    },
                    insight: "Failure then success for the same account from the same source is one of the clearest single indicators in authentication logs.",
                  },
                ),
                step(
                  "Four seconds to root is not human hesitation",
                  "The sudo to a root shell occurs four seconds after login. A person logging in to do legitimate work reads something first. Automation does not.",
                  {
                    evidence: {
                      label: "Escalation timing",
                      code: `02:13:18  Accepted password for deploy
02:13:22  sudo deploy : USER=root ; COMMAND=/bin/bash
          ── 4 seconds ──`,
                    },
                    insight: "This also tells you the deploy account had unrestricted sudo, which is the misconfiguration that turned a compromised low-privilege account into full control of the host.",
                  },
                ),
                step(
                  "Read the outbound connections as a beacon",
                  "Three outbound connections to the address that just logged in, at 02:14:02, 02:19:02 and 02:24:02 — exactly five minutes apart, carrying 148, 148 and 151 bytes.",
                  {
                    evidence: {
                      label: "Interval and size",
                      code: `02:14:02  DST=185.244.25.171  LEN=148
02:19:02  DST=185.244.25.171  LEN=148   (+300s)
02:24:02  DST=185.244.25.171  LEN=151   (+300s)`,
                    },
                    insight: "Fixed interval and near-constant size is a timer checking in and being told there is nothing to do. The host is under remote control, not merely compromised.",
                  },
                ),
                step(
                  "State the verdict and what it rests on",
                  "Password guessing from 185.244.25.171 succeeded against the deploy account at 02:13:18, escalated to root four seconds later via unrestricted sudo, and established beaconing to the same address by 02:14:02. Confidence is high because the same address appears at every stage.",
                  {
                    insight: "That last clause is what makes it defensible. A verdict is only as good as the thing tying the stages together, and here it is a single source address running through all three.",
                  },
                ),
              ],
            ),
            check(
              "Which single pair of lines most strongly establishes that this is a compromise rather than routine noise?",
              [
                "The three failed logins, because they show an attack in progress",
                "The failed and then successful login for the same account from the same address",
                "The sudo command, because root access is always suspicious",
                "The outbound HTTPS connections, because they leave the network",
              ],
              1,
              "Failed logins alone are constant background noise on any exposed host, and sudo by a deploy account is routine. Failure followed by success for the same username from the same source is the moment the guessing stopped working — everything after it follows from that line.",
            ),
          ],
        ),
      ],
    },
    {
      title: "SIEM Concepts",
      description: "Bringing all the logs together.",
      lessons: [
        lesson(
          "What is a SIEM?",
          "What a SIEM is for, the pipeline inside it, and why normalisation decides whether it works.",
          8,
          [
            text(
              "A SIEM collects logs from everywhere, normalises them into a common shape, stores them so they can be searched, and runs rules against them to produce alerts. Its value is that it lets you ask one question across dozens of systems that would otherwise have to be asked separately.\n\nThat is the whole idea. Everything difficult about running one comes from the second step.",
            ),
            code(
              `  collection   →   normalisation   →   storage   →   detection   →   alert
      │                  │                 │             │
  agents,          map vendor          indexed for   rules and
  syslog,          fields to a         search and    correlation
  APIs             common schema       retention     run here`,
              "text",
              "Normalisation is where most SIEM deployments succeed or fail.",
            ),
            text(
              "**Normalisation** is mapping each vendor's field names onto a common schema, so `src_ip`, `SourceAddress` and `id.orig_h` all become one searchable field.\n\nWhen it is done well, a rule written once works across every source. When it is done badly, the rule matches nothing on half your estate and produces no error to tell you — the condition is simply never true. A rule that matches nothing looks exactly like a quiet environment.",
            ),
            callout(
              "warning",
              "Ingesting everything is a trap",
              "SIEM licensing is usually volume-based, and the instinct is to send every log 'just in case'. The result is a large bill, slow searches, and a haystack that makes the needle harder to find. Send what answers a question you actually ask; archive the rest somewhere cheap.",
            ),
            check(
              "A detection rule ported from another organisation produces zero alerts in three months. What should be checked first?",
              [
                "Whether the technique it detects is used against your sector",
                "Whether the fields it references exist and are populated in your normalised data",
                "Whether analysts are closing its alerts without recording them",
                "Whether its severity is set too low to display",
              ],
              1,
              "Silence from a ported rule is far more often a field-mapping problem than an absence of the behaviour. Nothing errors when a referenced field does not exist — the condition is simply never satisfied, so testing against known-bad data is the way to tell the two apart.",
            ),
          ],
        ),
        lesson(
          "Correlation & Detection Rules",
          "Turning individual events into alerts worth someone's attention, and the arithmetic of alert volume.",
          8,
          [
            text(
              "A detection rule turns events into alerts. The hard part is not expressing the logic — it is choosing a condition specific enough to be worth interrupting someone for.\n\n**Correlation** is what makes this possible: combining events that are unremarkable alone into a pattern that is not. One failed login is nothing. Two hundred failed logins followed by one success is an alert.",
            ),
            code(
              `Weak rule                          Correlated rule
────────────────────────────────   ────────────────────────────────────
Alert on any failed login          Alert on >50 failures then a success,
  → thousands per day                same account, same source, <10 min
                                     → a handful per month

Alert on PowerShell execution      Alert on PowerShell spawned by an
  → constant, it is everywhere       Office application
                                     → rare, and almost always bad

Alert on outbound to a new IP      Alert on outbound to an IP first seen
  → hundreds per day                 <30 days ago, at fixed intervals,
                                     with near-constant payload size`,
              "text",
              "The right column fires rarely. That is the point, not a side effect.",
            ),
            text(
              "The arithmetic here is unforgiving and worth doing explicitly. A rule producing 40 alerts a day, in a SOC where each takes ten minutes, consumes almost seven hours — most of a full-time person, on one rule.\n\nThis is why alert volume is a design constraint rather than an afterthought. A rule nobody has time to work is not a detection; it is a rule that will be muted within a fortnight, and muted rules detect nothing at all.",
            ),
            callout(
              "important",
              "Measure the alert rate before deploying, not after",
              "Replay any new rule against several weeks of historical data and count what it would have produced. A rule with no measured rate is a guess about someone else's workload, and the person who finds out is the analyst on the night shift.",
            ),
            check(
              "A proposed rule would have fired 218 times over the last 30 days, with 214 of those from one finance macro. What is the right response?",
              [
                "Deploy it — a 98% false positive rate is normal for detection",
                "Exclude that specific script path, then re-measure",
                "Exclude the parent application entirely so the rule stays quiet",
                "Lower the severity so it does not interrupt anyone",
              ],
              1,
              "A narrow exclusion for the one known-good script removes the noise while keeping the four real matches. Excluding the parent application would discard exactly the detections the rule exists for, and lowering severity leaves the volume problem untouched.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Alert Investigation",
      description: "From alert to verdict.",
      lessons: [
        lesson(
          "The Triage Process",
          "A repeatable method for working an alert under time pressure, and what to write down.",
          8,
          [
            text(
              "Triage is deciding, quickly, whether an alert needs more attention. Doing it consistently matters more than doing it cleverly — a repeatable method produces defensible decisions under pressure, and pressure is the normal condition.\n\nThe sequence below works for almost any alert type.",
            ),
            code(
              `1  What fired, and what does the rule actually detect?
2  Is the alert technically valid, or a rule malfunction?
3  What is the asset, and who uses it?
4  Is there a benign explanation consistent with all the evidence?
5  What else happened around it, on that host and that account?
6  Verdict: close with reason, or escalate with findings`,
              "text",
              "Six steps. Step 4 is where most of the judgement lives.",
            ),
            text(
              "Step four is the one people get wrong in both directions. The pressure of a full queue pushes toward accepting the first plausible benign story; the fear of missing something pushes toward escalating everything.\n\nThe discipline is to ask whether the benign explanation accounts for **all** the evidence, not just most of it. A backup job explains large outbound transfer. It does not explain large outbound transfer to a residential IP address at 02:00 from a workstation.",
            ),
            callout(
              "tip",
              "Write the reason, not just the verdict",
              "'False positive' as a closure note is worthless three months later when the same alert fires and nobody can tell whether it was investigated properly. 'Closed — matched scheduled Veeam backup job, confirmed with infrastructure team, destination is our own storage account' takes twenty extra seconds and is still useful a year on.",
            ),
            check(
              "An alert fires for a large outbound transfer. A scheduled backup runs at that time. What must be checked before closing it as benign?",
              [
                "Nothing further — the timing match is sufficient",
                "Whether the destination, volume and source host are all consistent with that backup job",
                "Whether the backup job has ever failed previously",
                "Whether other alerts fired on the same host",
              ],
              1,
              "A timing coincidence is the weakest form of match, and attackers deliberately schedule activity to blend with known jobs. The benign explanation has to account for the destination and the source as well, or it is only covering part of the evidence.",
            ),
          ],
        ),
        lesson(
          "Indicators of Compromise (IOCs)",
          "The artefacts that mark an intrusion, how quickly each decays, and why behaviour outlasts them all.",
          7,
          [
            text(
              "An indicator of compromise is an observable artefact suggesting a system has been attacked — a file hash, an IP address, a domain, a registry key. They are useful because they are cheap to share and trivial to search for.\n\nThey are also the weakest form of detection, and understanding why is what separates using them well from drowning in them.",
            ),
            code(
              `Indicator          Attacker cost to change    Useful for
────────────────   ────────────────────────   ──────────────────────
File hash          Seconds — recompile        Days
IP address         Minutes — new VPS          Weeks
Domain             Minutes — new registration Weeks
Registry key       Hours — modify implant     Months
Tool artefact      Days — rewrite tooling     Months
Behaviour / TTP    Months — retrain operators Years`,
              "text",
              "The 'Pyramid of Pain'. Each row costs the attacker more to change than the one above.",
            ),
            text(
              "The practical consequence is that indicator feeds decay, and stale indicators are not merely useless — they are harmful. An IP address that hosted command-and-control in 2023 has very likely been reassigned, and may now be a CDN edge node or a mail relay. Blocking it damages your own operations and teaches analysts to distrust the feed.\n\nThe right handling is automatic expiry by age, with the threshold set from measured match data rather than sentiment.",
            ),
            callout(
              "important",
              "Behaviour is what the attacker cannot cheaply abandon",
              "Recompiling to change a hash costs nothing. Changing the fact that the implant needs to establish persistence, escalate privilege and move laterally costs a redesign of how the operator works. That is why detections built on behaviour survive campaigns that hash-based detection misses entirely.",
            ),
            check(
              "Why can blocking a two-year-old malicious IP address actively cause harm?",
              [
                "Blocking rules always degrade firewall performance measurably",
                "Addresses get reassigned, so it may now serve legitimate infrastructure your users depend on",
                "It alerts the attacker that they have been detected",
                "Old indicators cannot be removed once deployed",
              ],
              1,
              "Address reassignment is routine, and a block list carrying years of accumulated indicators will eventually include a CDN node or mail relay. The cost is an outage you caused yourself, plus analysts learning to ignore that feed's alerts.",
            ),
          ],
        ),
        lesson(
          "Mini Assessment: Work the Alert",
          "Take one realistic alert from arrival to a written verdict.",
          8,
          [
            text(
              "One alert, worked end to end. Read the alert and the context before the walkthrough, and decide what your verdict would be and what you would write in the closure note.",
            ),
            code(
              `ALERT  Impossible travel — user authenticated from two locations
SEVERITY  Medium          RULE  identity-impossible-travel-v3

  user:  r.okafor@acmecorp.com
  09:02  London, UK        203.0.113.44    Outlook / Windows
  09:41  Lagos, Nigeria    197.210.44.9    Outlook / Windows
  distance 5,000 km in 39 minutes — physically impossible`,
              "text",
              "The alert as it arrives in the queue.",
            ),
            walkthrough(
              "Working an impossible-travel alert to a verdict",
              "Impossible travel is a high-volume rule with a well-known benign explanation, which makes it a good test of whether you check the explanation or merely accept it.",
              [
                step(
                  "Establish what the rule actually measures",
                  "It compares the geolocation of two authentications and calculates whether the distance is coverable in the elapsed time. It does not know about VPNs, mobile roaming, or corporate egress points — all of which move a user's apparent location instantly.",
                  {
                    insight: "The most common cause of this alert by a wide margin is a VPN connecting or disconnecting. That is the benign explanation to test, not to assume.",
                  },
                ),
                step(
                  "Check whether either address is your own infrastructure",
                  "If one address is a corporate VPN egress, the two locations are an artefact of routing rather than of travel.",
                  {
                    evidence: {
                      label: "Address attribution",
                      code: `203.0.113.44   AcmeCorp VPN egress, London      (known, in asset inventory)
197.210.44.9   Mobile carrier, Lagos, Nigeria   (not corporate)`,
                    },
                    insight: "One is ours, one is not. This does not settle it — a user genuinely in Lagos who disconnected from the VPN would produce exactly this.",
                  },
                ),
                step(
                  "Check whether the user is where the alert implies",
                  "This is the cheapest decisive check available and it is routinely skipped in favour of technical analysis.",
                  {
                    evidence: {
                      label: "HR and travel records",
                      code: `r.okafor  annual leave: 2026-08-03 to 2026-08-14
          travel notification on file: Lagos, Nigeria
          device: corporate laptop, MDM-enrolled, compliant`,
                    },
                    insight: "The user is on leave in Lagos, on a managed device, having told the company. The benign explanation now accounts for every piece of evidence rather than some of it.",
                  },
                ),
                step(
                  "Test the explanation against what would contradict it",
                  "Before closing, look for anything the benign story does not cover — a second account, an unusual action after the login, a device that is not theirs.",
                  {
                    evidence: {
                      label: "Session activity after 09:41",
                      code: `09:41  sign-in success, MFA satisfied (passkey)
09:43  Outlook sync, 41 items
09:52  SharePoint read: Q3-planning.pptx (opened weekly since May)
no privileged actions, no new MFA methods, no forwarding rules`,
                    },
                    insight: "MFA was satisfied by a passkey, which is bound to the device and cannot be phished or relayed. Post-login activity matches this user's normal pattern.",
                  },
                ),
                step(
                  "Close it with a reason that will still make sense later",
                  "Verdict: benign. User on approved leave in Lagos, authenticated from a mobile carrier after disconnecting from the London VPN egress. Passkey MFA satisfied, post-login activity consistent with baseline, no persistence or privilege changes.",
                  {
                    insight: "Also worth raising: if travel notifications are on file, feeding them into the rule as a suppression would remove a recurring false positive. Triage that only closes alerts never reduces them.",
                  },
                ),
              ],
            ),
            check(
              "Which check most efficiently distinguished a benign impossible-travel alert from a real one here?",
              [
                "Geolocating both IP addresses precisely",
                "Confirming the user was genuinely travelling, and that MFA used a device-bound factor",
                "Checking whether the two logins used the same browser version",
                "Measuring the exact distance between the two cities",
              ],
              1,
              "Geolocation and distance are what the rule already did, so repeating them adds nothing. Travel records plus a phishing-resistant MFA factor address both halves of the question — was the user there, and was it actually them.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Incident Response",
      description: "What to do when it's real.",
      lessons: [
        lesson(
          "The IR Lifecycle",
          "The six phases of incident response, and why the first and last are the ones that get skipped.",
          9,
          [
            text(
              "Incident response follows a lifecycle usually remembered as **PICERL**: Preparation, Identification, Containment, Eradication, Recovery, Lessons learned.\n\nIt is a cycle rather than a line — lessons learned feeds preparation for the next one. In practice the middle phases get all the attention, and the two ends, which determine how well the middle goes, get squeezed.",
            ),
            diagram(
              "The six phases, and what each is accountable for",
              "The order matters: eradicating before you have scoped means missing the second foothold, and recovering before eradication means reinfection.",
              [
                stage("Preparation", "T1595", "Everything done before an incident: logging enabled, contacts known, playbooks written, backups tested, authority to disconnect a production system agreed in advance. This phase decides how the other five go and is the easiest to defer indefinitely."),
                stage("Identification", "T1592", "Confirming that something is actually happening and establishing initial scope. The output is a verdict and a boundary: which hosts, which accounts, from when."),
                stage("Containment", "T1489", "Stopping the harm spreading without destroying evidence. Usually network isolation rather than shutdown, because memory holds the implant, its configuration and often credentials."),
                stage("Eradication", "T1070", "Removing the attacker's access completely — every implant, every persistence mechanism, every credential they touched. Incomplete eradication is the most common cause of a second incident a fortnight later."),
                stage("Recovery", "T1490", "Returning systems to production and watching them closely. Restoring from a backup taken after the initial compromise reintroduces the problem, so the backup date must be checked against the intrusion timeline."),
                stage("Lessons learned", "T1591", "What allowed it, what worked, what did not, and what changes. Skipping this is how an organisation has the same incident three times and calls it bad luck."),
              ],
            ),
            text(
              "Two sequencing rules cause most real failures.\n\n**Scope before you eradicate.** Cleaning the host you know about while a second one is still compromised produces an eradication that looks successful and is not. **Eradicate before you recover.** Restoring a system while access remains open means reinfection, usually within days, and by then the response has been declared over.",
            ),
            callout(
              "danger",
              "Do not power off a compromised host",
              "Shutting down destroys memory, and memory holds the running implant, its configuration, decrypted material and often credentials. Isolate it from the network instead: the harm stops spreading, the evidence survives, and the choice is not reversible in the other direction.",
            ),
            check(
              "A team eradicates malware from the one host they know about, restores it, and two weeks later the intrusion returns. Which phase most likely failed?",
              [
                "Preparation — the backups were inadequate",
                "Identification — the scope was never fully established, so a second foothold survived",
                "Recovery — the system was returned to production too quickly",
                "Lessons learned — no review was conducted",
              ],
              1,
              "Recurrence a fortnight later is the signature of incomplete scoping. Eradication was thorough on the host in scope, but the scope itself was wrong — which is why identification has to establish a boundary before anything is cleaned.",
            ),
          ],
        ),
        lesson(
          "Containment & Evidence",
          "Stopping harm while keeping proof, and the order in which evidence disappears.",
          7,
          [
            text(
              "Containment and evidence preservation pull against each other, and the tension is real rather than theoretical. The fastest way to stop an attacker is to power the machine off. That is also the fastest way to destroy most of what you need to understand what they did.\n\nResolving it requires knowing what is fragile and what is not.",
            ),
            text(
              "The **order of volatility** ranks evidence by how quickly it disappears. Collect from the top down.\n\nCPU registers and cache. Memory — processes, network connections, decrypted data, credentials. Temporary filesystems. Disk. Remote logs already shipped elsewhere. Physical media and backups.\n\nEverything above 'disk' is gone the moment the machine loses power, and none of it can be recovered afterwards.",
            ),
            code(
              `Containment action     Stops spread?   Preserves memory?   Use when
────────────────────   ─────────────   ─────────────────   ──────────────
Network isolation      Yes             Yes                 Default choice
Disable account        Partly          Yes                 Credential abuse
Block C2 at firewall   Partly          Yes                 Buying time
Power off              Yes             No — destroys it    Almost never
Reimage immediately    Yes             No — destroys all   Only after
                                                           collection`,
              "text",
              "Network isolation is almost always the right first move.",
            ),
            callout(
              "warning",
              "Containment tells the attacker you are there",
              "An operator who notices their access dropping may escalate — deploying ransomware early, destroying logs, or burning their remaining footholds. Where an intrusion is broad, containing everything at once is usually better than host by host, and that decision needs to be made before you start rather than halfway through.",
            ),
            check(
              "Why is network isolation almost always preferable to powering off a compromised host?",
              [
                "It is faster to perform than a shutdown",
                "It stops the attacker communicating while preserving memory, which holds the implant and often credentials",
                "It allows the attacker to continue working under observation",
                "Powering off risks damaging the disk",
              ],
              1,
              "Both stop the attacker's access. Only one keeps the volatile evidence — and that evidence is unrecoverable once lost, which makes the decision one-directional: you can always power off later, but you can never get memory back.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Threat Intelligence",
      description: "Knowing your enemy in advance.",
      lessons: [
        lesson(
          "Threat Intel & MITRE ATT&CK",
          "What intelligence is for, and the framework that gives everyone the same vocabulary for attacker behaviour.",
          8,
          [
            text(
              "Threat intelligence is information about adversaries that changes a decision you make. That last clause is the whole test: if nothing you do differs based on the answer, what you have is interesting reading rather than intelligence.\n\nIt is usually described in three levels — strategic (who is likely to target us and why), operational (what campaigns are active), and tactical (specific indicators and techniques). A SOC lives mostly in the third.",
            ),
            text(
              "**MITRE ATT&CK** is a catalogue of what attackers actually do, observed in real intrusions and organised into tactics and techniques.\n\nA **tactic** is the objective — persistence, credential access, exfiltration. A **technique** is a way of achieving it, with an identifier like `T1566.001` for spearphishing attachments. The value is a shared vocabulary: 'they used T1003.001' is unambiguous in a way that 'they dumped creds' is not.",
            ),
            code(
              `Tactic (why)            Example technique (how)
─────────────────────   ────────────────────────────────────────
Initial Access          T1566.001  Spearphishing attachment
Execution               T1059.001  PowerShell
Persistence             T1547.001  Registry run key
Privilege Escalation    T1068      Exploitation for escalation
Defense Evasion         T1070.001  Clear Windows event logs
Credential Access       T1003.001  LSASS memory dumping
Discovery               T1087      Account discovery
Lateral Movement        T1021.002  SMB admin shares
Collection              T1074.001  Local data staging
Exfiltration            T1567.002  Transfer to cloud storage`,
              "text",
              "The tactic is the goal; the technique is one route to it.",
            ),
            callout(
              "tip",
              "Map your detections, then look at the gaps",
              "Mapping existing rules onto the matrix turns a vague sense of coverage into a picture with holes in it. The holes are the useful output — they show which tactics you would currently miss entirely, which is a far better guide to what to build next than the newest report.",
            ),
            check(
              "What makes an ATT&CK mapping useful rather than decorative?",
              [
                "It labels every intrusion with a group name for reporting",
                "Each mapped technique prompts a specific question: would we have detected or prevented this?",
                "It replaces the need for indicator feeds",
                "It provides severity scores for prioritisation",
              ],
              1,
              "A mapping that produces no question is a labelling exercise. Its value comes from converting each technique into a coverage check, which turns a report about someone else's incident into a list of things to fix in yours.",
            ),
          ],
        ),
        lesson(
          "Using Intel in the SOC",
          "Turning intelligence into detections, hunts and decisions instead of a feed nobody reads.",
          6,
          [
            text(
              "Most intelligence programmes fail in the same way: a large volume of well-written reports that change nothing, because no decision was ever attached to them.\n\nThe fix is to start from the decision. Which choices would you make differently if you knew something? Those are your requirements, and everything collected should serve one.",
            ),
            code(
              `Intelligence                      Turned into
───────────────────────────────   ────────────────────────────────────
"Group X targets our sector       Coverage check: do we detect the six
 using these six techniques"       techniques? Build what is missing.

"This loader stages to a          Hunt: search 90 days of endpoint data
 non-default temp directory"       for that path across the estate.

"Campaign uses domains            Detection: alert on lookups to domains
 registered within 14 days"        first resolved in the last 14 days.

"These 40,000 IP addresses"       Usually nothing. Check how many ever
                                   matched before ingesting more.`,
              "text",
              "The first three change what you do. The fourth is volume mistaken for value.",
            ),
            text(
              "Two habits make the difference in practice.\n\n**Relevance before novelty.** A five-year-old technique targeting software you actually run matters more than a novel one targeting software you do not. The first filter on any report is whether the affected technology, sector or geography intersects with yours.\n\n**Expire indicators automatically.** Set the threshold from measured match data. Feeds accumulate; without expiry the false positives accumulate with them.",
            ),
            check(
              "A vendor report describes a sophisticated new technique targeting industrial control systems. Your organisation is a retail bank. What is the appropriate response?",
              [
                "Build detections for it immediately, since it is sophisticated and new",
                "Note it, but prioritise below threats to technology you actually operate",
                "Ingest all indicators from the report into the SIEM",
                "Ignore threat intelligence generally, as vendor reports are marketing",
              ],
              1,
              "Relevance is a function of your exposure, not the technique's novelty. Building detection for systems you do not run consumes the effort that a genuinely applicable gap needed — while dismissing intelligence wholesale loses the reports that would have mattered.",
            ),
          ],
        ),
      ],
    },
    {
      title: "Final Assessment: SOC Analyst",
      description: "Prove you can work the floor.",
      lessons: [
        lesson(
          "End-to-End Investigation",
          "One incident from first alert to handover, exercising every part of the course in sequence.",
          10,
          [
            text(
              "This is the whole course in one investigation. You are on shift, the queue is busy, and an alert arrives that is not obviously anything.\n\nWork it in order. Each step below is a decision point — decide what you would do before reading what was done.",
            ),
            walkthrough(
              "A medium-severity alert that turns out to matter",
              "14:02 — a medium-severity alert fires: an account authenticated to a server it has not touched in 90 days. Medium severity, one line of detail, and a queue with eleven other alerts in it.",
              [
                step(
                  "Decide whether this is worth more than two minutes",
                  "Baseline deviation alerts are high volume and mostly benign — people change teams and start using new systems. What raises this one is which server and which account.",
                  {
                    evidence: {
                      label: "Alert detail",
                      code: `14:02:11  account: svc-backup
          source:  WKS-FIN-04  (finance workstation)
          target:  DC-01       (domain controller)
          logon type 3, SMB, ADMIN$
          no prior svc-backup -> DC-01 auth in 90 days`,
                    },
                    insight: "A service account authenticating from a *workstation* is the anomaly. Service accounts run on servers; a finance desktop is not where svc-backup should be initiating anything.",
                  },
                ),
                step(
                  "Work out how the account got onto that workstation",
                  "The account is not the origin of the problem — the workstation is. Look at what happened on WKS-FIN-04 before 14:02.",
                  {
                    evidence: {
                      label: "Process creation, WKS-FIN-04",
                      code: `13:47:02  WINWORD.EXE -> powershell.exe -nop -w hidden -enc SQBFAFgA...
13:47:09  powershell.exe -> rundll32.exe  (no arguments)
13:51:44  rundll32.exe accessed lsass.exe  (handle 0x1410, PROCESS_VM_READ)`,
                    },
                    insight: "Maldoc at 13:47, then LSASS access at 13:51. That last line is credential dumping — which explains exactly how svc-backup's credentials became available on a finance workstation.",
                  },
                ),
                step(
                  "Establish the blast radius of the stolen credential",
                  "Credential theft means every system that credential can reach is now in scope, whether or not it has been touched yet. Find out what svc-backup is entitled to.",
                  {
                    evidence: {
                      label: "Account entitlements",
                      code: `svc-backup
  member of: Domain Admins        <--
  password last set: 2019-03-11   (7 years)
  password never expires: true
  logon workstations: unrestricted`,
                    },
                    insight: "Domain Admin, on a seven-year-old password that never expires. The scope is not one server — it is the entire domain, and it became so at 13:51.",
                  },
                ),
                step(
                  "Check what has already been done with it",
                  "Between the theft at 13:51 and the alert now, the attacker has had eleven minutes with a Domain Admin credential. Find out exactly what they did with it in that window.",
                  {
                    evidence: {
                      label: "svc-backup activity since 13:51",
                      code: `14:02:11  WKS-FIN-04 -> DC-01   SMB ADMIN$        SUCCESS
14:03:40  DC-01: service created "WinDefendUpd"  binary in C:\\Windows\\Temp
14:04:55  DC-01 -> 185.244.25.171:443  outbound, 148 B
14:09:55  DC-01 -> 185.244.25.171:443  outbound, 148 B`,
                    },
                    insight: "A service installed on the domain controller for persistence, and beaconing from the DC itself. This is no longer a workstation incident.",
                  },
                ),
                step(
                  "Escalate now, and contain in the right order",
                  "This is past Tier 1 and past Tier 2. Escalate to incident response immediately with what you have, and contain both hosts by network isolation — not shutdown — while the credential is disabled and reset.",
                  {
                    insight: "Order matters: disabling svc-backup before isolating DC-01 tells the attacker they have been found while they still have a live session on a domain controller. Isolate first, then revoke.",
                  },
                ),
                step(
                  "Hand over with the timeline and the gaps",
                  "Known: maldoc execution 13:47, LSASS credential access 13:51, Domain Admin credential used against DC-01 at 14:02, persistence service installed 14:03, beaconing from DC-01 from 14:04. Both hosts isolated 14:19. Unknown: how the document was delivered, who else received it, and whether the credential was used anywhere not yet examined.",
                  {
                    insight: "Seventeen minutes from maldoc to domain controller persistence. That number is the argument for why alert triage speed matters — and the three unknowns are the next shift's first three tasks.",
                  },
                ),
              ],
            ),
            text(
              "Look at what actually mattered. A medium-severity baseline alert was the thread. Pulling it required knowing that service accounts do not run from workstations, recognising LSASS access as credential theft, checking entitlements before assuming scope, and containing in an order that did not tip off the attacker.\n\nNone of that is exotic. It is the course, applied in sequence, under time pressure.",
            ),
            check(
              "Why should the compromised account be disabled after network isolation rather than before?",
              [
                "Disabling an account requires approval that takes longer to obtain",
                "Revoking access first alerts the attacker while they still hold a live session on the domain controller",
                "Account changes take effect too slowly to be useful",
                "Isolation automatically disables all accounts on the host",
              ],
              1,
              "Both actions are necessary. The order controls what the attacker can do in the seconds after they realise they have been detected — and an operator with a live session on a domain controller who knows they are burned is the worst case to create deliberately.",
            ),
          ],
        ),
      ],
    },
  ],
};
