import type { SeedCourse } from "./types";

export const course2: SeedCourse = {
  slug: "soc-analyst-fundamentals",
  title: "SOC Analyst Fundamentals",
  subtitle: "Sit in the defender's chair",
  description:
    "The classic entry point into a cybersecurity career. Learn how a Security Operations Centre works, how to read logs and SIEM alerts, how to triage and investigate incidents, and how to respond when something is genuinely wrong. Hands-on, scenario-driven, and built around how real SOCs operate.",
  category: "BLUE_TEAM",
  difficulty: "MEDIUM",
  estimatedHrs: 20,
  order: 2,
  prerequisites: ["cybersecurity-fundamentals"],
  objectives: [
    "Describe how a SOC is structured and what each tier does",
    "Read and interpret system, network, and application logs",
    "Use SIEM concepts to correlate events into alerts",
    "Triage alerts and separate true positives from noise",
    "Follow the incident response lifecycle end to end",
    "Apply threat intelligence and IOCs to investigations",
  ],
  modules: [
    // ─── Module 1 ───────────────────────────────────────────────
    {
      title: "Introduction to the SOC",
      description: "What a Security Operations Centre actually does.",
      lessons: [
        {
          title: "What is a SOC?",
          summary: "The nerve centre of defence.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "A **Security Operations Centre (SOC)** is a team — and often a physical or virtual room — responsible for continuously monitoring an organisation's systems, detecting threats, and responding to incidents. Think of it as mission control for security.\n\nSOCs typically run **24/7**, because attacks don't keep office hours. Analysts watch dashboards of alerts, investigate the suspicious ones, and escalate real incidents." },
            { type: "CALLOUT", variant: "info", title: "Detect and respond", text: "A SOC's two core jobs are detection (spotting something bad) and response (doing something about it). Everything else — tools, processes, people — serves those two goals." },
            { type: "KNOWLEDGE_CHECK", question: "What are the two core responsibilities of a SOC?", options: [
              { id: "A", text: "Building software and testing it" },
              { id: "B", text: "Detecting threats and responding to incidents" },
              { id: "C", text: "Selling security products and support" },
              { id: "D", text: "Writing company policy and training staff" },
            ], correct: "B", explanation: "A SOC exists to detect threats and respond to incidents — around the clock." },
          ],
          flashcards: [
            { front: "What is a SOC?", back: "Security Operations Centre — a team that continuously monitors, detects threats, and responds to incidents, usually 24/7." },
            { front: "The two core jobs of a SOC?", back: "Detection and response." },
          ],
        },
        {
          title: "SOC Tiers & Roles",
          summary: "How the work is divided.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "A SOC is usually organised in **tiers** by experience and responsibility:\n\n**Tier 1 (Triage)** — the front line. Monitors alerts, does initial triage, escalates real issues. This is where most people start.\n**Tier 2 (Investigation)** — deeper analysis of escalated alerts, incident handling.\n**Tier 3 (Threat Hunting)** — proactively hunts for threats that evaded detection, and handles the most complex incidents.\n\nSupporting roles include the **SOC Manager**, **Detection Engineers** (who build the detection rules), and **Threat Intelligence Analysts**." },
            { type: "CALLOUT", variant: "tip", title: "Your first job", text: "As a Tier 1 analyst, your superpower is triage: quickly deciding whether an alert is noise or a real threat, and escalating cleanly with good notes. Do that well and Tier 2 is next." },
            { type: "KNOWLEDGE_CHECK", question: "A Tier 1 analyst's primary responsibility is:", options: [
              { id: "A", text: "Building new detection rules" },
              { id: "B", text: "Proactively hunting undetected threats" },
              { id: "C", text: "Triaging alerts and escalating real issues" },
              { id: "D", text: "Managing the SOC budget" },
            ], correct: "C", explanation: "Tier 1 is the triage front line — monitoring alerts and escalating the genuine ones. Threat hunting is Tier 3; rule building is detection engineering." },
          ],
          flashcards: [
            { front: "What does a Tier 1 SOC analyst do?", back: "Front-line triage — monitors alerts, does initial analysis, and escalates real threats." },
            { front: "What does Tier 3 focus on?", back: "Proactive threat hunting and the most complex incidents." },
          ],
        },
      ],
      quiz: {
        title: "Module 1 Quiz: The SOC",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "A SOC's two core jobs are:", options: ["Sales and support", "Detection and response", "Coding and testing", "Policy and training"], correct: "Detection and response" },
          { type: "MULTIPLE_CHOICE", question: "Which tier is the front-line triage role?", options: ["Tier 1", "Tier 2", "Tier 3", "SOC Manager"], correct: "Tier 1" },
          { type: "TRUE_FALSE", question: "Most SOCs operate 24/7.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Proactively searching for threats that evaded detection is called:", options: ["Triage", "Threat hunting", "Patching", "Provisioning"], correct: "Threat hunting" },
        ],
      },
    },

    // ─── Module 2 ───────────────────────────────────────────────
    {
      title: "Security Monitoring",
      description: "What we watch, and why.",
      lessons: [
        {
          title: "What We Monitor",
          summary: "Endpoints, networks, and identities.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Effective monitoring covers several **telemetry sources**:\n\n**Endpoints** — laptops and servers (via EDR agents), showing process, file, and login activity.\n**Network** — traffic flows, DNS queries, firewall logs.\n**Identity** — authentication events: who logged in, from where, when.\n**Applications & Cloud** — web server logs, cloud audit trails.\n\nThe more sources you correlate, the clearer the picture. A single failed login is nothing; a thousand from one IP across many accounts is a brute-force attack." },
            { type: "KNOWLEDGE_CHECK", question: "One failed login is meaningless, but 1,000 failed logins from one IP across many accounts strongly suggests:", options: [
              { id: "A", text: "A user forgot their password" },
              { id: "B", text: "A brute-force / password-spraying attack" },
              { id: "C", text: "A software bug" },
              { id: "D", text: "Normal network noise" },
            ], correct: "B", explanation: "High-volume failed logins across many accounts from one source is a classic brute-force or password-spraying signature." },
          ],
          flashcards: [
            { front: "Name four key telemetry sources a SOC monitors.", back: "Endpoints (EDR), network traffic, identity/auth events, and applications/cloud logs." },
            { front: "What does a spike of failed logins across many accounts suggest?", back: "A brute-force or password-spraying attack." },
          ],
        },
        {
          title: "Baselines & Anomalies",
          summary: "You can't spot 'weird' without knowing 'normal'.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Detection often comes down to spotting **anomalies** — deviations from normal behaviour. But 'normal' has to be defined first, which is called establishing a **baseline**.\n\nIf your finance team logs in Monday–Friday, 9–5, from London — then a login at 3 a.m. from another country is an anomaly worth investigating. Without the baseline, you'd never know it was unusual." },
            { type: "CALLOUT", variant: "info", title: "Signature vs anomaly detection", text: "Signature-based detection looks for known-bad patterns (a specific malware hash). Anomaly-based detection looks for deviations from normal. Good SOCs use both." },
            { type: "KNOWLEDGE_CHECK", question: "Detecting an attack by comparing activity against known-normal behaviour is called:", options: [
              { id: "A", text: "Signature-based detection" },
              { id: "B", text: "Anomaly-based detection" },
              { id: "C", text: "Penetration testing" },
              { id: "D", text: "Patch management" },
            ], correct: "B", explanation: "Comparing against a baseline of normal to flag deviations is anomaly-based detection. Signature-based looks for specific known-bad patterns." },
          ],
          flashcards: [
            { front: "What is a baseline?", back: "A definition of normal behaviour, used as a reference to spot anomalies." },
            { front: "Signature vs anomaly detection?", back: "Signature = matches known-bad patterns. Anomaly = flags deviations from normal." },
          ],
        },
      ],
      quiz: {
        title: "Module 2 Quiz: Monitoring",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Detecting deviations from normal behaviour is:", options: ["Signature detection", "Anomaly detection", "Patching", "Hashing"], correct: "Anomaly detection" },
          { type: "MULTIPLE_CHOICE", question: "A definition of 'normal' used to spot unusual activity is a:", options: ["Signature", "Baseline", "Payload", "Firewall rule"], correct: "Baseline" },
          { type: "TRUE_FALSE", question: "A single failed login is a reliable sign of an attack.", correct: "false", explanation: "One failed login is normal noise; volume and pattern matter." },
          { type: "MULTIPLE_CHOICE", question: "EDR agents primarily give visibility into:", options: ["Endpoints", "Only firewalls", "Only email", "Physical access"], correct: "Endpoints" },
        ],
      },
    },

    // ─── Module 3 ───────────────────────────────────────────────
    {
      title: "Logs Fundamentals",
      description: "The raw evidence of everything.",
      lessons: [
        {
          title: "Reading Logs",
          summary: "Anatomy of a log entry.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "**Logs** are timestamped records of events. Nearly every investigation starts and ends with logs. A typical log line has a **timestamp**, a **source**, an **event type**, and **details**." },
            { type: "CODE", language: "text", caption: "A Linux SSH auth log entry", code: "Jan 15 03:24:11 web01 sshd[2841]: Failed password for root from 203.0.113.45 port 52344 ssh2" },
            { type: "TEXT", text: "Read that line: on Jan 15 at 03:24, host `web01`'s SSH service recorded a **failed password** attempt for the `root` account, coming from IP `203.0.113.45`. One line, and already you know the *who, what, when, and where*." },
            { type: "CALLOUT", variant: "warning", title: "Root login attempts at 3 a.m.", text: "A failed root login in the middle of the night from an unfamiliar external IP is exactly the kind of entry that should make an analyst lean in." },
            { type: "KNOWLEDGE_CHECK", question: "In the log line above, what is `203.0.113.45`?", options: [
              { id: "A", text: "The server being attacked" },
              { id: "B", text: "The source IP the login attempt came from" },
              { id: "C", text: "The username" },
              { id: "D", text: "The port on the server" },
            ], correct: "B", explanation: "`from 203.0.113.45` is the source IP address the failed login originated from." },
          ],
          flashcards: [
            { front: "What four things does a typical log entry contain?", back: "Timestamp, source, event type, and details." },
            { front: "In 'Failed password for root from 203.0.113.45', what does the IP represent?", back: "The source address the login attempt came from." },
          ],
        },
        {
          title: "Log Types & Sources",
          summary: "Where to look for what.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "Different questions need different logs:\n\n**Authentication logs** — who logged in / failed to. (`/var/log/auth.log`, Windows Security Event Log)\n**System logs** — service starts, errors, crashes.\n**Web server logs** — every HTTP request to a site (great for spotting web attacks).\n**Firewall / network logs** — allowed and blocked connections.\n**DNS logs** — domain lookups, useful for catching malware calling home." },
            { type: "CALLOUT", variant: "tip", title: "Windows Event IDs", text: "On Windows, key events have numeric IDs. 4624 = successful logon, 4625 = failed logon, 4688 = a new process was created. Memorising a few high-value Event IDs makes you fast." },
            { type: "KNOWLEDGE_CHECK", question: "You want to see every HTTP request made to a website. Which log do you check?", options: [
              { id: "A", text: "Authentication log" },
              { id: "B", text: "Web server access log" },
              { id: "C", text: "DNS log" },
              { id: "D", text: "Firewall log" },
            ], correct: "B", explanation: "Web server access logs record each HTTP request — the go-to source for investigating web attacks." },
          ],
          flashcards: [
            { front: "Windows Event ID 4625 means what?", back: "A failed logon. (4624 = successful logon, 4688 = process creation.)" },
            { front: "Which log shows every HTTP request to a site?", back: "The web server access log." },
          ],
        },
        {
          title: "Mini Assessment: Log Triage",
          summary: "Apply your log-reading skills.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "You're on Tier 1. These four log lines arrive within the same minute from host `web01`:" },
            { type: "CODE", language: "text", code: "03:24:11 sshd: Failed password for root from 203.0.113.45\n03:24:12 sshd: Failed password for root from 203.0.113.45\n03:24:14 sshd: Failed password for admin from 203.0.113.45\n03:24:19 sshd: Accepted password for admin from 203.0.113.45" },
            { type: "CALLOUT", variant: "warning", title: "Read the whole story", text: "Don't just look at each line — look at the sequence. What changed on the last line?" },
            { type: "KNOWLEDGE_CHECK", question: "What is the most alarming thing about this sequence?", options: [
              { id: "A", text: "Nothing — failed logins are normal" },
              { id: "B", text: "After several failures, one attempt SUCCEEDED ('Accepted') from the same attacking IP" },
              { id: "C", text: "The timestamps are too close together" },
              { id: "D", text: "The host is named web01" },
            ], correct: "B", explanation: "The pattern shows a brute-force attempt that ultimately *succeeded* — the attacker got in as 'admin'. This is now a confirmed compromise, not just noise. Escalate immediately." },
          ],
          flashcards: [
            { front: "In a brute-force log sequence, which line turns 'suspicious' into 'confirmed breach'?", back: "The 'Accepted password' line — a successful login from the same attacking source after repeated failures." },
          ],
        },
      ],
      quiz: {
        title: "Module 3 Quiz: Logs",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "Windows Event ID 4625 indicates:", options: ["Successful logon", "Failed logon", "Process creation", "Account created"], correct: "Failed logon" },
          { type: "MULTIPLE_CHOICE", question: "To investigate a web attack, the most useful log is the:", options: ["DNS log", "Web server access log", "Kernel log", "Backup log"], correct: "Web server access log" },
          { type: "TRUE_FALSE", question: "A successful login from a source that just brute-forced you is a confirmed compromise.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Which log records who logged in and failed?", options: ["Authentication log", "Web log", "Print log", "Temp log"], correct: "Authentication log" },
          { type: "FILL_BLANK", question: "On Windows, Event ID 46___ indicates a successful logon.", correct: "24" },
        ],
      },
    },

    // ─── Module 4 ───────────────────────────────────────────────
    {
      title: "SIEM Concepts",
      description: "Bringing all the logs together.",
      lessons: [
        {
          title: "What is a SIEM?",
          summary: "One pane of glass.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "A **SIEM** (Security Information and Event Management) system collects logs from across the whole organisation into one place, **correlates** them, and raises **alerts** when patterns match detection rules.\n\nWithout a SIEM you'd be checking dozens of separate log sources by hand. With one, a rule can say: *'if there are 20+ failed logins followed by a success from the same IP, alert.'* Popular SIEMs include Splunk, Microsoft Sentinel, and Elastic." },
            { type: "CALLOUT", variant: "info", title: "Collect, correlate, alert", text: "That's the SIEM in three words. It ingests logs, connects related events across sources, and fires alerts for analysts to triage." },
            { type: "KNOWLEDGE_CHECK", question: "What is the primary value a SIEM adds over reading raw logs?", options: [
              { id: "A", text: "It deletes old logs to save space" },
              { id: "B", text: "It centralises and correlates logs from many sources and raises alerts" },
              { id: "C", text: "It replaces the need for analysts" },
              { id: "D", text: "It encrypts all network traffic" },
            ], correct: "B", explanation: "A SIEM's power is aggregation and correlation — connecting events across sources and alerting on meaningful patterns." },
          ],
          flashcards: [
            { front: "What does SIEM stand for?", back: "Security Information and Event Management." },
            { front: "A SIEM in three words?", back: "Collect, correlate, alert." },
          ],
        },
        {
          title: "Correlation & Detection Rules",
          summary: "Turning events into alerts.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "**Correlation** connects individual events into a meaningful story. A failed login is one event. A failed login from a foreign IP, followed by a success, followed by a new admin account being created — that's a correlated chain that screams 'compromise'.\n\n**Detection rules** encode these patterns. A rule has logic ('X then Y within Z minutes') and a severity. Well-tuned rules catch real threats; poorly-tuned ones flood analysts with **false positives**." },
            { type: "CALLOUT", variant: "warning", title: "Alert fatigue is real", text: "Too many false-positive alerts and analysts start ignoring them — meaning the real one slips through. Tuning rules to cut noise is a genuine security control, not just housekeeping." },
            { type: "KNOWLEDGE_CHECK", question: "An alert fires but investigation shows it was harmless, expected activity. This is a:", options: [
              { id: "A", text: "True positive" },
              { id: "B", text: "False positive" },
              { id: "C", text: "False negative" },
              { id: "D", text: "True negative" },
            ], correct: "B", explanation: "An alert on benign activity is a false positive. The dangerous opposite — a real attack that generates NO alert — is a false negative." },
          ],
          flashcards: [
            { front: "What is a false positive?", back: "An alert that fires on benign activity — no actual threat." },
            { front: "What is a false negative? Why is it dangerous?", back: "A real attack that produces no alert. It's dangerous because it goes completely unnoticed." },
            { front: "What is alert fatigue?", back: "When too many false positives cause analysts to ignore alerts, letting real threats slip through." },
          ],
        },
      ],
      quiz: {
        title: "Module 4 Quiz: SIEM",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "SIEM stands for:", options: ["Secure Internet Event Monitor", "Security Information and Event Management", "System Intrusion Escalation Manager", "Signature Inspection Engine Model"], correct: "Security Information and Event Management" },
          { type: "MULTIPLE_CHOICE", question: "An alert that fires on harmless activity is a:", options: ["True positive", "False positive", "False negative", "True negative"], correct: "False positive" },
          { type: "MULTIPLE_CHOICE", question: "A real attack that generates no alert is a:", options: ["True positive", "False positive", "False negative", "True negative"], correct: "False negative" },
          { type: "TRUE_FALSE", question: "Tuning detection rules to reduce false positives is a real security improvement.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Connecting related events across sources into one story is called:", options: ["Encryption", "Correlation", "Compression", "Rotation"], correct: "Correlation" },
        ],
      },
    },

    // ─── Module 5 ───────────────────────────────────────────────
    {
      title: "Alert Investigation",
      description: "From alert to verdict.",
      lessons: [
        {
          title: "The Triage Process",
          summary: "A repeatable method.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "When an alert lands, work it methodically:\n\n1. **Understand the alert** — what rule fired, and why?\n2. **Gather context** — which user, host, IP? What's normal for them?\n3. **Corroborate** — pull related logs. Does the story hold together?\n4. **Decide** — true positive (real), false positive (benign), or needs escalation?\n5. **Document** — record what you found and did, clearly.\n\nGood documentation isn't bureaucracy — the next analyst (or a court) may rely on your notes." },
            { type: "KNOWLEDGE_CHECK", question: "What should you do FIRST when a new alert arrives?", options: [
              { id: "A", text: "Immediately shut down the affected machine" },
              { id: "B", text: "Understand what rule fired and gather context" },
              { id: "C", text: "Email the whole company" },
              { id: "D", text: "Close it as a false positive to save time" },
            ], correct: "B", explanation: "Start by understanding the alert and gathering context. Acting (like shutting a machine down) comes after you understand what's happening." },
          ],
          flashcards: [
            { front: "The five triage steps?", back: "Understand the alert → gather context → corroborate with related logs → decide (TP/FP/escalate) → document." },
            { front: "Why does documentation matter in triage?", back: "The next analyst — or a legal process — may rely on your notes as the record of what happened." },
          ],
        },
        {
          title: "Indicators of Compromise (IOCs)",
          summary: "The fingerprints of an attack.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "An **Indicator of Compromise (IOC)** is a piece of forensic evidence that a system may be breached. Common IOCs:\n\n- Malicious **file hashes** (MD5/SHA-256 of known malware)\n- Suspicious **IP addresses** and **domains** (C2 servers)\n- Unusual **registry keys** or **scheduled tasks** (persistence)\n- Unexpected **outbound connections** (data exfiltration)\n\nWhen you find one IOC, you sweep the environment for the same indicator elsewhere — one infected host is rarely the only one." },
            { type: "CALLOUT", variant: "tip", title: "IOC vs IOA", text: "An IOC is evidence an attack *has happened* (a known-bad hash). An Indicator of Attack (IOA) focuses on *behaviour in progress* (a process spawning a shell) — catching attacks earlier, before damage is done." },
            { type: "KNOWLEDGE_CHECK", question: "A SHA-256 hash of a known malware sample is an example of a(n):", options: [
              { id: "A", text: "Baseline" },
              { id: "B", text: "Indicator of Compromise (IOC)" },
              { id: "C", text: "Firewall rule" },
              { id: "D", text: "Detection tier" },
            ], correct: "B", explanation: "A known-bad file hash is a classic IOC — forensic evidence tying an artefact to a known threat." },
          ],
          flashcards: [
            { front: "What is an IOC?", back: "Indicator of Compromise — forensic evidence that a system may be breached (bad hashes, IPs, domains, registry keys)." },
            { front: "IOC vs IOA?", back: "IOC = evidence an attack happened (e.g. a bad hash). IOA = behaviour of an attack in progress (e.g. a process spawning a shell)." },
          ],
        },
        {
          title: "Mini Assessment: Work the Alert",
          summary: "Triage a real-looking alert.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "Your SIEM fires: *'Impossible travel — user `j.patel` logged in from London at 09:02 and from Singapore at 09:40.'* You pull context: j.patel is a UK-based accountant, the Singapore login used a VPN provider's IP range, and it was followed by a bulk download of financial records." },
            { type: "KNOWLEDGE_CHECK", question: "What is the correct verdict and action?", options: [
              { id: "A", text: "False positive — VPNs are normal, close it" },
              { id: "B", text: "True positive — likely account compromise; escalate, disable the account, and preserve evidence" },
              { id: "C", text: "Ignore it — accountants travel" },
              { id: "D", text: "Delete the logs to stop the alert" },
            ], correct: "B", explanation: "Impossible travel + an unusual location + a bulk sensitive-data download is a strong compromise pattern. This is a true positive: escalate, contain by disabling the account, and preserve evidence for investigation." },
          ],
          flashcards: [
            { front: "What does an 'impossible travel' alert mean?", back: "The same account logged in from two locations too far apart to travel between in the elapsed time — suggesting the credentials are used by more than one person." },
          ],
        },
      ],
      quiz: {
        title: "Module 5 Quiz: Investigation",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "A known-bad file hash is an example of a(n):", options: ["Baseline", "IOC", "Firewall rule", "SIEM"], correct: "IOC" },
          { type: "MULTIPLE_CHOICE", question: "The first step when an alert arrives is to:", options: ["Shut down the host", "Understand the alert and gather context", "Email everyone", "Close it"], correct: "Understand the alert and gather context" },
          { type: "MULTIPLE_CHOICE", question: "An indicator focused on attacker behaviour in progress is a(n):", options: ["IOC", "IOA", "SLA", "MFA"], correct: "IOA" },
          { type: "TRUE_FALSE", question: "'Impossible travel' plus a bulk sensitive-data download is a strong compromise signal.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Good triage documentation matters because:", options: ["It's just policy", "The next analyst or a legal process may rely on it", "It slows attackers down", "It encrypts the logs"], correct: "The next analyst or a legal process may rely on it" },
        ],
      },
    },

    // ─── Module 6 ───────────────────────────────────────────────
    {
      title: "Incident Response",
      description: "What to do when it's real.",
      lessons: [
        {
          title: "The IR Lifecycle",
          summary: "PICERL — the six phases.",
          durationMin: 9,
          blocks: [
            { type: "TEXT", text: "Incident Response follows a recognised lifecycle (the SANS **PICERL** model):\n\n1. **Preparation** — tools, plans, and training *before* anything happens.\n2. **Identification** — confirm an incident is real and scope it.\n3. **Containment** — stop the bleeding (isolate hosts, disable accounts).\n4. **Eradication** — remove the threat (delete malware, close the entry point).\n5. **Recovery** — restore systems safely and verify they're clean.\n6. **Lessons Learned** — review what happened and improve." },
            { type: "CALLOUT", variant: "important", title: "Contain before you eradicate", text: "A common beginner mistake is rushing to delete malware before isolating the host. Contain first — otherwise the attacker may notice, and spread or destroy evidence." },
            { type: "KNOWLEDGE_CHECK", question: "You've confirmed a laptop is infected and actively beaconing to a C2 server. What is the immediate next phase?", options: [
              { id: "A", text: "Lessons Learned" },
              { id: "B", text: "Containment — isolate the host from the network" },
              { id: "C", text: "Preparation" },
              { id: "D", text: "Recovery" },
            ], correct: "B", explanation: "Once identified, the priority is containment — isolate the host to cut off the C2 channel and stop spread, before eradicating." },
          ],
          flashcards: [
            { front: "What are the six PICERL phases of incident response?", back: "Preparation, Identification, Containment, Eradication, Recovery, Lessons Learned." },
            { front: "Why contain before eradicate?", back: "To stop spread and preserve evidence before the attacker reacts." },
          ],
        },
        {
          title: "Containment & Evidence",
          summary: "Stop the harm, keep the proof.",
          durationMin: 7,
          blocks: [
            { type: "TEXT", text: "**Containment** limits damage: isolate infected machines from the network, disable compromised accounts, block malicious IPs. It buys time to investigate safely.\n\nCrucially, you must **preserve evidence** while doing this. Pulling the power cord destroys volatile memory (RAM) that may hold the only trace of what happened. Follow the **order of volatility**: capture the most fleeting evidence (memory, running processes) before the more permanent (disk)." },
            { type: "CALLOUT", variant: "warning", title: "Don't just wipe and reboot", text: "The instinct to 'reimage it and move on' destroys evidence and may leave you blind to how the attacker got in — meaning they walk right back through the same door." },
            { type: "KNOWLEDGE_CHECK", question: "According to the order of volatility, which evidence should you capture FIRST?", options: [
              { id: "A", text: "Data on the hard disk" },
              { id: "B", text: "Volatile memory (RAM) and running processes" },
              { id: "C", text: "Printed documents" },
              { id: "D", text: "Backup tapes" },
            ], correct: "B", explanation: "Volatile evidence like RAM and running processes vanishes when the machine powers off, so it's captured first — before the more stable disk data." },
          ],
          flashcards: [
            { front: "What is the order of volatility?", back: "Capture the most fleeting evidence first (RAM, running processes) before the more permanent (disk, backups)." },
            { front: "Why not just reimage a compromised machine immediately?", back: "It destroys evidence of how the attacker got in — so they may re-enter the same way." },
          ],
        },
      ],
      quiz: {
        title: "Module 6 Quiz: Incident Response",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "The IR phase that isolates infected hosts is:", options: ["Eradication", "Containment", "Recovery", "Preparation"], correct: "Containment" },
          { type: "MULTIPLE_CHOICE", question: "According to order of volatility, capture this first:", options: ["Disk image", "RAM / running processes", "Backups", "Log archives"], correct: "RAM / running processes" },
          { type: "FILL_BLANK", question: "The SANS IR model is remembered by the acronym PIC___L.", correct: "ER" },
          { type: "TRUE_FALSE", question: "You should eradicate malware before containing the host.", correct: "false", explanation: "Contain first, then eradicate — to prevent spread and preserve evidence." },
          { type: "MULTIPLE_CHOICE", question: "The final IR phase, focused on improvement, is:", options: ["Recovery", "Lessons Learned", "Identification", "Containment"], correct: "Lessons Learned" },
        ],
      },
    },

    // ─── Module 7 ───────────────────────────────────────────────
    {
      title: "Threat Intelligence",
      description: "Knowing your enemy in advance.",
      lessons: [
        {
          title: "Threat Intel & MITRE ATT&CK",
          summary: "Frameworks that give you the attacker's playbook.",
          durationMin: 8,
          blocks: [
            { type: "TEXT", text: "**Threat intelligence** is knowledge about adversaries — their tools, techniques, and targets — used to make better defensive decisions. It ranges from **strategic** (who's likely to target our industry) to **tactical** (specific IOCs to block right now).\n\nThe **MITRE ATT&CK** framework is the industry-standard catalogue of attacker **tactics and techniques**, mapped across the attack lifecycle. When an analyst says an alert maps to 'T1059 — Command and Scripting Interpreter', they're using ATT&CK to describe exactly what the attacker did." },
            { type: "CALLOUT", variant: "info", title: "TTPs", text: "Tactics, Techniques, and Procedures. Tactics = the attacker's goal (e.g. persistence). Techniques = how they achieve it. Procedures = the specific implementation. TTPs are harder for attackers to change than IOCs — so detecting on TTPs is more durable." },
            { type: "KNOWLEDGE_CHECK", question: "The MITRE ATT&CK framework is best described as:", options: [
              { id: "A", text: "A type of firewall" },
              { id: "B", text: "A knowledge base of attacker tactics and techniques" },
              { id: "C", text: "An antivirus product" },
              { id: "D", text: "A password manager" },
            ], correct: "B", explanation: "MITRE ATT&CK is a curated knowledge base mapping the tactics and techniques adversaries use — a shared language for defenders." },
          ],
          flashcards: [
            { front: "What is MITRE ATT&CK?", back: "An industry-standard knowledge base of attacker tactics and techniques, mapped across the attack lifecycle." },
            { front: "What does TTP stand for?", back: "Tactics, Techniques, and Procedures — the attacker's methods, harder to change than simple IOCs." },
          ],
        },
        {
          title: "Using Intel in the SOC",
          summary: "From feed to defence.",
          durationMin: 6,
          blocks: [
            { type: "TEXT", text: "Threat intel feeds provide fresh IOCs and adversary reports. A SOC uses them to:\n\n- **Block** known-bad IPs, domains, and hashes proactively.\n- **Enrich** alerts — 'this IP is linked to a known ransomware group'.\n- **Hunt** — search historical logs for a newly-published IOC to find past intrusions.\n\nIntel is only useful if it's **relevant, timely, and actionable**. A feed of threats aimed at a totally different industry just adds noise." },
            { type: "KNOWLEDGE_CHECK", question: "A new threat report lists an IP used by a ransomware crew. The best proactive use is to:", options: [
              { id: "A", text: "Ignore it unless you're already breached" },
              { id: "B", text: "Block the IP and hunt historical logs for prior contact with it" },
              { id: "C", text: "Email it to all staff" },
              { id: "D", text: "Delete your firewall rules" },
            ], correct: "B", explanation: "Actionable intel gets applied: block the indicator going forward, and retro-hunt your logs to check you weren't already in contact with it." },
          ],
          flashcards: [
            { front: "Three ways a SOC uses threat intel?", back: "Block known-bad indicators, enrich alerts with context, and hunt historical logs for newly-published IOCs." },
            { front: "What makes threat intel useful?", back: "It must be relevant, timely, and actionable." },
          ],
        },
      ],
      quiz: {
        title: "Module 7 Quiz: Threat Intelligence",
        questions: [
          { type: "MULTIPLE_CHOICE", question: "MITRE ATT&CK is:", options: ["A firewall", "A knowledge base of attacker tactics and techniques", "An antivirus", "A SIEM vendor"], correct: "A knowledge base of attacker tactics and techniques" },
          { type: "MULTIPLE_CHOICE", question: "TTP stands for:", options: ["Threat Tracking Protocol", "Tactics, Techniques, and Procedures", "Trusted Transfer Path", "Total Threat Prevention"], correct: "Tactics, Techniques, and Procedures" },
          { type: "TRUE_FALSE", question: "Searching old logs for a newly-published IOC is called threat hunting.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "Useful threat intelligence must be:", options: ["Expensive", "Relevant, timely, and actionable", "Secret", "Automated only"], correct: "Relevant, timely, and actionable" },
        ],
      },
    },

    // ─── Module 8 ───────────────────────────────────────────────
    {
      title: "Final Assessment: SOC Analyst",
      description: "Prove you can work the floor.",
      lessons: [
        {
          title: "End-to-End Investigation",
          summary: "One incident, start to finish.",
          durationMin: 10,
          blocks: [
            { type: "TEXT", text: "Bring it all together. Walk through this incident as a Tier 1 analyst.\n\n*At 02:14, your SIEM correlates: 40 failed SSH logins to `db-prod` from `198.51.100.7`, then one success as `svc_backup`, then that account creating a new user `sys_helper` and a scheduled task named `updater`.*" },
            { type: "CALLOUT", variant: "warning", title: "Think in stages", text: "Map what you see to concepts you've learned: brute force, successful compromise, persistence. What phase of response comes next?" },
            { type: "KNOWLEDGE_CHECK", question: "The new user `sys_helper` and scheduled task `updater` created by the attacker are examples of:", options: [
              { id: "A", text: "False positives" },
              { id: "B", text: "Persistence mechanisms" },
              { id: "C", text: "Backups" },
              { id: "D", text: "Normal maintenance" },
            ], correct: "B", explanation: "Creating new accounts and scheduled tasks lets the attacker regain access later — that's persistence, a key MITRE ATT&CK tactic." },
            { type: "KNOWLEDGE_CHECK", question: "Given a confirmed successful compromise of a production database, your immediate priority is:", options: [
              { id: "A", text: "Write the lessons-learned report" },
              { id: "B", text: "Escalate and contain — isolate db-prod and disable svc_backup — while preserving evidence" },
              { id: "C", text: "Reboot the server and move on" },
              { id: "D", text: "Wait to see if it happens again" },
            ], correct: "B", explanation: "This is a confirmed compromise of a critical asset. Escalate and contain (isolate the host, disable the abused account) while preserving evidence — before eradication and recovery." },
          ],
          flashcards: [
            { front: "Creating new accounts / scheduled tasks after a breach is which ATT&CK tactic?", back: "Persistence — maintaining access for later." },
          ],
        },
      ],
      quiz: {
        title: "Final Assessment: SOC Analyst Fundamentals",
        passMark: 70,
        questions: [
          { type: "MULTIPLE_CHOICE", question: "A run of failed logins followed by one success from the same IP indicates:", options: ["A false positive", "A successful brute-force compromise", "Normal user behaviour", "A DNS error"], correct: "A successful brute-force compromise" },
          { type: "MULTIPLE_CHOICE", question: "Creating a new account and scheduled task after a breach is which tactic?", options: ["Reconnaissance", "Persistence", "Exfiltration", "Delivery"], correct: "Persistence" },
          { type: "MULTIPLE_CHOICE", question: "The correct order of the first IR phases after Preparation is:", options: ["Recovery → Containment → Identification", "Identification → Containment → Eradication", "Eradication → Identification → Recovery", "Containment → Lessons Learned → Identification"], correct: "Identification → Containment → Eradication" },
          { type: "MULTIPLE_CHOICE", question: "A SIEM's core function is to:", options: ["Encrypt disks", "Collect, correlate, and alert on logs", "Replace analysts", "Block all traffic"], correct: "Collect, correlate, and alert on logs" },
          { type: "MULTIPLE_CHOICE", question: "A real attack that produces no alert is a:", options: ["True positive", "False positive", "False negative", "Baseline"], correct: "False negative" },
          { type: "TRUE_FALSE", question: "You should capture volatile memory before imaging the disk.", correct: "true" },
          { type: "MULTIPLE_CHOICE", question: "MITRE ATT&CK provides:", options: ["A firewall ruleset", "A shared language of attacker tactics and techniques", "A patch schedule", "An encryption standard"], correct: "A shared language of attacker tactics and techniques" },
          { type: "MULTIPLE_CHOICE", question: "The safest first action on a confirmed compromised host is to:", options: ["Delete it", "Contain it while preserving evidence", "Ignore it", "Publicly disclose it"], correct: "Contain it while preserving evidence" },
        ],
      },
    },
  ],
};
