/**
 * Additional Academy courses.
 *
 * The existing four cover fundamentals, SOC, web and Linux. These add the
 * areas a learner hits next and currently cannot: networking, cloud, forensics,
 * detection engineering, cryptography and threat intelligence.
 *
 * Lessons carry a summary and a duration because the Academy shows both; a
 * lesson without them renders as a bare title, which is what an empty course
 * looks like from the outside.
 */

export type LessonSeed = {
  title: string;
  summary: string;
  durationMin: number;
};

export type AcademyModuleSeed = {
  title: string;
  description: string;
  lessons: LessonSeed[];
};

export type AcademyCourseSeed = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category:
    | "FUNDAMENTALS"
    | "BLUE_TEAM"
    | "RED_TEAM"
    | "FORENSICS"
    | "SECURITY_ENGINEERING"
    | "NETWORKING"
    | "CLOUD";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  estimatedHrs: number;
  prerequisites: string[];
  objectives: string[];
  modules: AcademyModuleSeed[];
};

const L = (title: string, summary: string, durationMin = 8): LessonSeed => ({
  title,
  summary,
  durationMin,
});

export const ACADEMY_COURSES: AcademyCourseSeed[] = [
  {
    slug: "network-security-fundamentals",
    title: "Network Security Fundamentals",
    subtitle: "Reading traffic, spotting what does not belong",
    description:
      "Networks tell you what actually happened, not what a host claims happened. This course covers the protocols worth knowing, how to read a capture, and how to recognise tunnelling and exfiltration in traffic you cannot decrypt.",
    category: "NETWORKING",
    difficulty: "EASY",
    estimatedHrs: 8,
    prerequisites: [],
    objectives: [
      "Read a packet capture and find the conversation that matters",
      "Recognise beaconing, tunnelling and staged exfiltration",
      "Assess encrypted traffic without decrypting it",
      "Explain why east-west visibility matters more than perimeter",
    ],
    modules: [
      {
        title: "Protocols worth knowing",
        description: "The handful of protocols that carry most of what you will investigate.",
        lessons: [
          L("TCP, UDP and what a flow actually is", "Sessions, ports and why flow records answer most triage questions faster than packets."),
          L("DNS as an investigative goldmine", "Every connection starts with a name. What resolver logs give you that nothing else does."),
          L("HTTP and TLS", "What remains visible after encryption: SNI, certificates, JA3 fingerprints, timing and volume."),
          L("SMB and internal movement", "Why lateral movement is loud on the wire even when it is quiet on the host."),
        ],
      },
      {
        title: "Reading a capture",
        description: "Working from statistics down to packets, rather than the other way round.",
        lessons: [
          L("Start with conversations, not packets", "Finding the interesting flow among thousands before opening a single packet.", 10),
          L("Volume, duration and direction", "The three numbers that separate a beacon from a backup job."),
          L("Following a stream", "Reconstructing a session once you know which one matters."),
        ],
      },
      {
        title: "Finding the covert channel",
        description: "Exfiltration and command and control hidden in ordinary-looking traffic.",
        lessons: [
          L("Beacon detection", "Interval, jitter and payload uniformity as signal.", 10),
          L("DNS tunnelling", "Label length, query volume and NXDOMAIN rates.", 10),
          L("Staged exfiltration", "Recognising deliberate chunking, and estimating volume taken."),
        ],
      },
    ],
  },
  {
    slug: "cloud-security-essentials",
    title: "Cloud Security Essentials",
    subtitle: "Identity, blast radius and audit trails",
    description:
      "In cloud the perimeter is an API and the credential is the target. This course covers identity boundaries, what an audit trail does and does not record, and how cloud incidents differ from on-premises ones.",
    category: "CLOUD",
    difficulty: "MEDIUM",
    estimatedHrs: 10,
    prerequisites: ["cybersecurity-fundamentals"],
    objectives: [
      "Reason about blast radius rather than individual permissions",
      "Read an audit trail and recognise its gaps",
      "Contain a compromised cloud credential properly",
      "Identify the misconfigurations that actually cause breaches",
    ],
    modules: [
      {
        title: "Identity is the perimeter",
        description: "Roles, policies and the transitive access nobody intended to grant.",
        lessons: [
          L("Users, roles and assumption", "How a low-privilege identity becomes an administrative one through a chain nobody designed.", 10),
          L("Permissions boundaries and scoping", "Constraining what a stolen credential can reach."),
          L("Instance and workload identity", "Why metadata services are a favourite target, and what IMDSv2 changes."),
        ],
      },
      {
        title: "Audit trails",
        description: "What is recorded, where, and what an attacker does about it.",
        lessons: [
          L("Anatomy of an audit event", "Reading who did what, from where, with which identity."),
          L("Regional gaps and disabled trails", "Why unused regions are a staging ground.", 10),
          L("Detecting cloud persistence", "New identities, altered trust policies and fresh access keys."),
        ],
      },
      {
        title: "Storage and data exposure",
        description: "The misconfiguration that keeps appearing in breach reports.",
        lessons: [
          L("Public by accident", "How exposure happens, and how to prove whether anyone found it."),
          L("Encryption and key management", "What encryption at rest does and does not protect you from."),
          L("Responding to a researcher disclosure", "Handling a report well, and the clock it starts."),
        ],
      },
    ],
  },
  {
    slug: "digital-forensics-essentials",
    title: "Digital Forensics Essentials",
    subtitle: "Collecting and interpreting evidence that holds up",
    description:
      "Forensics is the discipline of not destroying the thing you are trying to examine. This course covers order of volatility, the Windows artefacts that answer specific questions, and building a timeline you can defend.",
    category: "FORENSICS",
    difficulty: "MEDIUM",
    estimatedHrs: 12,
    prerequisites: ["cybersecurity-fundamentals"],
    objectives: [
      "Collect evidence in the correct order and preserve its integrity",
      "Interpret Windows artefacts accurately rather than loosely",
      "Build a defensible timeline",
      "Recognise anti-forensic techniques",
    ],
    modules: [
      {
        title: "Acquisition",
        description: "Getting the evidence without changing it.",
        lessons: [
          L("Order of volatility", "Why memory comes before disk, and what powering off costs you.", 10),
          L("Imaging and hashing", "Demonstrating that a copy is unchanged since collection."),
          L("Live response trade-offs", "Collecting from a system that cannot be taken offline."),
        ],
      },
      {
        title: "Windows artefacts",
        description: "Which artefact answers which question, and the limits of each.",
        lessons: [
          L("Evidence of execution", "Prefetch, Amcache and ShimCache — and what each does not prove.", 10),
          L("Registry as a record", "Persistence, USB history and user activity."),
          L("Browser and file system artefacts", "Reconstructing user actions from ordinary usage traces."),
        ],
      },
      {
        title: "Timelines and anti-forensics",
        description: "Assembling a narrative, and spotting attempts to break it.",
        lessons: [
          L("Building a super timeline", "Merging sources without drowning in them.", 10),
          L("Timestomping", "Why $STANDARD_INFORMATION and $FILE_NAME disagreeing is itself a finding."),
          L("Log deletion and gaps", "Treating an absence as evidence in its own right."),
        ],
      },
    ],
  },
  {
    slug: "detection-engineering-essentials",
    title: "Detection Engineering Essentials",
    subtitle: "Writing rules that survive contact with a real SOC",
    description:
      "A detection that nobody can action is worse than no detection. This course covers rule structure, detecting behaviour rather than indicators, and the tuning loop that keeps a ruleset useful.",
    category: "BLUE_TEAM",
    difficulty: "MEDIUM",
    estimatedHrs: 10,
    prerequisites: ["soc-analyst-fundamentals"],
    objectives: [
      "Write a detection rule with a defensible condition",
      "Prefer behavioural signals over decaying indicators",
      "Validate a rule before it reaches production",
      "Tune against false positives without losing coverage",
    ],
    modules: [
      {
        title: "Rule anatomy",
        description: "How a detection is put together and which part decides a match.",
        lessons: [
          L("Log sources and field mapping", "Why the same rule behaves differently across two SIEMs."),
          L("Detection logic and conditions", "Selections, filters and the condition that ties them together.", 10),
          L("Metadata that matters", "Severity, false positives and the response guidance analysts actually read."),
        ],
      },
      {
        title: "Behaviour over indicators",
        description: "Detecting the technique rather than this week's hash.",
        lessons: [
          L("Why indicators decay", "Infrastructure is cheap to change; tradecraft is not.", 10),
          L("Parent-child process logic", "The single most productive behavioural pattern on Windows."),
          L("Detecting living-off-the-land", "Finding intrusions that use only built-in tooling.", 10),
        ],
      },
      {
        title: "Validation and tuning",
        description: "Proving a rule works, and keeping it that way.",
        lessons: [
          L("Testing against known-good and known-bad", "A rule that has never fired in test is a hypothesis."),
          L("Measuring false-positive rate", "Judging a rule against the SOC's actual capacity."),
          L("Detection as code", "Version control, review and rollback for rules."),
        ],
      },
    ],
  },
  {
    slug: "cryptography-for-defenders",
    title: "Cryptography for Defenders",
    subtitle: "What it protects, and what it does not",
    description:
      "Most cryptographic failures in practice are not broken algorithms but misapplied ones. This course covers what each primitive guarantees, where key management goes wrong, and how to reason about encrypted traffic during an incident.",
    category: "FUNDAMENTALS",
    difficulty: "MEDIUM",
    estimatedHrs: 8,
    prerequisites: ["cybersecurity-fundamentals"],
    objectives: [
      "Distinguish encoding, hashing and encryption confidently",
      "State what each primitive guarantees and what it does not",
      "Recognise common key-management failures",
      "Investigate effectively without decrypting traffic",
    ],
    modules: [
      {
        title: "Primitives",
        description: "The building blocks and the guarantees they actually offer.",
        lessons: [
          L("Encoding, hashing, encryption", "Three things routinely confused, with very different consequences.", 10),
          L("Symmetric and asymmetric", "What each is for, and why real systems use both."),
          L("Integrity and authenticity", "Why confidentiality without integrity is rarely enough."),
        ],
      },
      {
        title: "Where it goes wrong",
        description: "Failures that appear repeatedly in real assessments.",
        lessons: [
          L("Key management", "Hardcoded keys, unrotated secrets and the repository that keeps history forever.", 10),
          L("Password storage", "Why a fast hash is the wrong tool, and what to use instead."),
          L("Certificate validation", "Trusting a certificate is a decision, not a default."),
        ],
      },
      {
        title: "Encryption during an incident",
        description: "Investigating what you cannot read.",
        lessons: [
          L("Metadata still speaks", "SNI, certificate details, timing and volume."),
          L("Fingerprinting clients", "JA3 and JA4 as identification without decryption."),
          L("When decryption is appropriate", "Legal, ethical and practical considerations."),
        ],
      },
    ],
  },
  {
    slug: "threat-intelligence-essentials",
    title: "Threat Intelligence Essentials",
    subtitle: "Turning reporting into decisions",
    description:
      "Intelligence that does not change a decision is trivia. This course covers assessing relevance, weighing confidence and attribution honestly, and converting reporting into detections that outlast the indicator list.",
    category: "BLUE_TEAM",
    difficulty: "MEDIUM",
    estimatedHrs: 8,
    prerequisites: ["soc-analyst-fundamentals"],
    objectives: [
      "Assess whether intelligence is relevant to your estate",
      "Read confidence and attribution without adopting them uncritically",
      "Convert reporting into durable detection",
      "Write intelligence that a decision-maker can act on",
    ],
    modules: [
      {
        title: "Relevance and collection",
        description: "Deciding what to pay attention to.",
        lessons: [
          L("Intelligence requirements", "Starting from your decisions rather than from the feed.", 10),
          L("Sources and their biases", "Vendor reporting, open source and sharing communities."),
          L("Relevance over novelty", "An actor who cannot reach you is not your threat."),
        ],
      },
      {
        title: "Analysis",
        description: "Weighing evidence and stating confidence honestly.",
        lessons: [
          L("Confidence and uncertainty", "Saying what you believe and how strongly, without hedging into uselessness.", 10),
          L("Attribution", "An assessment built on partial visibility, not an observation."),
          L("Structured techniques", "Analysis of competing hypotheses, applied lightly."),
        ],
      },
      {
        title: "From intelligence to action",
        description: "Making reporting change something.",
        lessons: [
          L("Indicators and their lifespan", "Why the appendix decays faster than the narrative.", 10),
          L("Mapping to ATT&CK", "Turning a report into technique coverage you can test."),
          L("Writing for decision-makers", "Bottom line first, then the evidence, then the caveats."),
        ],
      },
    ],
  },
];
