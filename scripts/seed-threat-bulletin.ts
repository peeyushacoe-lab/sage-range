// Seeds the Weekly Threat Bulletin — a recurring CTI-style briefing on a
// current actor/malware family, new CVEs, IOCs, and TTPs. Intended to be
// updated weekly (manually, or via a scheduled task) ahead of a simulation
// that uses the same indicators.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-threat-bulletin.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const BULLETIN = {
  slug: "2026-w29-scattered-spider-helpdesk",
  weekOf: new Date("2026-07-13T00:00:00Z"),
  actorOrFamily: "Scattered Spider (UNC3944)",
  headline: "Help-Desk Social Engineering Campaign Targeting Finance SaaS Tenants",
  summary:
    "This week's tracked activity shows a continued shift away from phishing toward direct help-desk social " +
    "engineering: callers impersonate employees, request MFA resets or new device enrollment, and pivot into " +
    "SSO-fronted finance SaaS tenants once inside. Once authenticated, the group has been observed enumerating " +
    "finance approval workflows before attempting payment redirection. Expect this pattern to show up in this " +
    "week's simulation content — the same lookalike infrastructure and TTPs are used in FIN-2026-004.",
  newCves: [
    "CVE-2026-31442 — Critical authentication bypass in a widely-used SSO gateway (patch available, low uptake so far)",
  ],
  newIocs: [
    "cdn-update-service.net (C2 / staging domain)",
    "185.220.101.47 (C2 IP, TLS self-signed cert CN=update.cdn-service.net)",
    "meridian-finance-support.com (lookalike phishing domain pattern)",
    "SHA256 a3f2e9c1d84b7f6e2a1c9d8b7e6f5a4c3b2a1908f7e6d5c4b3a2918f7e6d5c4 (loader payload)",
  ],
  ttps: [
    "T1566.001 — Spearphishing Attachment",
    "T1656 — Impersonation (help-desk social engineering)",
    "T1078 — Valid Accounts",
    "T1021.002 — SMB/Windows Admin Shares (lateral movement)",
    "T1486 — Data Encrypted for Impact",
  ],
};

async function main() {
  await db.threatBulletin.upsert({
    where: { slug: BULLETIN.slug },
    update: { ...BULLETIN, published: true },
    create: { ...BULLETIN, published: true },
  });
  console.log(`✓ Threat bulletin seeded: ${BULLETIN.headline}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
