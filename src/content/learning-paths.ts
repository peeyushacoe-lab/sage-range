/**
 * Learning path library.
 *
 * Each path carries modules, and each module carries a quiz. That matters:
 * Module and Quiz were both empty in production while /paths/[slug]/modules/
 * [moduleId] rendered quizzes, so every path was a shell.
 *
 * Quizzes are the main surface where negative marking bites, since they are
 * scored server-side. Questions are therefore written so that a plausible
 * wrong answer is genuinely tempting — a quiz where the right answer is
 * obvious teaches nothing and penalises nobody.
 */

export type QuizQuestionSeed = {
  /**
   * Mirrors the QuestionType enum in schema.prisma.
   * MULTIPLE_CHOICE takes one option index; MULTIPLE_SELECT takes the exact set.
   */
  type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT";
  question: string;
  options: string[];
  /** Index, or indices for MULTI. */
  correctAnswer: number | number[];
  explanation: string;
};

export type ModuleSeed = {
  title: string;
  overview: string;
  readingMaterial: string;
  quiz: {
    title: string;
    passMark: number;
    questions: QuizQuestionSeed[];
  };
};

export type PathSeed = {
  /**
   * Slug of the path these modules belong to.
   *
   * Seven of these target paths that already exist and had no modules at all —
   * filling a shell is worth more than publishing a near-duplicate beside it.
   * The rest are genuinely new topics.
   */
  slug: string;
  title: string;
  description: string;
  modules: ModuleSeed[];
};

/**
 * Shared question bank, keyed by topic.
 *
 * Paths reuse these rather than each defining its own, so a concept is taught
 * and tested the same way wherever it appears. Every distractor is a real
 * misconception rather than filler.
 */
const Q = {
  triageSeverity: {
    type: "MULTIPLE_CHOICE" as const,
    question:
      "An EDR alert fires for PowerShell spawned by WINWORD.EXE on a finance workstation. No further activity is visible yet. What severity?",
    options: [
      "Low — PowerShell is used legitimately across the estate",
      "High — Office spawning a shell is a known initial-access pattern",
      "Critical — assume full domain compromise",
      "Informational — wait for a second alert before assessing",
    ],
    correctAnswer: 1,
    explanation:
      "Office spawning a shell is rarely benign and is the classic first stage of a macro intrusion. Critical would over-call it on one alert; Low or Informational risks missing the only warning you get.",
  },
  falsePositive: {
    type: "MULTIPLE_CHOICE" as const,
    question: "What is the strongest basis for closing an alert as a false positive?",
    options: [
      "The alert fires frequently and has never been real",
      "A benign explanation fits every observation, corroborated by a change record",
      "The affected user says they did nothing unusual",
      "The endpoint's antivirus reports the system as clean",
    ],
    correctAnswer: 1,
    explanation:
      "Frequency is how real intrusions hide in noise. A closure needs a benign explanation that accounts for all the evidence, ideally with independent corroboration.",
  },
  logSources: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which sources meaningfully evidence that a binary executed on Windows?",
    options: ["Prefetch", "Amcache", "Recycle Bin contents", "Sysmon Event ID 1"],
    correctAnswer: [0, 1, 3],
    explanation:
      "Prefetch, Amcache and Sysmon process-creation all evidence execution. The Recycle Bin shows deletion, not execution.",
  },
  containment: {
    type: "MULTIPLE_CHOICE" as const,
    question: "A compromised host is actively encrypting a file share. What do you do first?",
    options: [
      "Power the host off to stop encryption immediately",
      "Network-isolate the host, leaving it powered on",
      "Run a full antivirus scan",
      "Collect a disk image before touching anything",
    ],
    correctAnswer: 1,
    explanation:
      "Isolation stops the spread while preserving memory-resident evidence. Powering off destroys it; imaging first lets encryption continue.",
  },
  notification: {
    type: "MULTIPLE_CHOICE" as const,
    question: "When does the UK GDPR 72-hour notification clock start?",
    options: [
      "When the full scope of affected records is confirmed",
      "When the organisation becomes aware of a likely personal data breach",
      "When the regulator makes contact",
      "When remediation is complete",
    ],
    correctAnswer: 1,
    explanation:
      "Awareness starts the clock, not certainty. Waiting for full scope is the most common and most expensive misreading.",
  },
  sigmaStructure: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Which Sigma section defines what must match for a rule to fire?",
    options: ["logsource", "detection", "falsepositives", "level"],
    correctAnswer: 1,
    explanation:
      "detection holds the search identifiers and condition. logsource narrows where the rule applies but does not decide a match.",
  },
  tuning: {
    type: "MULTIPLE_CHOICE" as const,
    question: "A detection fires 400 times a day, all benign. What is the correct first action?",
    options: [
      "Delete the rule",
      "Raise its severity so analysts take it seriously",
      "Tune the logic against the benign pattern",
      "Suppress the entire log source",
    ],
    correctAnswer: 2,
    explanation:
      "Tune it. Deleting loses the coverage, suppressing the source blinds you far beyond this rule, and raising severity makes the noise louder.",
  },
  beaconing: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which observations genuinely separate C2 beaconing from ordinary polling?",
    options: [
      "A consistent interval with very low jitter",
      "The destination is a well-known CDN",
      "Uniformly small response sizes",
      "Traffic occurring only during working hours",
    ],
    correctAnswer: [0, 2],
    explanation:
      "Regular timing and uniform small payloads are the signal. Plenty of legitimate software polls a CDN, and working-hours traffic describes most of the estate.",
  },
  privEsc: {
    type: "MULTIPLE_CHOICE" as const,
    question:
      "A workstation requests DS-Replication-Get-Changes-All against a domain controller. What does this indicate?",
    options: [
      "Normal replication between domain controllers",
      "DCSync — the host is requesting password material",
      "A failed Group Policy update",
      "Routine directory backup",
    ],
    correctAnswer: 1,
    explanation:
      "Only domain controllers should replicate. A workstation making this request is performing DCSync, which yields password hashes including KRBTGT.",
  },
  cloudIam: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which reduce the blast radius of a compromised cloud instance profile?",
    options: [
      "Scoping the role to specific resources rather than *",
      "Enforcing IMDSv2",
      "Enabling detailed billing alerts",
      "Applying a permissions boundary",
    ],
    correctAnswer: [0, 1, 3],
    explanation:
      "Scoping, IMDSv2 and permissions boundaries all constrain what a stolen credential can do. Billing alerts tell you afterwards; they contain nothing.",
  },
  phishingHeaders: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Which header most reliably shows where a message actually originated?",
    options: ["From", "Reply-To", "The earliest Received hop", "X-Mailer"],
    correctAnswer: 2,
    explanation:
      "From and Reply-To are attacker-controlled. The Received chain, read from the bottom up, shows the submitting host.",
  },
  evidenceOrder: {
    type: "MULTIPLE_CHOICE" as const,
    question: "Which should be collected first from a live compromised host?",
    options: ["Disk image", "Memory", "Event logs", "Registry hives"],
    correctAnswer: 1,
    explanation:
      "Order of volatility. Memory holds injected code, network state and decrypted keys, and is gone the moment the host is powered off.",
  },
  reporting: {
    type: "MULTIPLE_CHOICE" as const,
    question: "You cannot yet confirm whether data was exfiltrated. How should the report read?",
    options: [
      "State that data was exfiltrated, to be cautious",
      "State that no data was exfiltrated until proven otherwise",
      "State what the evidence shows, what it does not, and what would resolve it",
      "Omit the question until the investigation concludes",
    ],
    correctAnswer: 2,
    explanation:
      "Both over- and under-claiming are corrected later at your expense. Stating the boundary of what is known is the only position that survives review.",
  },
  hunting: {
    type: "MULTIPLE_CHOICE" as const,
    question: "A hunt across 30 days of proxy logs finds nothing. What may you conclude?",
    options: [
      "The environment is not compromised",
      "Beaconing does not occur in this environment",
      "Nothing matching that query, within that visibility, was present",
      "The hunt failed and should be discarded",
    ],
    correctAnswer: 2,
    explanation:
      "Absence of evidence is not evidence of absence. A hunt's value includes documenting coverage and its limits.",
  },
  webVulns: {
    type: "MULTIPLE_SELECT" as const,
    question: "Which findings would let an attacker read arbitrary internal endpoints?",
    options: [
      "Server-side request forgery",
      "Reflected cross-site scripting",
      "XML external entity processing",
      "Missing security headers",
    ],
    correctAnswer: [0, 2],
    explanation:
      "SSRF and XXE both make the server fetch resources on the attacker's behalf. Reflected XSS runs in a victim's browser; missing headers weaken defence in depth but read nothing.",
  },
  malwareTriage: {
    type: "MULTIPLE_CHOICE" as const,
    question: "A PE file has 7.98 entropy in one section and only five imports. What does this suggest?",
    options: [
      "A corrupted binary",
      "A packed binary resolving APIs at runtime",
      "A .NET assembly",
      "A digitally signed installer",
    ],
    correctAnswer: 1,
    explanation:
      "High entropy indicates compressed or encrypted content, and a near-empty import table means the real imports are resolved after unpacking, typically via LoadLibrary and GetProcAddress.",
  },
};

/** Modules are composed from the shared bank so concepts stay consistent. */
function mod(
  title: string,
  overview: string,
  reading: string,
  questions: QuizQuestionSeed[],
  passMark = 70,
): ModuleSeed {
  return {
    title,
    overview,
    readingMaterial: reading,
    quiz: { title: `${title} — Check`, passMark, questions },
  };
}

export const LEARNING_PATHS: PathSeed[] = [
  {
    slug: "soc-analyst-fundamentals",
    title: "SOC Analyst Foundations",
    description:
      "Work an alert queue properly: triage with evidence, separate real from noise, and escalate in a way the next analyst can act on.",
    modules: [
      mod(
        "Triage and severity",
        "How to assess an alert in the first two minutes without over- or under-calling it.",
        "Severity is a judgement about likely impact given what you can currently see, not a guess about the worst case. An Office process spawning a shell is a strong signal on its own; a single antivirus detection on a quarantined file usually is not. Record the reasoning, not just the verdict — the next analyst inherits your conclusion and needs to know what it rested on.",
        [Q.triageSeverity, Q.falsePositive],
      ),
      mod(
        "Reading the evidence",
        "Which log sources answer which questions, and what each cannot tell you.",
        "Execution, persistence and network activity are evidenced by different sources, and the common triage mistake is treating one as proof of another. Prefetch and Amcache evidence execution. Sysmon Event ID 1 gives you the command line and parent, which is usually the fastest route to a verdict. None of them prove intent.",
        [Q.logSources, Q.beaconing],
      ),
      mod(
        "Escalation and handover",
        "What belongs in an escalation, and what wastes the responder's first ten minutes.",
        "An escalation should state what happened, which assets are affected, what you have already done, and what you need. Attach the evidence rather than describing it. The test of a good handover is whether the receiving analyst can act without asking you anything.",
        [Q.reporting, Q.containment],
      ),
    ],
  },
  {
    slug: "incident-responder-path",
    title: "Incident Response in Practice",
    description:
      "Scope, contain and recover from a real intrusion — including the decisions that are commercial rather than technical.",
    modules: [
      mod(
        "Containment without destroying evidence",
        "Isolation, preservation, and the order that keeps both options open.",
        "Containment and forensics pull against each other, and the sequence matters more than either alone. Network isolation stops spread while leaving memory intact. Powering off is faster and destroys the artefacts most likely to explain what happened.",
        [Q.containment, Q.evidenceOrder],
      ),
      mod(
        "Scoping the compromise",
        "Establishing how far an intrusion reached, and when to stop looking.",
        "Scope is bounded by visibility, not by effort. State plainly which systems had telemetry and which did not — an unmonitored subnet is a gap in the finding, not an absence of compromise.",
        [Q.hunting, Q.privEsc],
      ),
      mod(
        "Notification and reporting",
        "Regulatory clocks, and writing what you actually know.",
        "The 72-hour clock runs from awareness of a likely breach. Preparing a notification in parallel with the investigation is what makes it possible to file honestly and on time rather than choosing between the two.",
        [Q.notification, Q.reporting],
      ),
    ],
  },
  {
    slug: "detection-engineer-path",
    title: "Detection Engineering",
    description:
      "Turn attacker behaviour into detections that survive contact with a real SOC, then tune them so they stay useful.",
    modules: [
      mod(
        "Rule structure",
        "How a detection is put together, and which part decides a match.",
        "A rule has a log source, a detection block, and metadata. The detection block decides what fires; everything else narrows scope or tells an analyst what to do. Rules written without a false-positive section tend to be deleted rather than tuned.",
        [Q.sigmaStructure, Q.tuning],
      ),
      mod(
        "Behavioural detection",
        "Detecting technique rather than indicator, and why that is harder to evade.",
        "Hashes and domains change between campaigns; behaviour changes only when tradecraft does. A rule keyed on Office spawning a shell outlives every hash in the report that inspired it.",
        [Q.beaconing, Q.privEsc],
      ),
      mod(
        "Validation and tuning",
        "Proving a detection works before it reaches production, and keeping it that way.",
        "A detection that has never fired in test is a hypothesis. Validate against known-good and known-bad, measure the false-positive rate against the SOC's actual capacity, and set a review date at the moment you deploy.",
        [Q.tuning, Q.falsePositive],
      ),
    ],
  },
  {
    slug: "threat-hunter-path",
    title: "Threat Hunting",
    description:
      "Hypothesis-driven hunting at scale, and reporting honestly on what a hunt did and did not establish.",
    modules: [
      mod(
        "Forming a hypothesis",
        "Turning 'find anything bad' into work that can actually be finished.",
        "A hunt needs a technique, an estate, and a definition of what would count as a finding — decided before you start, or you will find whatever you were hoping for. Narrow the scope until the hunt is completable.",
        [Q.hunting, Q.beaconing],
      ),
      mod(
        "Working at scale",
        "Baselining, and separating rare from anomalous.",
        "Rare is not the same as malicious, and most of the work is establishing what normal looks like. Without a baseline every hunt returns the same long tail of unusual-but-benign activity.",
        [Q.logSources, Q.malwareTriage],
      ),
      mod(
        "Reporting a hunt",
        "Writing up a hunt that found nothing, without either overclaiming or wasting it.",
        "The output of a negative hunt is a documented hypothesis, the query, the data coverage, and the limits. That record is what stops the same ground being covered again next quarter.",
        [Q.reporting, Q.hunting],
      ),
    ],
  },
  {
    slug: "cloud-security-analyst-path",
    title: "Cloud Security",
    description:
      "Identity boundaries, blast radius, and detection when the perimeter is an API rather than a firewall.",
    modules: [
      mod(
        "Identity is the perimeter",
        "Why least privilege is harder in cloud, and what actually constrains a stolen credential.",
        "Cloud compromise is usually credential compromise. Roles, trust relationships and transitive permissions mean the reachable blast radius is rarely what the role name suggests.",
        [Q.cloudIam, Q.privEsc],
      ),
      mod(
        "Reading the audit trail",
        "What an audit log proves, and the gaps attackers deliberately exploit.",
        "Audit coverage is regional and can be switched off. An unused region with no trail is a favourite staging ground precisely because nothing there is recorded.",
        [Q.cloudIam, Q.notification],
      ),
      mod(
        "Cloud incident response",
        "Containment when the asset is ephemeral and the evidence is an API call.",
        "Revoking a key is not containment if the attacker created an identity with it. Establish what persistence was created before you congratulate yourself on rotation.",
        [Q.containment, Q.reporting],
      ),
    ],
  },
  {
    slug: "advanced-forensics",
    title: "Digital Forensics",
    description:
      "Collect, preserve and interpret evidence in a way that stands up to scrutiny.",
    modules: [
      mod(
        "Acquisition and integrity",
        "Order of volatility, hashing, and keeping the copy defensible.",
        "Collect in order of volatility and hash at acquisition. A copy you cannot demonstrate is unchanged is a copy you cannot rely on when it matters.",
        [Q.evidenceOrder, Q.logSources],
      ),
      mod(
        "Windows artefacts",
        "What Prefetch, Amcache, ShimCache and the registry each genuinely evidence.",
        "Each artefact answers a narrow question. Treating any of them as a general execution record is how forensic conclusions get overturned.",
        [Q.logSources, Q.malwareTriage],
      ),
      mod(
        "Timeline analysis",
        "Building a timeline, and spotting when timestamps have been manipulated.",
        "Timestamps are evidence and can also be a target. $STANDARD_INFORMATION is trivially modified while $FILE_NAME is not, so a mismatch between them is itself a finding.",
        [Q.evidenceOrder, Q.reporting],
      ),
    ],
  },
  {
    slug: "malware-analysis",
    title: "Malware Analysis",
    description:
      "Reach a defensible verdict on an unknown binary, quickly, and know what you could not determine.",
    modules: [
      mod(
        "Safe handling and static triage",
        "What you can establish before executing anything.",
        "Static triage — hashes, entropy, imports, strings — is where triage starts, because execution is a decision with consequences. Packing is visible statically even when capability is not.",
        [Q.malwareTriage, Q.logSources],
      ),
      mod(
        "Dynamic analysis",
        "Observing behaviour, and interpreting a sample that does nothing.",
        "A sample that appears inert may be evading analysis or waiting for a trigger. Reporting it benign on that basis is one of the more expensive mistakes available.",
        [Q.malwareTriage, Q.beaconing],
      ),
      mod(
        "Extracting actionable indicators",
        "Turning analysis into something the SOC can use today.",
        "The output that matters is what can be blocked or hunted now, with confidence stated. An indicator without a confidence level generates work rather than reducing it.",
        [Q.reporting, Q.tuning],
      ),
    ],
  },
  {
    slug: "web-security-essentials",
    title: "Web Application Security",
    description:
      "Find, prove and communicate web vulnerabilities without causing the impact you are demonstrating.",
    modules: [
      mod(
        "Injection and input handling",
        "Where untrusted input crosses a boundary, and what happens when it does.",
        "Injection is a boundary problem: data crossing into a context that interprets it. The same reasoning covers SQL, command, template and header injection.",
        [Q.webVulns, Q.falsePositive],
      ),
      mod(
        "Server-side request forgery and XXE",
        "Making the server fetch on your behalf, and why cloud metadata makes it critical.",
        "SSRF matters disproportionately in cloud, where an internal metadata endpoint hands out credentials to anything that can reach it.",
        [Q.webVulns, Q.cloudIam],
      ),
      mod(
        "Reporting a finding",
        "Writing findings that get fixed rather than filed.",
        "A finding needs reproduction steps, the affected assets named, and a concrete fix. A severity score without those is a number nobody can act on.",
        [Q.reporting, Q.notification],
      ),
    ],
  },
  {
    slug: "email-and-social-engineering",
    title: "Email and Social Engineering",
    description:
      "Analyse phishing and business email compromise, and understand why technical controls keep failing to stop it.",
    modules: [
      mod(
        "Header analysis",
        "Establishing where a message really came from.",
        "SPF, DKIM and DMARC results, plus the Received chain, settle origin. The From header settles nothing — it is attacker-controlled text.",
        [Q.phishingHeaders, Q.falsePositive],
      ),
      mod(
        "Business email compromise",
        "Why BEC bypasses the controls that stop commodity phishing.",
        "BEC carries no payload, so payload-based controls see nothing. Legacy authentication protocols that cannot present an MFA challenge are the recurring root cause.",
        [Q.phishingHeaders, Q.notification],
      ),
      mod(
        "Response and user communication",
        "Containing a compromised mailbox, and telling people without blaming them.",
        "Revoking sessions and removing forwarding rules matters more than resetting the password alone. Users who expect blame report late, which is the outcome you can least afford.",
        [Q.containment, Q.reporting],
      ),
    ],
  },
  {
    slug: "active-directory-security",
    title: "Active Directory Security",
    description:
      "Understand how domain compromise actually happens, and what recovery genuinely requires.",
    modules: [
      mod(
        "Credential material in AD",
        "What can be stolen, from where, and what each theft enables.",
        "Kerberos and NTLM leave credential material in several places, and the consequence of theft differs sharply between them. DCSync yields the KRBTGT hash, which is the difference between an incident and a rebuild.",
        [Q.privEsc, Q.evidenceOrder],
      ),
      mod(
        "Detecting domain compromise",
        "The events that matter, and why most estates do not log them.",
        "Replication requests from non-domain-controllers, anomalous encryption types, and implausible ticket lifetimes are the highest-value signals — and the ones most often absent from collection.",
        [Q.privEsc, Q.logSources],
      ),
      mod(
        "Recovery",
        "Why a rebuild around a compromised KRBTGT achieves nothing.",
        "A single KRBTGT reset leaves the previous key valid for compatibility, so forged tickets keep working. The double reset, with replication allowed to complete between them, is the only thing that invalidates them.",
        [Q.privEsc, Q.containment],
      ),
    ],
  },
];
