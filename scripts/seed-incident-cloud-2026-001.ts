// Seeds Boss Fight simulation: CLOUD-2026-001 — Leaked Storage Key Breach,
// inside the (new) Nimbus Cloud Solutions CompanyEnvironment.
// Requires scripts/seed-companies.ts to have been run first (adds
// nimbus-cloud-solutions).
//
// This is a cloud-native story with no traditional workstation/malware
// chain: a live Azure Storage Account key leaked into a public GitHub repo,
// found and used by an automated credential-scanning bot within hours.
// Tasks are written specifically for this story rather than reusing the
// host-based "find patient zero" template verbatim.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts. Tokens are reused generically here (e.g.
// {{FILE_SERVER_HOST}} as a storage account name, {{C2_IP}} as an external
// download source IP) rather than their literal on-prem meanings.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-cloud-2026-001.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "FILE_LISTING" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Public GitHub Repository Scan Result",
    content: `Repository: nimbus-data-exports (public)
Commit: a91f3c2 — "quick fix for local testing, will clean up later"
Author: {{EMPLOYEE_USER}}
File: config/local_settings.py

Committed line (should never have been committed):
AZURE_STORAGE_CONNECTION_STRING = "DefaultEndpointsProtocol=https;AccountName={{FILE_SERVER_HOST}};AccountKey=<live-key-redacted>;EndpointSuffix=core.windows.net"

Detected by: an external, automated credential-scanning bot service that
continuously indexes public GitHub commits for exposed secrets — not by
Nimbus's own (only partially enrolled) secret scanning.
Time between commit and first anomalous access: 3 hours 12 minutes.`,
  },
  {
    order: 2,
    type: "EVENT_LOG" as const,
    tactic: null,
    title: "Azure Storage Account Access Log — {{FILE_SERVER_HOST}}",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  ListContainers — SUCCESS
  Authentication: Account Key (not Azure AD / managed identity)
  Source IP: {{C2_IP}} (no prior access history from this IP)

{{ATTACK_DATE}} {{ATTACK_TIME}}  ListBlobs on container "customer-exports" — SUCCESS
  Authentication: Account Key
  Source IP: {{C2_IP}}

Assessment: authentication via a raw account key (rather than Azure AD)
means every request has full read/write/delete rights on the storage
account — there is no per-identity access boundary once the key leaks.`,
  },
  {
    order: 3,
    type: "EVENT_LOG" as const,
    tactic: "LATERAL_MOVEMENT" as const,
    title: "Azure Activity Log — Key Vault Access Attempt",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Key Vault "nimbus-prod-secrets" — ListSecrets
  Caller: Storage account's associated service principal (over-permissioned:
  Contributor role at the resource-group level, not scoped to Storage alone)
  Source IP: {{C2_IP}}
  Result: DENIED (Key Vault access policy did not include this principal)

Assessment: the compromised identity's Contributor role at the resource-group
level meant it could enumerate sibling resources like the production Key
Vault, even though this particular attempt was denied. A narrower,
storage-only role assignment would have prevented this attempt entirely.`,
  },
  {
    order: 4,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "Microsoft Defender for Cloud Alert",
    content: `Alert: "Access from a suspicious IP to a storage account"
Resource: {{FILE_SERVER_HOST}}
Severity: High
Source IP: {{C2_IP}} (flagged against Microsoft's threat intelligence feed
as associated with credential-scanning and exfiltration activity)
Recommendation: Rotate storage account keys immediately and migrate to
Azure AD-based authentication.`,
  },
  {
    order: 5,
    type: "FILE_LISTING" as const,
    tactic: "PERSISTENCE" as const,
    title: "SAS Token Generation Log — {{FILE_SERVER_HOST}}",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Shared Access Signature (SAS) token generated
  Scope: container "customer-exports"
  Permissions: Read, List
  Expiry: 3 years from generation (far beyond any standard internal policy)
  Generated using: the leaked account key

Assessment: even after the original account key is rotated, this SAS token
remains valid on its own until it expires or is explicitly revoked — a
built-in persistence mechanism the attacker created for themselves.`,
  },
  {
    order: 6,
    type: "PCAP_SUMMARY" as const,
    tactic: "EXFILTRATION" as const,
    title: "Azure NSG Flow Log — Bulk Blob Download",
    content: `Window: {{ATTACK_DATE}}, 3h12m–4h05m after the leaked commit
Source IP: {{C2_IP}}
Destination: {{FILE_SERVER_HOST}}.blob.core.windows.net
Volume: 9.4 GB downloaded across 1,840 GET requests
Pattern: Sequential enumeration and download of every blob in the
"customer-exports" container

Classification: Confirmed bulk exfiltration of the entire customer-exports
container.`,
  },
  {
    order: 7,
    type: "FILE_LISTING" as const,
    tactic: "IMPACT" as const,
    title: "Blob Inventory — customer-exports Container",
    content: `Container contents downloaded in full (1,840 objects):

  customer_data_export_*.csv   (est. 62,000 customer records total)
  billing_reconciliation_*.json (est. 4,100 records)
  usage_analytics_*.parquet     (aggregate, lower sensitivity)

Classification: Confirmed exposure of customer PII and billing data for
approximately 62,000 end-customer accounts across Nimbus's mid-market
customer base — each of whom will need individual breach notification
depending on jurisdiction.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Live storage account key accidentally committed to a public GitHub repo
+3h12m  First anomalous access using the leaked key ({{C2_IP}})
+3h13m  Containers and blobs enumerated
+3h15m  Denied attempt to access the production Key Vault via the same over-permissioned identity
+3h20m  Microsoft Defender for Cloud fires a high-severity alert
+3h25m  A long-lived SAS token generated for persistent access
+3h12m–4h05m  9.4 GB bulk downloaded from the customer-exports container
Following day  A customer reports their exported data appearing in an unrelated context, triggering this investigation`,
  },
];

const NETWORK_NODES = [
  { id: "github", label: "Public GitHub Repo", kind: "internet", x: 10, y: 20 },
  { id: "storage", label: "{{FILE_SERVER_HOST}} (Storage Account)", kind: "server", x: 50, y: 20 },
  { id: "keyvault", label: "Key Vault (nimbus-prod-secrets)", kind: "server", x: 50, y: 65 },
  { id: "entra", label: "Entra ID", kind: "domain-controller", x: 85, y: 20 },
  { id: "attacker", label: "{{C2_IP}}", kind: "internet", x: 85, y: 65 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "storage", status: "suspicious", note: "Referenced in the leaked commit" },
  { triggerOrder: 2, nodeId: "github", status: "compromised", note: "Leaked live storage account key found in a public commit" },
  { triggerOrder: 2, nodeId: "storage", status: "compromised", note: "Accessed and enumerated using the leaked key" },
  { triggerOrder: 3, nodeId: "storage", status: "compromised", note: "Long-lived SAS token generated for persistent access" },
  { triggerOrder: 3, nodeId: "keyvault", status: "suspicious", note: "Access attempted via the same over-permissioned identity (denied)" },
  { triggerOrder: 4, nodeId: "attacker", status: "compromised", note: "Confirmed source of the bulk blob download" },
  { triggerOrder: 7, nodeId: "storage", status: "contained", note: "Keys rotated, SAS tokens revoked" },
  { triggerOrder: 7, nodeId: "github", status: "contained", note: "Secret scrubbed from history, full secret scanning enabled" },
  { triggerOrder: 7, nodeId: "keyvault", status: "contained", note: "Access policy reviewed and scope narrowed" },
  { triggerOrder: 7, nodeId: "entra", status: "contained", note: "Service principal role narrowed from Contributor to Storage-only" },
  { triggerOrder: 7, nodeId: "attacker", status: "contained", note: "Blocked at network egress control" },
];

const TASKS = [
  {
    order: 1,
    title: "Identify the Leaked Resource",
    prompt: "Based on the GitHub scan result, what is the name of the storage account whose key was leaked?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{FILE_SERVER_HOST}}",
    options: [] as string[],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check the committed connection string in the GitHub scan result artifact." },
      { level: 2, pointCost: 30, text: "The AccountName field in the connection string names the storage account directly." },
      { level: 3, pointCost: 40, text: "It's the AccountName value from the leaked connection string." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "What was the initial access vector used to compromise the storage account?",
    answerType: "RADIO" as const,
    correctAnswer: "A developer accidentally committed a live Azure Storage Account key to a public GitHub repository",
    options: [
      "A developer accidentally committed a live Azure Storage Account key to a public GitHub repository",
      "Spearphishing email with a malicious macro attachment",
      "Brute-force compromise of an internet-facing RDP service",
      "Abuse of a third-party vendor's remote access tool",
    ],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Look at what was found in source control, not on any workstation." },
      { level: 2, pointCost: 30, text: "The leaked account key in a public commit is the entry point — no malware or phishing was involved." },
      { level: 3, pointCost: 40, text: "It's the accidentally committed live storage account key." },
    ],
  },
  {
    order: 3,
    title: "Find the Attacker's Persistence Mechanism",
    prompt: "How did the attacker ensure they could keep accessing data even after the original key was eventually rotated?",
    answerType: "RADIO" as const,
    correctAnswer: "Generated a new, long-lived Shared Access Signature (SAS) token scoped to the compromised container",
    options: [
      "Generated a new, long-lived Shared Access Signature (SAS) token scoped to the compromised container",
      "Installed a scheduled task on a Nimbus workstation",
      "Created a new local administrator account on-premises",
      "Modified a Windows registry Run key",
    ],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "There's no workstation in this story — the persistence mechanism is entirely cloud-native." },
      { level: 2, pointCost: 30, text: "Check the SAS token generation log artifact for its expiry window." },
      { level: 3, pointCost: 40, text: "It's the long-lived SAS token generated using the leaked key." },
    ],
  },
  {
    order: 4,
    title: "Find the Source IP",
    prompt: "What external IP was responsible for the bulk blob download?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{C2_IP}}",
    options: [],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Check the Azure Storage Account access log and the NSG flow log — the same IP appears in both." },
      { level: 2, pointCost: 30, text: "It's the Source IP field shared across the access log, Defender alert, and flow log." },
      { level: 3, pointCost: 40, text: "It's the IP address that appears consistently across all three artifacts." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes how this attacker obtained initial access?",
    answerType: "RADIO" as const,
    correctAnswer: "T1552.001 – Unsecured Credentials: Credentials In Files",
    options: [
      "T1552.001 – Unsecured Credentials: Credentials In Files",
      "T1566 – Phishing",
      "T1110 – Brute Force",
      "T1078 – Valid Accounts (Cloud)",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Think about where the credential was found — not how it was used." },
      { level: 2, pointCost: 35, text: "A secret sitting in a committed file, found by scanning, is the textbook definition of this technique." },
      { level: 3, pointCost: 45, text: "It's credentials found in files — T1552.001." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this kind of abuse earlier next time. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A Shared Access Signature token generated with an expiration far beyond organizational policy, especially shortly after access from a new, unrecognized IP",
    options: [
      "A Shared Access Signature token generated with an expiration far beyond organizational policy, especially shortly after access from a new, unrecognized IP",
      "Any read access to a storage account, regardless of source",
      "The specific commit message text used by the developer",
      "The programming language the application is written in",
    ],
    points: 160,
    hints: [
      { level: 1, pointCost: 25, text: "Re-read what made the SAS token itself suspicious, not just that a SAS token existed." },
      { level: 2, pointCost: 35, text: "A 3-year expiry combined with recent access from an unfamiliar IP is the anomalous signal." },
      { level: 3, pointCost: 45, text: "Detect on anomalously long-lived SAS tokens issued shortly after unfamiliar access." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed 9.4 GB of customer data has already been exfiltrated. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Rotate the storage account keys immediately, revoke all outstanding SAS tokens, and purge the secret from GitHub commit history",
    options: [
      "Rotate the storage account keys immediately, revoke all outstanding SAS tokens, and purge the secret from GitHub commit history",
      "Only delete the offending GitHub commit and leave the old key active",
      "Wait for the next scheduled quarterly key rotation",
      "Take the entire application offline for all customers indefinitely",
    ],
    points: 180,
    hints: [
      { level: 1, pointCost: 25, text: "Deleting a commit doesn't invalidate a key that's already been copied elsewhere." },
      { level: 2, pointCost: 35, text: "You need to actually invalidate every credential the attacker could still use — the key AND any SAS tokens derived from it." },
      { level: 3, pointCost: 45, text: "Rotate keys, revoke SAS tokens, and purge the secret from history — don't just delete the commit or wait." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A live Azure Storage Account key was accidentally committed to a public repository and found within hours by automated scanning, allowing bulk exfiltration of customer data before the exposure was detected internally",
    options: [
      "A live Azure Storage Account key was accidentally committed to a public repository and found within hours by automated scanning, allowing bulk exfiltration of customer data before the exposure was detected internally",
      "A phishing email compromised a developer's corporate laptop",
      "Ransomware encrypted the production database",
      "An unpatched web application vulnerability allowed direct remote code execution",
    ],
    points: 200,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the chain from the GitHub commit through to the blob inventory artifact." },
      { level: 2, pointCost: 40, text: "The root cause statement should name the leaked commit as entry and bulk data exfiltration as the impact." },
      { level: 3, pointCost: 50, text: "Entry via a leaked storage key in a public commit, impact is bulk customer-data exfiltration — not phishing, ransomware, or an app vulnerability." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "nimbus-cloud-solutions" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — nimbus-cloud-solutions not found.");
  }

  const briefing =
    "A Nimbus Cloud Solutions customer reports their exported data appearing in an unrelated context. There's no " +
    "phishing email, no malware, no compromised workstation — the trail starts in a public GitHub commit. You are " +
    "the lead investigator. Work through the evidence below to reconstruct the full breach, then produce detection " +
    "content, a containment recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "cloud-2026-001-storage-key-breach" },
    update: {
      codename: "CLOUD-2026-001",
      title: "Leaked Storage Key Breach",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 170,
      points: 1240,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "cloud-2026-001-storage-key-breach",
      codename: "CLOUD-2026-001",
      title: "Leaked Storage Key Breach",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 170,
      points: 1240,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
  });

  await db.incidentSimArtifact.deleteMany({ where: { simulationId: sim.id } });
  await db.incidentSimArtifact.createMany({
    data: ARTIFACTS.map((a) => ({
      simulationId: sim.id,
      type: a.type,
      title: a.title,
      content: a.content,
      order: a.order,
      tactic: a.tactic,
    })),
  });

  await db.incidentSimTask.deleteMany({ where: { simulationId: sim.id } });
  for (const t of TASKS) {
    const task = await db.incidentSimTask.create({
      data: {
        simulationId: sim.id,
        order: t.order,
        title: t.title,
        prompt: t.prompt,
        answerType: t.answerType,
        correctAnswer: t.correctAnswer,
        options: t.options,
        points: t.points,
      },
    });
    await db.incidentSimHint.createMany({
      data: t.hints.map((h) => ({ taskId: task.id, level: h.level, pointCost: h.pointCost, text: h.text })),
    });
  }

  console.log(`✓ CLOUD-2026-001 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
