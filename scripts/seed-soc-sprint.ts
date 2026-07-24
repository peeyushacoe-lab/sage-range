// Seeds "SOC Sprint" — the competitive format of SOC Shift Mode. Same
// mechanics (triage a batch of alerts before time runs out), but shorter
// and tighter, with a public leaderboard shown on the shift detail page.
// This is a Competitive Mode: SOC Sprint, as opposed to the longer practice
// shift already seeded by scripts/seed-soc-shift.ts.
//
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-soc-sprint.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SHIFT = {
  slug: "soc-sprint-weekly-round",
  title: "SOC Sprint — Weekly Competitive Round",
  briefing:
    "10 alerts, 15 minutes, one leaderboard. This is the competitive format — faster and less forgiving than a " +
    "practice shift. Escalate the real ones, close the noise, and don't waste time overthinking the obvious calls.",
  timeLimitSec: 900,
};

const ALERTS = [
  {
    order: 1,
    source: "EDR",
    summary: "A signed vendor update tool triggered a heuristic AV alert, then completed normally.",
    rawLog: "Detection: Heuristic:Win32/Suspicious.Gen  Process: vendor_updater.exe (Authenticode signed)  Action: Allowed, completed normally, no follow-on activity.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Signed, known vendor tool, heuristic-only match, no follow-on behavior. Routine false positive.",
  },
  {
    order: 2,
    source: "Identity",
    summary: "A service account authenticated from a new subnet and immediately queried 40 SPNs.",
    rawLog: "4769 Kerberos Service Ticket Requested x 40 within 2 minutes, Account: svc_reports, Source: unfamiliar subnet, encryption: RC4.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "Rapid multi-SPN ticket requests with RC4 encryption from an unfamiliar subnet is a Kerberoasting signature. Escalate.",
  },
  {
    order: 3,
    source: "Network",
    summary: "A workstation made a single DNS query to a domain that resolved to a parked/sinkholed IP.",
    rawLog: "DNS query: freehosting-example[.]net -> 0.0.0.0 (sinkhole), single query, no follow-up connection attempt.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "A single query to an already-sinkholed domain with no connection attempt indicates no live threat.",
  },
  {
    order: 4,
    source: "Email",
    summary: "An inbound email with a spoofed display name and a link to a credential-harvesting page was reported by a user.",
    rawLog: "From: 'IT Helpdesk' <it-support@{{lookalike-domain}}>  Subject: Password expiring today  Link: hxxps://login-verify[.]net/o365",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "A user-reported phishing email with a live credential-harvesting link needs escalation for blocking and user follow-up.",
  },
  {
    order: 5,
    source: "DLP",
    summary: "An engineer uploaded a large internal design document to an approved corporate cloud storage account.",
    rawLog: "Upload: 1.2 GB to company-managed OneDrive tenant, account: approved SSO session, destination category: Corporate Cloud Storage (allowed).",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Large upload, but to an approved, company-managed destination under an authenticated SSO session. Routine.",
  },
  {
    order: 6,
    source: "EDR",
    summary: "A process injected into lsass.exe's memory space from an unsigned binary in a temp directory.",
    rawLog: "Process: C:\\Users\\Public\\upd_helper.exe (unsigned)  Action: OpenProcess on lsass.exe with PROCESS_VM_READ | PROCESS_QUERY_INFORMATION.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "An unsigned process reading LSASS memory is a textbook credential-dumping technique. Escalate immediately.",
  },
  {
    order: 7,
    source: "Network",
    summary: "A finance workstation's traffic briefly spiked during a scheduled backup window.",
    rawLog: "Traffic spike: FIN-WKS-40, 02:00-02:15, matches documented nightly backup schedule, destination: internal backup server.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Matches a documented, internal, scheduled backup job. No external destination involved.",
  },
  {
    order: 8,
    source: "Identity",
    summary: "A contractor account that should have been disabled last week successfully authenticated.",
    rawLog: "4624 Logon Type 3, Account: contractor_jkim, Account Status per HR: should be disabled as of 6 days ago, Source: VPN.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "MONITOR" as const,
    explanation: "Not yet confirmed malicious, but an offboarding gap that needs immediate follow-up — monitor closely and open an access-review ticket rather than closing outright.",
  },
  {
    order: 9,
    source: "Web Proxy",
    summary: "A workstation downloaded a PDF from a well-known software vendor's official documentation site.",
    rawLog: "GET https://docs.vendor.example.com/manual.pdf, category: Software/Technology (allowed), no macro or script execution followed.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Legitimate vendor documentation download with no follow-on execution. Routine.",
  },
  {
    order: 10,
    source: "EDR",
    summary: "A scheduled task was created that runs an encoded PowerShell command every 4 hours as SYSTEM.",
    rawLog: "Task: \\Microsoft\\Windows\\Maintenance\\SysHealthCheck, Action: powershell.exe -enc <base64>, Trigger: every 4 hours, Run As: SYSTEM, Author: unrecognized service account.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "An encoded PowerShell command running as SYSTEM on a recurring schedule, authored by an unrecognized account, is a persistence mechanism. Escalate.",
  },
];

async function main() {
  const shift = await db.socShift.upsert({
    where: { slug: SHIFT.slug },
    update: { title: SHIFT.title, briefing: SHIFT.briefing, timeLimitSec: SHIFT.timeLimitSec, published: true },
    create: { slug: SHIFT.slug, title: SHIFT.title, briefing: SHIFT.briefing, timeLimitSec: SHIFT.timeLimitSec, published: true },
  });

  await db.shiftAlert.deleteMany({ where: { shiftId: shift.id } });
  await db.shiftAlert.createMany({
    data: ALERTS.map((a) => ({
      shiftId: shift.id,
      order: a.order,
      source: a.source,
      summary: a.summary,
      rawLog: a.rawLog,
      verdict: a.verdict,
      correctAction: a.correctAction,
      explanation: a.explanation,
    })),
  });

  console.log(`✓ SOC Sprint seeded: ${ALERTS.length} alerts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
