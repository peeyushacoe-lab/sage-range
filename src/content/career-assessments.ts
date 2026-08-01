/**
 * Additional verified skill assessments.
 *
 * Authored rather than generated: a credential is only worth something if the
 * questions separate people who have done the work from people who have read
 * about it. Distractors are therefore plausible-but-wrong, not filler.
 *
 * Every non-TEXT question needs an `answer` whose indices exist in `options`,
 * or the paper is ungradeable — __tests__/career-content.test.ts enforces that.
 */

export type AssessmentQuestionSeed = {
  id: string;
  type: "SINGLE" | "MULTI" | "TEXT";
  prompt: string;
  options?: string[];
  answer?: number | number[];
  points?: number;
};

export type AssessmentSeed = {
  slug: string;
  title: string;
  domain: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  description: string;
  timeLimitSec: number;
  passingScore: number;
  validityDays: number | null;
  questions: AssessmentQuestionSeed[];
};

export const CAREER_ASSESSMENTS: AssessmentSeed[] = [
  {
    slug: "threat-hunting-practice",
    title: "Threat Hunting in Practice",
    domain: "HUNTING",
    difficulty: "HARD",
    description:
      "Hypothesis-driven hunting, baselining, and knowing when an absence of evidence is evidence of nothing.",
    timeLimitSec: 3600,
    passingScore: 70,
    validityDays: 730,
    questions: [
      {
        id: "th1",
        type: "SINGLE",
        prompt: "What most distinguishes a hunt from alert triage?",
        options: [
          "Hunting uses more expensive tooling",
          "Hunting starts from a hypothesis rather than a detection firing",
          "Hunting is performed only by senior staff",
          "Hunting looks at older data",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "th2",
        type: "SINGLE",
        prompt:
          "You hunt for beaconing and find nothing across 30 days of proxy logs. What may you conclude?",
        options: [
          "The environment is not compromised",
          "Beaconing does not occur in this environment",
          "Nothing matching your query and its visibility was present",
          "The hunt failed and should be discarded",
        ],
        answer: 2,
        points: 3,
      },
      {
        id: "th3",
        type: "MULTI",
        prompt: "Which signals genuinely help separate C2 beaconing from ordinary polling?",
        options: [
          "Consistent interval with low jitter",
          "Destination is a well-known CDN",
          "Uniform, small response sizes",
          "Traffic occurring during working hours",
        ],
        answer: [0, 2],
        points: 3,
      },
      {
        id: "th4",
        type: "SINGLE",
        prompt: "A hunt produces no findings. What is the most valuable output?",
        options: [
          "Nothing — a hunt without findings has no value",
          "A documented hypothesis, query, data coverage and its limits",
          "A new alert for the behaviour hunted",
          "A request for more tooling budget",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "th5",
        type: "MULTI",
        prompt: "Which are legitimate reasons a hunt would miss a real intrusion?",
        options: [
          "The log source does not cover the affected hosts",
          "Retention is shorter than the dwell time",
          "The hypothesis targeted a different technique",
          "The hunter did not use a commercial platform",
        ],
        answer: [0, 1, 2],
        points: 3,
      },
      {
        id: "th6",
        type: "TEXT",
        prompt:
          "You suspect credential theft followed by lateral movement, but have no EDR on the affected subnet. Describe the hunt you would run with the telemetry you do have, and state plainly what it cannot prove.",
      },
    ],
  },

  {
    slug: "cloud-security-aws",
    title: "Cloud Security — AWS",
    domain: "CLOUD",
    difficulty: "MEDIUM",
    description:
      "IAM boundaries, CloudTrail interpretation, and the misconfigurations that actually cause breaches.",
    timeLimitSec: 2700,
    passingScore: 70,
    validityDays: 730,
    questions: [
      {
        id: "aws1",
        type: "SINGLE",
        prompt:
          "A CloudTrail event shows GetCallerIdentity followed by ListBuckets and GetObject from an unfamiliar IP, using a long-lived access key. What is the most likely explanation?",
        options: [
          "Routine backup automation",
          "A leaked access key being enumerated",
          "AWS internal health checks",
          "An expired role assumption",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "aws2",
        type: "MULTI",
        prompt: "Which reduce the blast radius of a compromised EC2 instance profile?",
        options: [
          "Scoping the role to specific resources rather than *",
          "Enforcing IMDSv2",
          "Enabling detailed billing",
          "Applying a permissions boundary",
        ],
        answer: [0, 1, 3],
        points: 3,
      },
      {
        id: "aws3",
        type: "SINGLE",
        prompt: "Why is an S3 bucket policy granting Principal \"*\" dangerous even with an IP condition?",
        options: [
          "IP conditions are ignored by S3",
          "It costs more in request charges",
          "Anyone matching the condition is authorised, and source IPs can be spoofed or shared",
          "Bucket policies cannot use conditions",
        ],
        answer: 2,
        points: 2,
      },
      {
        id: "aws4",
        type: "SINGLE",
        prompt: "CloudTrail is disabled in one region. What is the practical consequence?",
        options: [
          "Nothing — CloudTrail is global",
          "API activity in that region is not recorded, and attackers pick unused regions deliberately",
          "IAM stops working in that region",
          "Only billing data is lost",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "aws5",
        type: "MULTI",
        prompt: "Which are genuine indicators of an attacker establishing cloud persistence?",
        options: [
          "CreateUser followed by CreateAccessKey",
          "A new identity provider trust added to IAM",
          "An EC2 instance being stopped",
          "UpdateAssumeRolePolicy adding an external account",
        ],
        answer: [0, 1, 3],
        points: 3,
      },
      {
        id: "aws6",
        type: "TEXT",
        prompt:
          "An access key belonging to a CI pipeline has been leaked publicly. Walk through your containment and recovery, in order, and say why that order matters.",
      },
    ],
  },

  {
    slug: "digital-forensics-core",
    title: "Digital Forensics Core",
    domain: "FORENSICS",
    difficulty: "HARD",
    description:
      "Order of volatility, artefact interpretation, and keeping evidence defensible.",
    timeLimitSec: 3600,
    passingScore: 70,
    validityDays: 730,
    questions: [
      {
        id: "df1",
        type: "SINGLE",
        prompt: "Which should be collected first from a live, compromised host?",
        options: ["Disk image", "Memory", "Event logs", "Registry hives"],
        answer: 1,
        points: 2,
      },
      {
        id: "df2",
        type: "SINGLE",
        prompt:
          "A responder powers off a suspected compromised host immediately. What is chiefly lost?",
        options: [
          "Nothing of consequence",
          "Memory-resident artefacts: injected code, network state, decrypted keys",
          "The MFT",
          "Prefetch files",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "df3",
        type: "MULTI",
        prompt: "Which Windows artefacts help establish that a binary actually executed?",
        options: ["Prefetch", "Amcache", "ShimCache", "Recycle Bin"],
        answer: [0, 1, 2],
        points: 3,
      },
      {
        id: "df4",
        type: "SINGLE",
        prompt: "Why does hashing an image at acquisition matter?",
        options: [
          "It compresses the image",
          "It demonstrates the copy is unchanged since collection",
          "It speeds up analysis",
          "It is required to mount the image",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "df5",
        type: "SINGLE",
        prompt:
          "A file's $STANDARD_INFORMATION timestamps predate its $FILE_NAME timestamps. What does this suggest?",
        options: [
          "Normal file copying",
          "Timestomping — $SI is trivially modifiable, $FN is not",
          "Disk corruption",
          "The file was compressed",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "df6",
        type: "TEXT",
        prompt:
          "You must preserve evidence from a business-critical server that cannot be taken offline. Describe your approach and the trade-offs you are accepting.",
      },
    ],
  },

  {
    slug: "malware-analysis-triage",
    title: "Malware Analysis — Triage",
    domain: "MALWARE",
    difficulty: "MEDIUM",
    description:
      "Static and dynamic triage, safe handling, and reaching a defensible verdict quickly.",
    timeLimitSec: 2700,
    passingScore: 70,
    validityDays: 730,
    questions: [
      {
        id: "ma1",
        type: "SINGLE",
        prompt: "What is the safest first step on an unknown executable?",
        options: [
          "Run it on your workstation and observe",
          "Static triage — hashes, strings, imports, signing — before any execution",
          "Submit it straight to a public sandbox",
          "Rename it to .txt",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "ma2",
        type: "SINGLE",
        prompt:
          "Why can uploading a sample to a public multi-scanner be the wrong call during a live incident?",
        options: [
          "It is slow",
          "Samples may become publicly retrievable, tipping off the actor and exposing victim data",
          "It produces too many results",
          "It requires a licence",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "ma3",
        type: "MULTI",
        prompt: "Which static indicators suggest packing or obfuscation?",
        options: [
          "Very high section entropy",
          "A tiny import table with only LoadLibrary and GetProcAddress",
          "A valid, current code-signing certificate",
          "Section names that do not match the compiler's conventions",
        ],
        answer: [0, 1, 3],
        points: 3,
      },
      {
        id: "ma4",
        type: "SINGLE",
        prompt: "A sample runs in your sandbox and does nothing. What is the best interpretation?",
        options: [
          "It is benign",
          "It may be evading analysis, or its trigger conditions were not met",
          "The sandbox is broken",
          "It needs administrator rights",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "ma5",
        type: "TEXT",
        prompt:
          "You have 30 minutes to give the incident commander a verdict on an unknown binary. Describe what you would do and what confidence you could honestly offer.",
      },
    ],
  },

  {
    slug: "network-security-analysis",
    title: "Network Security Analysis",
    domain: "NETWORK",
    difficulty: "MEDIUM",
    description:
      "Reading traffic, spotting tunnelling and exfiltration, and interpreting encrypted flows.",
    timeLimitSec: 2700,
    passingScore: 70,
    validityDays: 730,
    questions: [
      {
        id: "ns1",
        type: "MULTI",
        prompt: "Which patterns suggest DNS tunnelling?",
        options: [
          "Unusually long subdomain labels",
          "High TXT-record query volume to one domain",
          "Occasional NXDOMAIN responses",
          "Many unique subdomains under a single parent",
        ],
        answer: [0, 1, 3],
        points: 3,
      },
      {
        id: "ns2",
        type: "SINGLE",
        prompt: "Traffic is TLS-encrypted. What can still be assessed without decryption?",
        options: [
          "Nothing useful",
          "SNI, certificate details, JA3/JA4 fingerprints, timing and volume",
          "The full payload",
          "Only the destination port",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "ns3",
        type: "SINGLE",
        prompt:
          "A host sends 4GB outbound over eleven hours to one external IP, overnight, in even chunks. Most likely?",
        options: [
          "A backup job",
          "Staged exfiltration",
          "Software updates",
          "Normal user browsing",
        ],
        answer: 1,
        points: 3,
      },
      {
        id: "ns4",
        type: "SINGLE",
        prompt: "Why is east-west visibility often more valuable than perimeter visibility?",
        options: [
          "It produces less data",
          "Lateral movement happens inside the perimeter and is invisible at the edge",
          "It is cheaper to deploy",
          "Perimeter traffic is always encrypted",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "ns5",
        type: "TEXT",
        prompt:
          "Describe how you would establish a baseline for outbound traffic in an environment you have just inherited, and how you would use it.",
      },
    ],
  },

  {
    slug: "security-report-writing",
    title: "Security Report Writing",
    domain: "COMMUNICATION",
    difficulty: "EASY",
    description:
      "Writing findings executives can act on and engineers can reproduce. The skill most often missing.",
    timeLimitSec: 1800,
    passingScore: 65,
    validityDays: 365,
    questions: [
      {
        id: "rw1",
        type: "SINGLE",
        prompt: "What belongs in the first paragraph of an incident report for executives?",
        options: [
          "The full attack chain",
          "What happened, what it affects, and what you need from them",
          "Indicators of compromise",
          "The tooling used",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "rw2",
        type: "SINGLE",
        prompt: "You are unsure whether data was exfiltrated. How should the report read?",
        options: [
          "State that data was exfiltrated to be safe",
          "State no data was exfiltrated until proven otherwise",
          "State what the evidence shows, what it does not, and what would resolve it",
          "Omit the question entirely",
        ],
        answer: 2,
        points: 3,
      },
      {
        id: "rw3",
        type: "MULTI",
        prompt: "Which make a finding actionable?",
        options: [
          "Reproduction steps",
          "Affected assets named explicitly",
          "A CVSS score alone",
          "A concrete recommended fix",
        ],
        answer: [0, 1, 3],
        points: 3,
      },
      {
        id: "rw4",
        type: "SINGLE",
        prompt: "Why record the times decisions were made, not just when events occurred?",
        options: [
          "It pads the report",
          "It shows what was known at each decision point, which is what reviews actually examine",
          "It is a compliance requirement everywhere",
          "It helps with billing",
        ],
        answer: 1,
        points: 2,
      },
      {
        id: "rw5",
        type: "TEXT",
        prompt:
          "Write the opening paragraph of a report to a board explaining a ransomware incident where scope is not yet fully established.",
      },
    ],
  },
];
