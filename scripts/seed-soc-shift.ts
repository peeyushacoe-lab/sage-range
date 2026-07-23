// Seeds SOC Shift Mode: a timed alert-triage exercise. 12 alerts drop at
// once — 4 real, 8 noise — and the student has a time limit to classify
// each one as Escalate / Close / Monitor. Scored on accuracy, not just speed.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-soc-shift.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SHIFT = {
  slug: "morning-shift-july-2026",
  title: "Morning Shift — July 14, 2026",
  briefing:
    "09:00. Twelve alerts just landed in the queue overnight. You have 45 minutes to triage all of them: " +
    "escalate the real threats, close the noise, and mark anything genuinely ambiguous for monitoring. " +
    "Speed matters, but a wrongly-closed real incident costs far more than a slow shift.",
  timeLimitSec: 2700,
};

const ALERTS = [
  {
    order: 1,
    source: "EDR",
    summary: "Antivirus quarantined a known adware sample on a lobby kiosk PC.",
    rawLog: "Detection: PUA:Win32/AdBundler  Host: KIOSK-LOBBY-01  Action: Quarantined automatically. No further activity.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Commodity adware, auto-quarantined, no follow-on activity, non-sensitive device. Safe to close.",
  },
  {
    order: 2,
    source: "Identity",
    summary: "Domain admin account logged in from a new country at 3 AM, followed by AD replication changes.",
    rawLog: "4624 Logon Type 10, Account: da_kdavis, GeoIP: unfamiliar country, 03:04:11\n4662 'Replicating Directory Changes All' granted moments later.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "Privileged account, anomalous geography/time, followed by a DCSync-style permission use. Escalate immediately.",
  },
  {
    order: 3,
    source: "Identity",
    summary: "Single failed login on a low-privilege marketing account.",
    rawLog: "4625 Logon Failure, Account: m.tran (Marketing, no elevated access), single attempt, no retry.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "One failed attempt on a low-privilege account with no pattern of retries is routine noise.",
  },
  {
    order: 4,
    source: "Network",
    summary: "Outbound beacon to a known C2 IP every 60 seconds from a Finance workstation.",
    rawLog: "FIN-WKS-22 -> 45.33.12.9:443 every ~60s, IP matches active threat intel C2 list, 340 sessions over 5 hours.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "Regular beaconing cadence to a known-malicious IP from a sensitive department is a live compromise indicator. Escalate.",
  },
  {
    order: 5,
    source: "DLP",
    summary: "Scheduled backup job triggered a large overnight file transfer.",
    rawLog: "Backup service account bkp_svc transferred 40GB to offsite storage at 02:00, matches nightly backup schedule and destination.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Expected volume, expected account, expected destination, expected time window. Routine backup job.",
  },
  {
    order: 6,
    source: "Identity",
    summary: "User logged in from a brand-new laptop.",
    rawLog: "New device fingerprint for user r.osei, first login 08:40. IT ticket #4471 confirms device replacement completed yesterday.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "New device anomaly is fully explained by a linked, verified IT ticket for a legitimate hardware refresh.",
  },
  {
    order: 7,
    source: "Network",
    summary: "Multiple failed RDP logins followed by one success on an internet-facing jump host.",
    rawLog: "14 failed 4625 events against jump-host-ext-01 over 3 minutes, then one 4624 success from the same source IP.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "A brute-force pattern followed by a successful login on an internet-facing host is a strong compromise signal. Escalate.",
  },
  {
    order: 8,
    source: "Email",
    summary: "Email flagged for a spoofed sender header.",
    rawLog: "SPF soft-fail on partner-notifications@vendorX.com, but vendorX.com has an on-file SPF exception for this exact subdomain.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "The apparent spoof is a known, documented SPF configuration quirk for a legitimate vendor relationship.",
  },
  {
    order: 9,
    source: "EDR",
    summary: "New process spawned matching the internal patch management tool's normal update behavior.",
    rawLog: "Process: patchagent.exe spawning msiexec.exe, matches scheduled patch window, signed by internal cert.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "Signed, scheduled, expected behavior from an authorized internal management tool. Not suspicious.",
  },
  {
    order: 10,
    source: "File Server",
    summary: "Ransomware-style mass file rename detected on a file server share within a 2-minute window.",
    rawLog: "\\\\FS-03\\Shared: 2,140 files renamed with .lockz extension in 118 seconds, originating from HR-WKS-07's mapped session.",
    verdict: "TRUE_POSITIVE" as const,
    correctAction: "ESCALATE" as const,
    explanation: "Mass rapid file renaming with a ransomware-style extension is an active encryption event. Escalate immediately.",
  },
  {
    order: 11,
    source: "Web Proxy",
    summary: "User accessed an unusual internal wiki page outside business hours.",
    rawLog: "u.hassan viewed internal 'Q4 Layoffs Draft' wiki page at 23:40, no download or copy activity logged, no sensitive data exposure detected yet.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "MONITOR" as const,
    explanation: "Odd access pattern and sensitive-adjacent content, but no confirmed exfiltration yet — worth watching, not an immediate incident.",
  },
  {
    order: 12,
    source: "VPN",
    summary: "VPN connection from a new but geographically consistent city.",
    rawLog: "User t.walsh connected from a new city; corporate travel calendar confirms an active business trip to that location this week.",
    verdict: "FALSE_POSITIVE" as const,
    correctAction: "CLOSE" as const,
    explanation: "New location fully explained by a corroborated, calendared business trip.",
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

  console.log(`✓ ${shift.title} — ${ALERTS.length} alerts seeded.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
