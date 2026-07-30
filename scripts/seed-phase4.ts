/**
 * Seed script for Phase 4: role profiles, verified assessments, interview
 * kits and job postings with applications.
 *
 * Usage: npm run seed:phase4
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ROLES = [
  {
    slug: "soc-analyst-l1",
    title: "SOC Analyst (Tier 1)",
    seniority: "JUNIOR" as const,
    description:
      "Front-line triage: work the alert queue, separate true positives from noise, and escalate with clear evidence.",
    requiredTactics: {
      INITIAL_ACCESS: 4,
      EXECUTION: 3,
      PERSISTENCE: 2,
      DEFENSE_EVASION: 3,
      COMMAND_AND_CONTROL: 2,
    },
    recommendedPathSlugs: ["blue-team-foundations", "soc-analyst-path"],
  },
  {
    slug: "incident-responder",
    title: "Incident Responder",
    seniority: "MID" as const,
    description:
      "Own incidents end to end: scope the compromise, contain it, and write the report the business acts on.",
    requiredTactics: {
      INITIAL_ACCESS: 5,
      EXECUTION: 5,
      PERSISTENCE: 5,
      PRIVILEGE_ESCALATION: 4,
      LATERAL_MOVEMENT: 4,
      EXFILTRATION: 3,
    },
    recommendedPathSlugs: ["incident-response-path", "forensics-path"],
  },
  {
    slug: "detection-engineer",
    title: "Detection Engineer",
    seniority: "MID" as const,
    description:
      "Turn attacker behaviour into durable detections, then tune them so the SOC is not drowning in false positives.",
    requiredTactics: {
      EXECUTION: 6,
      PERSISTENCE: 5,
      DEFENSE_EVASION: 6,
      CREDENTIAL_ACCESS: 4,
      DISCOVERY: 3,
    },
    recommendedPathSlugs: ["detection-engineering-path"],
  },
  {
    slug: "threat-hunter",
    title: "Threat Hunter",
    seniority: "SENIOR" as const,
    description:
      "Hunt what the alerts missed: form hypotheses, work large log sets, and prove or disprove compromise.",
    requiredTactics: {
      DEFENSE_EVASION: 7,
      DISCOVERY: 6,
      LATERAL_MOVEMENT: 6,
      COLLECTION: 5,
      COMMAND_AND_CONTROL: 6,
      EXFILTRATION: 5,
    },
    recommendedPathSlugs: ["threat-hunting-path"],
  },
];

const ASSESSMENTS = [
  {
    slug: "detection-fundamentals",
    title: "Detection Engineering Fundamentals",
    domain: "DETECTION",
    difficulty: "MEDIUM" as const,
    description:
      "Sigma rule structure, false-positive tuning, and log-source coverage. Produces a verifiable credential.",
    timeLimitSec: 2700,
    passingScore: 70,
    validityDays: 730,
    questions: [
      {
        id: "d1",
        type: "SINGLE",
        prompt: "Which Sigma section defines what must match for the rule to fire?",
        options: ["logsource", "detection", "falsepositives", "level"],
        answer: 1,
        points: 1,
      },
      {
        id: "d2",
        type: "MULTI",
        prompt: "Which fields meaningfully reduce false positives on a process-creation rule?",
        options: ["ParentImage", "EventID", "CommandLine", "Hostname"],
        answer: [0, 2],
        points: 2,
      },
      {
        id: "d3",
        type: "SINGLE",
        prompt: "A rule fires 400 times a day, all benign. What is the first correct action?",
        options: [
          "Delete the rule",
          "Raise its severity",
          "Tune the logic against the benign pattern",
          "Suppress the whole log source",
        ],
        answer: 2,
        points: 2,
      },
      {
        id: "d4",
        type: "TEXT",
        prompt:
          "Describe how you would validate a new detection before it reaches production.",
      },
    ],
  },
  {
    slug: "incident-triage",
    title: "Incident Triage and Escalation",
    domain: "RESPONSE",
    difficulty: "EASY" as const,
    description:
      "Severity classification, escalation thresholds, and what belongs in a handover.",
    timeLimitSec: 1800,
    passingScore: 65,
    validityDays: 365,
    questions: [
      {
        id: "i1",
        type: "SINGLE",
        prompt: "Confirmed ransomware encrypting a file server. Correct severity?",
        options: ["Low", "Medium", "High", "Critical"],
        answer: 3,
        points: 2,
      },
      {
        id: "i2",
        type: "MULTI",
        prompt: "Which belong in an escalation handover?",
        options: [
          "Affected hosts",
          "Your personal opinion of the user",
          "Timeline of observed activity",
          "Actions already taken",
        ],
        answer: [0, 2, 3],
        points: 3,
      },
      {
        id: "i3",
        type: "SINGLE",
        prompt: "A single failed login from a known corporate IP is best treated as:",
        options: ["Critical incident", "Benign, no action", "Immediate lockout", "Data breach"],
        answer: 1,
        points: 1,
      },
    ],
  },
];

const KITS = [
  {
    slug: "soc-analyst-interview",
    title: "SOC Analyst Interview",
    seniority: "JUNIOR" as const,
    difficulty: "EASY" as const,
    description:
      "The questions a Tier 1 interview actually opens with. Timed, with structured feedback.",
    timeLimitSec: 1800,
    questions: [
      {
        id: "q1",
        prompt:
          "Walk me through what you do in the first ten minutes of a suspected phishing report.",
        weight: 2,
        idealPoints: [
          "Preserve the original message and headers",
          "Check whether anyone clicked or submitted credentials",
          "Detonate links safely, never on your own host",
          "Search for other recipients of the same campaign",
        ],
      },
      {
        id: "q2",
        prompt: "How do you decide whether an alert is a true positive?",
        weight: 2,
        idealPoints: [
          "Corroborate across independent log sources",
          "Establish what normal looks like for that host or user",
          "Consider the detection's known false-positive profile",
        ],
      },
      {
        id: "q3",
        prompt: "You disagree with a senior analyst's severity call. What do you do?",
        weight: 1,
        idealPoints: [
          "Present evidence rather than opinion",
          "Escalate through process, not around the person",
          "Accept the call once made and document the disagreement",
        ],
      },
    ],
  },
  {
    slug: "incident-responder-interview",
    title: "Incident Responder Interview",
    seniority: "MID" as const,
    difficulty: "MEDIUM" as const,
    description: "Scoping, containment trade-offs, and communicating to non-technical leadership.",
    timeLimitSec: 2700,
    questions: [
      {
        id: "q1",
        prompt:
          "You find a web shell on a public-facing server. Containment would take the site down during trading hours. How do you decide?",
        weight: 3,
        idealPoints: [
          "Quantify ongoing risk against revenue impact",
          "Consider partial containment: block C2, keep serving",
          "Escalate the trade-off to a business owner rather than deciding alone",
          "Preserve forensic evidence before any remediation",
        ],
      },
      {
        id: "q2",
        prompt: "How do you scope a compromise once you have one confirmed host?",
        weight: 3,
        idealPoints: [
          "Pivot on shared indicators across the estate",
          "Check authentication logs for lateral movement",
          "Establish a reliable earliest-evidence timestamp",
        ],
      },
      {
        id: "q3",
        prompt: "Explain this incident to a CFO in ninety seconds.",
        weight: 2,
        idealPoints: [
          "Lead with business impact, not technical detail",
          "Be explicit about what is known versus suspected",
          "Give a clear ask and next checkpoint",
        ],
      },
    ],
  },
];

const JOBS = [
  {
    slug: "soc-analyst-meridian",
    title: "SOC Analyst (Tier 1)",
    company: "Meridian Finance Group",
    location: "London",
    remote: false,
    employmentType: "FULL_TIME" as const,
    seniority: "JUNIOR" as const,
    salaryMin: 32000,
    salaryMax: 40000,
    description:
      "Join a 24/7 financial-services SOC. You will own the Tier 1 queue, triage alerts against documented playbooks, and escalate with evidence. Shift rotation with a four-on four-off pattern.",
    requirements: [
      "Comfortable reading Windows event logs",
      "Understands the difference between a true and false positive",
      "Clear written English for handover notes",
    ],
  },
  {
    slug: "detection-engineer-nimbus",
    title: "Detection Engineer",
    company: "Nimbus Cloud Solutions",
    location: "Remote (UK)",
    remote: true,
    employmentType: "FULL_TIME" as const,
    seniority: "MID" as const,
    salaryMin: 55000,
    salaryMax: 70000,
    description:
      "Own the detection backlog for a cloud-native estate. You will write and tune Sigma and KQL rules, measure their precision in production, and retire the ones that do not earn their place.",
    requirements: [
      "Written production detections in Sigma or KQL",
      "Can reason about false-positive cost, not just coverage",
      "Familiar with cloud audit logs",
    ],
  },
  {
    slug: "ir-consultant-harrow",
    title: "Incident Response Consultant",
    company: "Harrow County Government",
    location: "Manchester",
    remote: false,
    employmentType: "CONTRACT" as const,
    seniority: "SENIOR" as const,
    salaryMin: 500,
    salaryMax: 650,
    description:
      "Six-month contract supporting public-sector incident response. Day rate. You will lead engagements, brief senior stakeholders, and leave behind documentation the in-house team can run with.",
    requirements: [
      "Led incidents end to end",
      "Comfortable briefing non-technical leadership",
      "SC clearance or eligibility",
    ],
  },
];

async function main() {
  console.log("\nSeeding Phase 4: roles, assessments, interviews, jobs\n");

  const users = await db.user.findMany({
    select: { id: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  if (users.length === 0) {
    console.error("No users found. Seed users first.");
    process.exit(1);
  }

  // ── Role profiles ────────────────────────────────────────────────────────
  for (const role of ROLES) {
    await db.roleProfile.upsert({
      where: { slug: role.slug },
      create: { ...role, published: true },
      update: {
        requiredTactics: role.requiredTactics,
        recommendedPathSlugs: role.recommendedPathSlugs,
        published: true,
      },
    });
  }
  console.log(`Role profiles: ${ROLES.length}`);

  // ── Verified assessments ────────────────────────────────────────────────
  for (const a of ASSESSMENTS) {
    await db.skillAssessment.upsert({
      where: { slug: a.slug },
      create: { ...a, published: true },
      update: { questions: a.questions, published: true },
    });
  }
  console.log(`Verified assessments: ${ASSESSMENTS.length}`);

  // ── Interview kits ──────────────────────────────────────────────────────
  for (const k of KITS) {
    await db.interviewKit.upsert({
      where: { slug: k.slug },
      create: { ...k, published: true },
      update: { questions: k.questions, published: true },
    });
  }
  console.log(`Interview kits: ${KITS.length}`);

  // ── Job postings ────────────────────────────────────────────────────────
  // Post as a recruiter if one exists, otherwise the first user.
  const recruiter = users.find((u) => u.role === "RECRUITER") ?? users[0];

  let posted = 0;
  const jobIds: string[] = [];

  for (const job of JOBS) {
    const closesAt = new Date();
    closesAt.setUTCDate(closesAt.getUTCDate() + 45);

    const existing = await db.jobPosting.findFirst({ where: { slug: job.slug } });
    if (existing) {
      jobIds.push(existing.id);
      continue;
    }

    const created = await db.jobPosting.create({
      data: {
        recruiterId: recruiter.id,
        slug: job.slug,
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        remote: job.remote,
        employmentType: job.employmentType,
        seniority: job.seniority,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: "GBP",
        closesAt,
        active: true,
      },
    });
    jobIds.push(created.id);
    posted++;
  }
  console.log(`Job postings: ${posted} created, ${jobIds.length} total`);

  // A few applications so recruiter pipelines are not empty.
  let applied = 0;
  const applicants = users.filter((u) => u.id !== recruiter.id).slice(0, 5);

  for (const [i, applicant] of applicants.entries()) {
    const jobId = jobIds[i % jobIds.length];
    if (!jobId) continue;

    const dupe = await db.jobApplication.findUnique({
      where: { jobId_applicantId: { jobId, applicantId: applicant.id } },
    });
    if (dupe) continue;

    const portfolio = await db.careerPortfolio.findUnique({
      where: { userId: applicant.id },
      select: { slug: true },
    });

    const application = await db.jobApplication.create({
      data: {
        jobId,
        applicantId: applicant.id,
        coverNote:
          "Keen to move into a hands-on detection role. My portfolio has the labs and incidents I have worked through.",
        portfolioSlug: portfolio?.slug ?? null,
        status: i === 0 ? "SCREENING" : "SUBMITTED",
      },
    });

    await db.jobApplicationEvent.create({
      data: {
        applicationId: application.id,
        toStatus: "SUBMITTED",
        actorId: applicant.id,
      },
    });
    applied++;
  }
  console.log(`Applications: ${applied}`);

  console.log("\nPhase 4 seed complete.\n");
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Phase 4 seed failed:", err);
  await db.$disconnect();
  process.exit(1);
});
