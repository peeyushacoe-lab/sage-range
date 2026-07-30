// Seed script for Detection Rule Builder — creates sample rules and versions
// Run with: npx ts-node scripts/seed-detection-rules.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function seed() {
  console.log("Seeding detection rules...");

  // Get or create a test user
  let testUser = await db.user.findUnique({
    where: { email: "rules-author@example.com" },
  });

  if (!testUser) {
    testUser = await db.user.create({
      data: {
        email: "rules-author@example.com",
        displayName: "Rules Author",
        role: "STUDENT",
      },
    });
  }

  // Get a detection challenge (or create one)
  let challenge = await db.detectionChallenge.findFirst({});

  if (!challenge) {
    challenge = await db.detectionChallenge.create({
      data: {
        slug: "process-injection-detection",
        title: "Process Injection Detection",
        description: "Detect suspicious process injection attempts",
        difficulty: "HARD",
        points: 300,
        published: true,
        events: JSON.stringify([
          {
            id: "1",
            raw: 'process.name="explorer.exe" command_line="C:\\Windows\\explorer.exe"',
            fields: { process_name: "explorer.exe", command_line: "C:\\Windows\\explorer.exe" },
            isMalicious: false,
          },
          {
            id: "2",
            raw: 'process.name="cmd.exe" command_line="C:\\Windows\\System32\\cmd.exe /c whoami"',
            fields: { process_name: "cmd.exe", command_line: "C:\\Windows\\System32\\cmd.exe /c whoami" },
            isMalicious: true,
          },
        ]),
      },
    });
  }

  // Sample SIGMA Rule
  const sigmaRule = {
    title: "Suspicious Process Execution",
    detection: {
      selection:
      {
        Image: "*cmd.exe",
        CommandLine: ["*powershell*", "*whoami*"],
      },
      filter: {
        User: "*SYSTEM",
      },
      condition: "selection and not filter",
    },
    description: "Detects suspicious command line usage",
  };

  const sigmaSubmission = await db.detectionSubmission.create({
    data: {
      userId: testUser.id,
      challengeId: challenge.id,
      rule: sigmaRule as object,
      ruleType: "SIGMA",
      version: 1,
      isPublic: false,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precision: 0,
      recall: 0,
      f1: 0.65,
      score: 0,
      passed: false,
    },
  });

  // Create version history for SIGMA rule
  await db.detectionRuleVersion.create({
    data: {
      submissionId: sigmaSubmission.id,
      version: 1,
      rule: sigmaRule as object,
      ruleType: "SIGMA",
      f1: 0.65,
      notes: "Initial SIGMA rule - basic cmd.exe detection",
    },
  });

  // V2 of SIGMA rule with improvements
  const sigmaRuleV2 = {
    ...sigmaRule,
    detection: {
      ...sigmaRule.detection,
      selection: {
        ...sigmaRule.detection.selection,
        Image: "*cmd.exe",
        CommandLine: ["*powershell*", "*whoami*", "*net user*"],
        ParentImage: ["*explorer.exe", "*svchost.exe"],
      },
    },
  };

  const sigmaV2 = await db.detectionSubmission.update({
    where: { id: sigmaSubmission.id },
    data: {
      rule: sigmaRuleV2 as object,
      version: 2,
      f1: 0.78,
      updatedAt: new Date(),
    },
  });

  await db.detectionRuleVersion.create({
    data: {
      submissionId: sigmaSubmission.id,
      version: 2,
      rule: sigmaRuleV2 as object,
      ruleType: "SIGMA",
      f1: 0.78,
      notes: "Added parent process context and more command patterns",
    },
  });

  // Share SIGMA rule to community
  await db.detectionRuleShareAcl.create({
    data: {
      submissionId: sigmaSubmission.id,
      accessType: "COMMUNITY",
      sharedBy: testUser.id,
    },
  });

  await db.detectionSubmission.update({
    where: { id: sigmaSubmission.id },
    data: { isPublic: true },
  });

  // Sample KQL Rule
  const kqlRule = {
    query: `process.name:"cmd.exe" or process.name:"powershell.exe" | where command_line contains "whoami" or command_line contains "net user"`,
  };

  const kqlSubmission = await db.detectionSubmission.create({
    data: {
      userId: testUser.id,
      challengeId: challenge.id,
      rule: kqlRule as object,
      ruleType: "KQL",
      version: 1,
      isPublic: true,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precision: 0,
      recall: 0,
      f1: 0.72,
      score: 0,
      passed: false,
    },
  });

  await db.detectionRuleVersion.create({
    data: {
      submissionId: kqlSubmission.id,
      version: 1,
      rule: kqlRule as object,
      ruleType: "KQL",
      f1: 0.72,
      notes: "Initial KQL rule for process monitoring",
    },
  });

  // Share KQL to community
  await db.detectionRuleShareAcl.create({
    data: {
      submissionId: kqlSubmission.id,
      accessType: "COMMUNITY",
      sharedBy: testUser.id,
    },
  });

  // Sample SPLUNK Rule
  const splunkRule = {
    search: `process_name IN (cmd.exe, powershell.exe) command_line IN (*whoami*, *net user*) | stats count by host`,
  };

  const splunkSubmission = await db.detectionSubmission.create({
    data: {
      userId: testUser.id,
      challengeId: challenge.id,
      rule: splunkRule as object,
      ruleType: "SPLUNK",
      version: 1,
      isPublic: false,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precision: 0,
      recall: 0,
      f1: 0.68,
      score: 0,
      passed: false,
    },
  });

  await db.detectionRuleVersion.create({
    data: {
      submissionId: splunkSubmission.id,
      version: 1,
      rule: splunkRule as object,
      ruleType: "SPLUNK",
      f1: 0.68,
      notes: "Initial Splunk search for reconnaissance activities",
    },
  });

  // Sample ELASTIC Rule
  const elasticRule = {
    query: {
      bool: {
        must: [
          {
            terms: {
              "process.name": ["cmd.exe", "powershell.exe"],
            },
          },
          {
            bool: {
              should: [
                { match_phrase: { "process.command_line": "whoami" } },
                { match_phrase: { "process.command_line": "net user" } },
              ],
            },
          },
        ],
      },
    },
  };

  const elasticSubmission = await db.detectionSubmission.create({
    data: {
      userId: testUser.id,
      challengeId: challenge.id,
      rule: elasticRule as object,
      ruleType: "ELASTIC",
      version: 1,
      isPublic: true,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precision: 0,
      recall: 0,
      f1: 0.75,
      score: 0,
      passed: false,
    },
  });

  await db.detectionRuleVersion.create({
    data: {
      submissionId: elasticSubmission.id,
      version: 1,
      rule: elasticRule as object,
      ruleType: "ELASTIC",
      f1: 0.75,
      notes: "Initial Elasticsearch DSL rule for process detection",
    },
  });

  // Share ELASTIC to RECRUITER_ONLY
  await db.detectionRuleShareAcl.create({
    data: {
      submissionId: elasticSubmission.id,
      accessType: "RECRUITER_ONLY",
      sharedBy: testUser.id,
    },
  });

  // Sample YARA Rule
  const yaraRule = {
    rule_name: "suspicious_process_injection",
    strings: {
      s1: "cmd.exe",
      s2: "powershell.exe",
      s3: "whoami",
      s4: { regex: /.*net\s+user.*/ },
    },
    condition: "(s1 or s2) and (s3 or s4)",
  };

  const yaraSubmission = await db.detectionSubmission.create({
    data: {
      userId: testUser.id,
      challengeId: challenge.id,
      rule: yaraRule as object,
      ruleType: "YARA",
      version: 1,
      isPublic: false,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      trueNegatives: 0,
      precision: 0,
      recall: 0,
      f1: 0.70,
      score: 0,
      passed: false,
    },
  });

  await db.detectionRuleVersion.create({
    data: {
      submissionId: yaraSubmission.id,
      version: 1,
      rule: yaraRule as object,
      ruleType: "YARA",
      f1: 0.70,
      notes: "Initial YARA rule for binary matching",
    },
  });

  console.log("✅ Seeded detection rules:");
  console.log(`   - SIGMA rule (v2, community shared): ${sigmaSubmission.id}`);
  console.log(`   - KQL rule (v1, community shared): ${kqlSubmission.id}`);
  console.log(`   - SPLUNK rule (v1, private): ${splunkSubmission.id}`);
  console.log(`   - ELASTIC rule (v1, recruiter only): ${elasticSubmission.id}`);
  console.log(`   - YARA rule (v1, private): ${yaraSubmission.id}`);

  await db.$disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
