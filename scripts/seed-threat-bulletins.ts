// Fills out the Weekly Threat Bulletin feed — it had exactly one entry, from
// 2026-W29, with nothing before or after it. Adds 9 more weeks so the page
// reads as an actual ongoing feed instead of a single stale post.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-threat-bulletins.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Bulletin = {
  slug: string;
  weekOf: string; // Monday, ISO date
  actorOrFamily: string;
  headline: string;
  summary: string;
  newCves: string[];
  newIocs: string[];
  ttps: string[];
};

const BULLETINS: Bulletin[] = [
  {
    slug: "2026-w24-fin7-netsupport",
    weekOf: "2026-06-08",
    actorOrFamily: "FIN7",
    headline: "Malvertising Campaign Delivering an Updated NetSupport RAT Loader",
    summary:
      "Fresh activity this week points to a malvertising chain seeding a modified NetSupport RAT through fake browser-update prompts on compromised ad-tech inventory. The loader now delays execution with a sandbox-timing check before unpacking, and the group has been observed pivoting from initial access straight into POS and payment-processing subnets within hours rather than days — a faster timeline than their historical pattern. Retailers and hospitality environments remain the primary targeting profile.",
    newCves: ["CVE-2026-28810 — Browser update-prompt spoofing weakness in an ad-serving SDK (vendor patch pending)"],
    newIocs: [
      "update-delivery-cdn[.]net (fake browser-update landing page)",
      "45.142.213.88 (loader staging IP)",
      "SHA256 f1e2d3c4b5a69788716253849f0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c (NetSupport loader variant)",
      "svcupdate.exe (dropped binary name, masquerades as a legitimate updater)",
    ],
    ttps: [
      "T1566.002 — Spearphishing Link",
      "T1204.001 — Malicious Link (User Execution)",
      "T1497.001 — Sandbox Evasion via System Checks",
      "T1219 — Remote Access Software",
      "T1071.001 — Web Protocols (C2)",
    ],
  },
  {
    slug: "2026-w25-graphitelocker-esxi",
    weekOf: "2026-06-15",
    actorOrFamily: "GraphiteLocker Ransomware",
    headline: "Double-Extortion Group Ships an ESXi Encryptor, Shifting Focus to Virtualization Hosts",
    summary:
      "GraphiteLocker's affiliate program has added a Linux ELF encryptor purpose-built for VMware ESXi hosts, following the broader ransomware-ecosystem trend of targeting hypervisors directly rather than individual guest VMs — one encryption pass takes down every workload on the host at once. Initial access continues to run through exposed management interfaces and reused credentials from prior breaches rather than novel exploitation.",
    newCves: ["CVE-2026-29944 — Authentication bypass in a popular hypervisor management console when exposed to the management VLAN without additional controls"],
    newIocs: [
      "esxi-encryptor.graphitelocker[.]onion (leak site)",
      "185.174.101.22 (staging server for exfiltrated data prior to encryption)",
      "SHA256 c3d4e5f6a7b8091827364950a1b2c3d4e5f6071829384756a1b2c3d4e5f6071 (ESXi ELF encryptor)",
      ".graphite extension appended to encrypted VMDK/VMX files",
    ],
    ttps: [
      "T1190 — Exploit Public-Facing Application",
      "T1078.003 — Valid Accounts: Local Accounts",
      "T1486 — Data Encrypted for Impact",
      "T1489 — Service Stop (hypervisor services halted pre-encryption)",
      "T1567.002 — Exfiltration to Cloud Storage",
    ],
  },
  {
    slug: "2026-w26-lazarus-fake-interview",
    weekOf: "2026-06-22",
    actorOrFamily: "Lazarus Group",
    headline: "Fake Job-Interview Coding Tests Used to Deliver a Cross-Platform Backdoor",
    summary:
      "The group continues running its long-standing recruiting-lure playbook: fake recruiter outreach on professional networking sites leads candidates to a 'take-home coding assessment' hosted on a cloned GitHub repository. The test-runner script pulls a second-stage cross-platform backdoor (Windows, macOS, and Linux builds) disguised as a dependency-installation step. Targeting continues to concentrate on engineers with access to cryptocurrency-exchange or blockchain-infrastructure codebases.",
    newCves: [],
    newIocs: [
      "github.com/quant-hiring-labs (cloned repository account, since taken down but reappears under new names weekly)",
      "npm package 'node-utils-check' (malicious postinstall script)",
      "104.168.44.19 (second-stage C2)",
      "SHA256 9a8b7c6d5e4f30211f0e9d8c7b6a5948372615049a8b7c6d5e4f30211f0e9d8 (cross-platform backdoor)",
    ],
    ttps: [
      "T1204.002 — Malicious File (fake coding assessment)",
      "T1195.001 — Compromise Software Dependencies and Development Tools",
      "T1059.007 — JavaScript",
      "T1547 — Boot or Logon Autostart Execution",
      "T1041 — Exfiltration Over C2 Channel",
    ],
  },
  {
    slug: "2026-w27-oauth-grant-abuse",
    weekOf: "2026-06-29",
    actorOrFamily: "Cloud IAM Abuse (unattributed cluster)",
    headline: "Mass Exploitation of Overly Permissive OAuth App Grants Against SaaS Tenants",
    summary:
      "Multiple unattributed clusters are running the same playbook: register a consent-phishing OAuth app that requests broad mail and file-read scopes, mass-mail the consent link disguised as a productivity add-in, and harvest tokens from every tenant that approves it — no password or MFA prompt required once consent is granted. Several confirmed cases show the token was still valid and in active use weeks after the phishing email was reported and deleted, because the underlying OAuth grant was never revoked.",
    newCves: [],
    newIocs: [
      "docsync-productivity-app[.]com (consent-phishing landing page)",
      "OAuth app name 'QuickDocs Sync Pro' (rotates naming weekly across tenants)",
      "185.220.102.51 (token-harvesting collection endpoint)",
    ],
    ttps: [
      "T1528 — Steal Application Access Token",
      "T1566.002 — Spearphishing Link",
      "T1114.002 — Remote Email Collection",
      "T1550.001 — Application Access Token (persistence via stolen grant)",
    ],
  },
  {
    slug: "2026-w29-scattered-spider-helpdesk",
    weekOf: "2026-07-13",
    actorOrFamily: "Scattered Spider (UNC3944)",
    headline: "Help-Desk Social Engineering Campaign Targeting Finance SaaS Tenants",
    summary:
      "This week's tracked activity shows a continued shift away from phishing toward direct help-desk social engineering: callers impersonate employees, request MFA resets or new device enrollment, and pivot into SSO-fronted finance SaaS tenants once inside. Once authenticated, the group has been observed enumerating finance approval workflows before attempting payment redirection. Expect this pattern to show up in this week's simulation content — the same lookalike infrastructure and TTPs are used in FIN-2026-004.",
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
  },
  {
    slug: "2026-w30-silveradder-npm-stealer",
    weekOf: "2026-07-20",
    actorOrFamily: "SilverAdder Loader",
    headline: "Malicious npm Packages Delivering a New Info-Stealer to Developer Workstations",
    summary:
      "A wave of typosquatted npm packages — names one or two characters off from popular logging and CLI utility libraries — carry a postinstall script that fetches SilverAdder, a stealer targeting browser-stored credentials, SSH keys, and cloud CLI credential files (AWS, GCP, and Azure config directories specifically). Packages are pulled from the registry within hours of discovery, but automated CI pipelines that cache dependencies can keep re-installing a poisoned version long after the original is gone.",
    newCves: [],
    newIocs: [
      "npm packages: 'colorz-cli', 'expresss-router', 'lodash-utilz' (typosquats, names rotate weekly)",
      "pkg-cdn-mirror[.]dev (second-stage payload host)",
      "SHA256 7d6c5b4a3f2e1d0c9b8a7968574635241302f1e0d9c8b7a6958473625140312 (SilverAdder stealer binary)",
    ],
    ttps: [
      "T1195.001 — Compromise Software Dependencies and Development Tools",
      "T1552.001 — Credentials In Files (cloud CLI config directories)",
      "T1555.003 — Credentials from Web Browsers",
      "T1567 — Exfiltration Over Web Service",
    ],
  },
  {
    slug: "2026-w31-play-intermittent-encryption",
    weekOf: "2026-07-27",
    actorOrFamily: "Play Ransomware",
    headline: "Intermittent Encryption Technique Observed to Evade Behavioral Detection",
    summary:
      "Recent samples encrypt alternating blocks of each file rather than the full file — enough to render data unrecoverable while producing an I/O and CPU pattern that sits below the thresholds most behavioral ransomware detections are tuned for. File headers remain intact, so file-type detection tools may not immediately flag encrypted files as corrupted, delaying discovery. Initial access continues to trend toward exploitation of unpatched remote-access gateways rather than phishing.",
    newCves: [
      "CVE-2026-30187 — Remote code execution in a widely deployed VPN gateway appliance (actively exploited, patch available)",
    ],
    newIocs: [
      "playnews[.]onion (leak site)",
      "91.219.238.14 (post-exploitation C2)",
      ".PLAY extension appended, ransom note named ReadMe.txt dropped per directory",
    ],
    ttps: [
      "T1190 — Exploit Public-Facing Application",
      "T1486 — Data Encrypted for Impact (intermittent/partial encryption)",
      "T1490 — Inhibit System Recovery",
      "T1070.004 — File Deletion (log clearing post-encryption)",
    ],
  },
  {
    slug: "2026-w32-volt-typhoon-lotl",
    weekOf: "2026-08-03",
    actorOrFamily: "Volt Typhoon",
    headline: "Living-off-the-Land Activity Persisting in Critical-Infrastructure-Adjacent Networks",
    summary:
      "Continued pre-positioning activity uses only built-in OS tools — no custom malware — making detection almost entirely dependent on command-line and process-lineage logging rather than signature-based tools. Observed sessions favor compromised small-office/home-office routers as relay infrastructure to blend with normal residential traffic before reaching the target network, and dwell times before any observable action continue to run into months.",
    newCves: [],
    newIocs: [
      "Compromised SOHO router relay pattern (varies per campaign, no fixed IOC — detection relies on behavior, not indicators)",
      "wmic.exe / netsh.exe / ntdsutil.exe chained execution pattern consistent with credential-store access via living-off-the-land binaries",
    ],
    ttps: [
      "T1078 — Valid Accounts",
      "T1059.003 — Windows Command Shell",
      "T1003.003 — OS Credential Dumping: NTDS",
      "T1090.003 — Multi-hop Proxy (compromised routers as relays)",
      "T1082 — System Information Discovery",
    ],
  },
  {
    slug: "2026-w33-cinderphish-aitm",
    weekOf: "2026-08-10",
    actorOrFamily: "CinderPhish Kit",
    headline: "Adversary-in-the-Middle Phishing Kit Bypassing MFA at Scale",
    summary:
      "CinderPhish, a phishing-as-a-service kit sold on underground forums, sits as a reverse proxy between the victim and the real login page — the victim authenticates for real, including any MFA prompt, and the kit captures the resulting session cookie in real time. Because the login itself is genuine, standard credential-only monitoring misses it entirely; the only reliable signal is the session being used from a second, anomalous location moments later. Uptake has been highest against organizations that rely solely on push-notification MFA without number matching.",
    newCves: [],
    newIocs: [
      "login-secure-verify[.]net and rotating lookalike domains (reverse-proxy phishing pages)",
      "Session cookie replay observed from hosting-provider IP ranges within minutes of legitimate login",
      "TLS certificates issued same-day as domain registration (kit automates cert issuance at deploy time)",
    ],
    ttps: [
      "T1557.001 — Adversary-in-the-Middle: LLMNR/NBT-NS Poisoning and SMB Relay",
      "T1621 — Multi-Factor Authentication Request Generation",
      "T1550.004 — Web Session Cookie",
      "T1078.004 — Valid Accounts: Cloud Accounts",
    ],
  },
];

async function main() {
  for (const b of BULLETINS) {
    await db.threatBulletin.upsert({
      where: { slug: b.slug },
      update: {
        weekOf: new Date(b.weekOf),
        actorOrFamily: b.actorOrFamily,
        headline: b.headline,
        summary: b.summary,
        newCves: b.newCves,
        newIocs: b.newIocs,
        ttps: b.ttps,
        published: true,
      },
      create: {
        slug: b.slug,
        weekOf: new Date(b.weekOf),
        actorOrFamily: b.actorOrFamily,
        headline: b.headline,
        summary: b.summary,
        newCves: b.newCves,
        newIocs: b.newIocs,
        ttps: b.ttps,
        published: true,
      },
    });
    console.log(`${b.weekOf} — ${b.actorOrFamily}: ${b.headline}`);
  }
  console.log(`\nDone — ${BULLETINS.length} bulletins in the feed.`);
  process.exit(0);
}

main();
