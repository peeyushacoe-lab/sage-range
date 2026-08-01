/**
 * Role profiles, interview kits and job postings.
 *
 * Role profiles drive the skill-gap analysis, so `requiredTactics` uses MITRE
 * tactic names and a realistic count of solved items per tactic — set too high
 * and every learner reads as unqualified, too low and readiness means nothing.
 *
 * Interview kit questions carry a `weight`; the reviewer's scores are combined
 * against it, so weights should reflect what a real panel actually cares about.
 */

/** Mirrors the SeniorityLevel and EmploymentType enums in schema.prisma. */
export type Seniority = "INTERN" | "JUNIOR" | "MID" | "SENIOR" | "LEAD";
export type Employment = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "INSANE";

export type RoleSeed = {
  slug: string;
  title: string;
  seniority: Seniority;
  description: string;
  requiredTactics: Record<string, number>;
  recommendedPathSlugs: string[];
};

export type InterviewQuestionSeed = {
  id: string;
  prompt: string;
  idealPoints: string[];
  weight: number;
};

export type InterviewKitSeed = {
  slug: string;
  title: string;
  seniority: Seniority;
  difficulty: Difficulty;
  description: string;
  timeLimitSec: number;
  questions: InterviewQuestionSeed[];
};

export type JobSeed = {
  slug: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  employmentType: Employment;
  seniority: Seniority;
  salaryMin: number;
  salaryMax: number;
  description: string;
  tags: string[];
};

// ── Roles ──────────────────────────────────────────────────────────────────

export const CAREER_ROLES: RoleSeed[] = [
  {
    slug: "malware-analyst",
    title: "Malware Analyst",
    seniority: "SENIOR",
    description:
      "Take samples apart: establish capability and intent, extract indicators the SOC can act on, and say plainly what you could not determine.",
    requiredTactics: {
      EXECUTION: 6,
      PERSISTENCE: 5,
      DEFENSE_EVASION: 7,
      COMMAND_AND_CONTROL: 5,
      IMPACT: 4,
    },
    recommendedPathSlugs: ["malware-analysis-path", "forensics-path"],
  },
  {
    slug: "cloud-security-engineer",
    title: "Cloud Security Engineer",
    seniority: "MID",
    description:
      "Secure cloud estates: identity boundaries, workload isolation, and detections that work when the perimeter is an API.",
    requiredTactics: {
      INITIAL_ACCESS: 5,
      PRIVILEGE_ESCALATION: 6,
      DEFENSE_EVASION: 4,
      CREDENTIAL_ACCESS: 5,
      EXFILTRATION: 4,
    },
    recommendedPathSlugs: ["cloud-security-path"],
  },
  {
    slug: "penetration-tester",
    title: "Penetration Tester",
    seniority: "MID",
    description:
      "Find what an attacker would, prove impact without causing it, and write it up so it actually gets fixed.",
    requiredTactics: {
      RECONNAISSANCE: 5,
      INITIAL_ACCESS: 7,
      EXECUTION: 5,
      PRIVILEGE_ESCALATION: 6,
      LATERAL_MOVEMENT: 5,
    },
    recommendedPathSlugs: ["red-team-path", "web-security-path"],
  },
  {
    slug: "security-engineer",
    title: "Security Engineer",
    seniority: "MID",
    description:
      "Build the controls rather than watch them: hardening, automation, and closing the gaps the SOC keeps reporting.",
    requiredTactics: {
      INITIAL_ACCESS: 4,
      PERSISTENCE: 4,
      DEFENSE_EVASION: 5,
      CREDENTIAL_ACCESS: 4,
      DISCOVERY: 3,
    },
    recommendedPathSlugs: ["blue-team-foundations", "detection-engineering-path"],
  },
  {
    slug: "soc-manager",
    title: "SOC Manager",
    seniority: "LEAD",
    description:
      "Run the function: staffing, escalation policy, metrics that mean something, and owning the call when an incident goes wrong.",
    requiredTactics: {
      INITIAL_ACCESS: 5,
      EXECUTION: 4,
      PERSISTENCE: 4,
      LATERAL_MOVEMENT: 4,
      EXFILTRATION: 4,
      IMPACT: 5,
    },
    recommendedPathSlugs: ["incident-response-path", "soc-analyst-path"],
  },
  {
    slug: "threat-intelligence-analyst",
    title: "Threat Intelligence Analyst",
    seniority: "MID",
    description:
      "Turn reporting into decisions: track actors, assess relevance to your estate, and resist the pull of interesting-but-irrelevant.",
    requiredTactics: {
      RECONNAISSANCE: 6,
      RESOURCE_DEVELOPMENT: 5,
      INITIAL_ACCESS: 5,
      COMMAND_AND_CONTROL: 5,
      COLLECTION: 4,
    },
    recommendedPathSlugs: ["threat-intelligence-path"],
  },
];

// ── Interview kits ─────────────────────────────────────────────────────────

export const CAREER_INTERVIEW_KITS: InterviewKitSeed[] = [
  {
    slug: "threat-hunting-interview",
    title: "Threat Hunting Interview",
    seniority: "SENIOR",
    difficulty: "HARD",
    description:
      "Hypothesis design, working at scale, and being honest about what a hunt did and did not prove.",
    timeLimitSec: 2700,
    questions: [
      {
        id: "q1",
        prompt:
          "You are given six months of proxy logs and told 'find anything bad'. How do you turn that into work you can actually finish?",
        idealPoints: [
          "Refuses the open-ended framing and narrows to a hypothesis",
          "Picks techniques relevant to this estate and its crown jewels",
          "States data coverage and retention limits up front",
          "Defines what would count as a finding before starting",
        ],
        weight: 3,
      },
      {
        id: "q2",
        prompt:
          "Your hunt finds nothing. Your manager asks whether that means the environment is clean. How do you answer?",
        idealPoints: [
          "Distinguishes absence of evidence from evidence of absence",
          "Explains the specific visibility gaps",
          "Offers what the hunt did establish",
          "Does not overclaim to look useful",
        ],
        weight: 3,
      },
      {
        id: "q3",
        prompt:
          "Describe a time you were wrong about a finding. What did you do once you realised?",
        idealPoints: [
          "Gives a concrete example rather than a generality",
          "Corrected the record promptly and visibly",
          "Traces what led to the error",
          "Shows the process change that followed",
        ],
        weight: 2,
      },
      {
        id: "q4",
        prompt:
          "How would you decide whether a hunt finding should become a permanent detection?",
        idealPoints: [
          "Considers false-positive rate against SOC capacity",
          "Considers whether the behaviour is stable or trivially evaded",
          "Thinks about log-source reliability",
          "Recognises not every finding should become an alert",
        ],
        weight: 2,
      },
    ],
  },
  {
    slug: "cloud-security-interview",
    title: "Cloud Security Interview",
    seniority: "MID",
    difficulty: "MEDIUM",
    description: "Identity, blast radius, and detection when the perimeter is an API.",
    timeLimitSec: 2400,
    questions: [
      {
        id: "q1",
        prompt:
          "An access key for a production CI pipeline is found in a public repository. Walk me through the first hour.",
        idealPoints: [
          "Revokes or disables the key before investigating",
          "Reviews CloudTrail for use of that key, including regions not normally used",
          "Assesses what the key could reach, not just what it did",
          "Rotates downstream secrets the pipeline held",
        ],
        weight: 3,
      },
      {
        id: "q2",
        prompt: "Why is 'least privilege' harder in cloud than on-premises, in your experience?",
        idealPoints: [
          "Permission sprawl through roles, policies and trust relationships",
          "Transitive privilege escalation paths",
          "Pressure to unblock delivery quickly",
          "Difficulty proving a permission is unused",
        ],
        weight: 2,
      },
      {
        id: "q3",
        prompt:
          "How would you detect an attacker who has valid credentials and is behaving like a normal user?",
        idealPoints: [
          "Behavioural baselining rather than signature matching",
          "Impossible-travel, unusual regions, unusual API mix",
          "Focus on rare-but-high-impact API calls",
          "Accepts detection will be probabilistic",
        ],
        weight: 3,
      },
      {
        id: "q4",
        prompt: "A team wants a wildcard IAM policy to ship on Friday. What do you do?",
        idealPoints: [
          "Understands the delivery pressure rather than refusing flatly",
          "Offers a time-boxed scoped alternative",
          "Records the risk and the decision-maker",
          "Sets a concrete review date",
        ],
        weight: 2,
      },
    ],
  },
  {
    slug: "incident-commander-interview",
    title: "Incident Commander Interview",
    seniority: "LEAD",
    difficulty: "HARD",
    description:
      "Decision-making under pressure, stakeholder management, and owning outcomes.",
    timeLimitSec: 3000,
    questions: [
      {
        id: "q1",
        prompt:
          "Two hours into a ransomware incident the CEO wants to tell customers it is contained. You are not sure it is. What do you do?",
        idealPoints: [
          "Does not let an unverified claim go out",
          "Offers language that is true and still reassuring",
          "Explains the cost of being contradicted later",
          "Gives a concrete time for the next update",
        ],
        weight: 3,
      },
      {
        id: "q2",
        prompt: "How do you decide when to stop investigating and start recovering?",
        idealPoints: [
          "Ties the decision to a specific fact, such as backup viability",
          "Balances business disruption against reinfection risk",
          "Recognises the decision is the business's, informed by you",
          "Plans to preserve evidence before rebuilding",
        ],
        weight: 3,
      },
      {
        id: "q3",
        prompt: "Your team has been running for sixteen hours. What do you do and why?",
        idealPoints: [
          "Rotates rather than pushing through",
          "Insists on a written handover",
          "Understands fatigue causes the expensive mistakes",
          "Plans coverage before standing anyone down",
        ],
        weight: 2,
      },
      {
        id: "q4",
        prompt: "Describe an incident you handled badly and what changed afterwards.",
        idealPoints: [
          "Genuine example with a real failure",
          "Owns the decision rather than blaming tooling",
          "Names the specific change made",
          "Shows evidence the change held",
        ],
        weight: 2,
      },
    ],
  },
  {
    slug: "junior-analyst-interview",
    title: "Junior Analyst Interview",
    seniority: "JUNIOR",
    difficulty: "EASY",
    description:
      "First-role interview: reasoning, curiosity, and knowing when to escalate.",
    timeLimitSec: 1800,
    questions: [
      {
        id: "q1",
        prompt:
          "An alert fires for PowerShell spawned by Word. Talk me through what you check.",
        idealPoints: [
          "Looks at the full command line and any encoding",
          "Checks the parent chain and the user",
          "Looks for network connections and files written",
          "Says when they would escalate rather than guessing",
        ],
        weight: 3,
      },
      {
        id: "q2",
        prompt: "How do you decide something is a false positive?",
        idealPoints: [
          "Seeks a benign explanation that fits all the evidence",
          "Checks change records and known automation",
          "Does not close on the basis of it happening often",
          "Records the reasoning for the next analyst",
        ],
        weight: 3,
      },
      {
        id: "q3",
        prompt: "You do not know the answer during a live incident. What do you do?",
        idealPoints: [
          "Says so rather than bluffing",
          "Asks specifically rather than vaguely",
          "Keeps working the parts they can",
          "Writes down what they learned",
        ],
        weight: 2,
      },
      {
        id: "q4",
        prompt: "What have you taught yourself recently, and how?",
        idealPoints: [
          "Concrete and recent",
          "Hands-on rather than passive consumption",
          "Can explain it simply",
          "Shows genuine curiosity",
        ],
        weight: 2,
      },
    ],
  },
];

// ── Job postings ───────────────────────────────────────────────────────────

export const CAREER_JOBS: JobSeed[] = [
  {
    slug: "soc-analyst-tier1-manchester",
    title: "SOC Analyst (Tier 1)",
    company: "Northwind Financial",
    location: "Manchester, UK",
    remote: false,
    employmentType: "FULL_TIME",
    seniority: "JUNIOR",
    salaryMin: 28000,
    salaryMax: 34000,
    description:
      "Front-line triage on a 24/7 rota. You will work the alert queue, escalate with evidence, and be given time to learn properly. No prior commercial SOC experience required — we care that you can reason.",
    tags: ["SOC", "Triage", "SIEM", "Entry level"],
  },
  {
    slug: "incident-responder-london",
    title: "Incident Responder",
    company: "Cinder Security",
    location: "London, UK",
    remote: true,
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 55000,
    salaryMax: 70000,
    description:
      "Consultancy IR: you will be the person on the call when a client is having their worst week. Expect ransomware, BEC, and cloud compromise, and expect to write the report that goes to the board.",
    tags: ["Incident Response", "DFIR", "Consultancy"],
  },
  {
    slug: "detection-engineer-remote",
    title: "Detection Engineer",
    company: "Halyard Technology",
    location: "Remote (UK)",
    remote: true,
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 60000,
    salaryMax: 78000,
    description:
      "Own the detection pipeline end to end: research a technique, write the rule, validate it, and tune it once it meets reality. Detection-as-code, reviewed like software.",
    tags: ["Detection", "Sigma", "SIEM", "Engineering"],
  },
  {
    slug: "threat-hunter-edinburgh",
    title: "Threat Hunter",
    company: "Caledonia Group",
    location: "Edinburgh, UK",
    remote: false,
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 70000,
    salaryMax: 90000,
    description:
      "Hypothesis-driven hunting across a 12,000-endpoint estate. You will be judged on the quality of your reasoning and documentation, not on finding something every sprint.",
    tags: ["Threat Hunting", "EDR", "Senior"],
  },
  {
    slug: "cloud-security-engineer-remote",
    title: "Cloud Security Engineer",
    company: "Meridian Health",
    location: "Remote (EU)",
    remote: true,
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 65000,
    salaryMax: 85000,
    description:
      "Multi-account AWS estate in a regulated sector. Identity boundaries, workload isolation, and detections that survive contact with a real platform team.",
    tags: ["Cloud", "AWS", "IAM", "Healthcare"],
  },
  {
    slug: "malware-analyst-bristol",
    title: "Malware Analyst",
    company: "Sable Labs",
    location: "Bristol, UK",
    remote: false,
    employmentType: "FULL_TIME",
    seniority: "SENIOR",
    salaryMin: 68000,
    salaryMax: 88000,
    description:
      "Reverse engineering commodity and targeted malware. Output is indicators, capability assessments, and detections other teams depend on.",
    tags: ["Malware", "Reverse Engineering", "IDA", "Senior"],
  },
  {
    slug: "penetration-tester-leeds",
    title: "Penetration Tester",
    company: "Ravensworth Assurance",
    location: "Leeds, UK",
    remote: true,
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 50000,
    salaryMax: 68000,
    description:
      "Web, infrastructure and internal engagements. We value reports that get findings fixed over reports that list the most findings.",
    tags: ["Pentest", "Red Team", "Web", "CREST"],
  },
  {
    slug: "security-engineer-cambridge",
    title: "Security Engineer",
    company: "Ardent Systems",
    location: "Cambridge, UK",
    remote: false,
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 58000,
    salaryMax: 75000,
    description:
      "Build the controls rather than watch them. Hardening, automation and paying down the findings backlog the SOC keeps re-reporting.",
    tags: ["Security Engineering", "Automation", "Hardening"],
  },
  {
    slug: "threat-intel-analyst-remote",
    title: "Threat Intelligence Analyst",
    company: "Beacon Intelligence",
    location: "Remote (UK)",
    remote: true,
    employmentType: "FULL_TIME",
    seniority: "MID",
    salaryMin: 52000,
    salaryMax: 70000,
    description:
      "Track actors relevant to financial services and translate reporting into decisions our clients can act on. Writing ability matters as much as tradecraft here.",
    tags: ["Threat Intelligence", "OSINT", "Reporting"],
  },
  {
    slug: "soc-manager-birmingham",
    title: "SOC Manager",
    company: "Kestrel Industrial",
    location: "Birmingham, UK",
    remote: false,
    employmentType: "FULL_TIME",
    seniority: "LEAD",
    salaryMin: 80000,
    salaryMax: 100000,
    description:
      "Lead a team of nine across two shifts. You will own escalation policy, metrics that mean something, and the call when an incident goes wrong at 3am.",
    tags: ["Leadership", "SOC", "Management", "OT"],
  },
  {
    slug: "security-analyst-placement",
    title: "Security Analyst (12-month placement)",
    company: "Northwind Financial",
    location: "Manchester, UK",
    remote: false,
    employmentType: "INTERNSHIP",
    seniority: "JUNIOR",
    salaryMin: 22000,
    salaryMax: 24000,
    description:
      "Industrial placement for students in their penultimate year. Rotations through SOC, vulnerability management and detection engineering, with a mentor throughout.",
    tags: ["Placement", "Student", "Entry level", "Mentored"],
  },
  {
    slug: "junior-pentester-remote",
    title: "Junior Penetration Tester",
    company: "Ravensworth Assurance",
    location: "Remote (UK)",
    remote: true,
    employmentType: "FULL_TIME",
    seniority: "JUNIOR",
    salaryMin: 32000,
    salaryMax: 42000,
    description:
      "For someone with strong lab work and no commercial experience yet. Structured mentoring towards CREST, shadowing on engagements from week one.",
    tags: ["Pentest", "Entry level", "Mentored", "CREST"],
  },
];
