// Seeds batch 4: closing out the thinnest categories from the roadmap —
// 3 more Threat Intelligence, 2 more DFIR, 2 more Cloud Security (Azure + GCP),
// and 1 more Real World Mini Incident (ransomware). 8 labs total.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-4.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  // ── Threat Intelligence ────────────────────────────────────────────────
  {
    slug: "alienvault-otx-pulse",
    title: "AlienVault OTX Pulse Analysis",
    description: "Investigate an OTX threat pulse, judge its credibility from author and subscriber signals, and match its indicators against your own environment.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Threat Intelligence", points: 160, published: true,
    flags: [
      { value: "SAGE{27_1nd1c4t0rs_qu13tp4nd4}", points: 50 },
      { value: "SAGE{v3r1f13d_h1gh_c0nf1d3nc3_puls3}", points: 55 },
      { value: "SAGE{wkstn_f1n_03_m4tch3d_pulse_10c}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The pulse metadata block lists both the indicator count and the malware family tag directly." },
      { stage: "task_1", level: 2, pointCost: 20, text: "27 indicators, malware family QuietPanda." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{27_1nd1c4t0rs_qu13tp4nd4}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare author verification status, subscriber count, and whether references back the claims." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Pulse A has a verified vendor author, 1,842 subscribers, and 3 linked vendor writeups — Pulse B has none of that." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{v3r1f13d_h1gh_c0nf1d3nc3_puls3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Check each firewall log destination IP against the pulse's indicator list." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Only WKSTN-FIN-03 contacted 91.223.10.15, which is on the pulse's IOC list." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{wkstn_f1n_03_m4tch3d_pulse_10c}" },
    ],
  },
  {
    slug: "abuseipdb-investigation",
    title: "AbuseIPDB Investigation",
    description: "Assess an AbuseIPDB report's confidence score and category tags, corroborate it against your own alert, and decide whether to block or keep monitoring.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Threat Intelligence", points: 160, published: true,
    flags: [
      { value: "SAGE{98_p3rc3nt_342_r3p0rts}", points: 50 },
      { value: "SAGE{ssh_brut3_f0rc3_c0rr0b0r4t3d}", points: 55 },
      { value: "SAGE{bl0ck_4nd_r3v13w_4uth_l0gs}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The report header states the confidence score and total report count directly." },
      { stage: "task_1", level: 2, pointCost: 20, text: "98% confidence, backed by 342 reports in the last 90 days." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{98_p3rc3nt_342_r3p0rts}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Your alert is repeated SSH auth failures — match that behavior to one of the listed categories." },
      { stage: "task_2", level: 2, pointCost: 20, text: "SSH Brute-Force is the category that directly matches what you're seeing." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{ssh_brut3_f0rc3_c0rr0b0r4t3d}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "A 98% score plus a corroborating alert against a bastion host calls for action now, not just logging." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Block the IP immediately and check whether any of those brute-force attempts actually succeeded." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{bl0ck_4nd_r3v13w_4uth_l0gs}" },
    ],
  },
  {
    slug: "urlscan-investigation",
    title: "URLScan Investigation",
    description: "Analyze a urlscan.io report for a suspected phishing page, follow its redirect chain, and confirm brand impersonation before requesting takedown.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Threat Intelligence", points: 200, published: true,
    flags: [
      { value: "SAGE{secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n}", points: 60 },
      { value: "SAGE{mult1_h0p_r3d1r3ct_ch41n}", points: 70 },
      { value: "SAGE{t4k3d0wn_4nd_pr0xy_bl0ck}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Check the 'Final URL' and 'Page Title' fields in the scan report." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The final domain is secure-0ffice365-login.com, impersonating Office 365's sign-in page." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Count the hops in the redirect chain and what each one is." },
      { stage: "task_2", level: 2, pointCost: 20, text: "A URL shortener chained into a relay domain, landing on a two-day-old lookalike — that layering is the red flag, not the padlock." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{mult1_h0p_r3d1r3ct_ch41n}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The page is live right now and actively harvesting credentials." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Get it blocklisted/taken down and block the domain at your own proxy immediately, in parallel." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{t4k3d0wn_4nd_pr0xy_bl0ck}" },
    ],
  },

  // ── DFIR ───────────────────────────────────────────────────────────────
  {
    slug: "dfir-timeline-creation",
    title: "DFIR Timeline Creation",
    description: "Merge Windows Event Log, Prefetch, and MFT timestamps into a single super-timeline, and pinpoint the exact sequence of the intrusion.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{rdp_l0g0n_14_02_f1rst_3v3nt}", points: 65 },
      { value: "SAGE{rdp_dr0p_3x3c_s3qu3nc3}", points: 75 },
      { value: "SAGE{t1m3st0mp1ng_d3t3ct3d}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Sort all three sources' timestamps into one chronological list." },
      { stage: "task_1", level: 2, pointCost: 20, text: "14:02:11 — the RDP logon — happens before the file creation and execution timestamps." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{rdp_l0g0n_14_02_f1rst_3v3nt}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Read the three merged events as one continuous story." },
      { stage: "task_2", level: 2, pointCost: 20, text: "RDP logon, then the tool is dropped to disk, then it's executed minutes later." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{rdp_dr0p_3x3c_s3qu3nc3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Compare the two MFT timestamp attributes for the same file." },
      { stage: "task_3", level: 2, pointCost: 20, text: "A nearly two-year gap between $STANDARD_INFORMATION and $FILE_NAME creation times is a classic timestomping signature." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{t1m3st0mp1ng_d3t3ct3d}" },
    ],
  },
  {
    slug: "mft-analysis",
    title: "MFT Analysis",
    description: "Parse Master File Table entries to recover a deleted attacker script from resident data, and confirm anti-forensic cleanup activity.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3}", points: 65 },
      { value: "SAGE{4nt1_f0r3ns1c_cl34nup_scr1pt}", points: 75 },
      { value: "SAGE{f1l3_n4m3_4ttr1but3_tru5t3d}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Small deleted files under ~700 bytes can have their content stored directly inside the MFT record itself." },
      { stage: "task_1", level: 2, pointCost: 20, text: "cleanup.bat is 312 bytes and resident, so its content survives deletion right in the record." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Read what the recovered script actually deletes and clears." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It deletes the attacker's own dropped tools and clears the Security event log — anti-forensic cleanup." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{4nt1_f0r3ns1c_cl34nup_scr1pt}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "One of the two timestamp attributes is far easier for attacker tooling to rewrite than the other." },
      { stage: "task_3", level: 2, pointCost: 20, text: "$FILE_NAME timestamps require kernel-level access to alter and matched the real deployment window here." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{f1l3_n4m3_4ttr1but3_tru5t3d}" },
    ],
  },

  // ── Cloud Security ─────────────────────────────────────────────────────
  {
    slug: "azure-rbac-misconfiguration",
    title: "Azure RBAC Misconfiguration",
    description: "Audit an Azure subscription's role assignments, spot an over-privileged Owner grant to a guest account, and fix it with a scoped custom role.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Cloud Security", points: 220, published: true,
    flags: [
      { value: "SAGE{gu3st_b0b_0wn3r_r00t_sc0p3}", points: 65 },
      { value: "SAGE{0wn3r_c4n_r3gr4nt_4cc3ss}", points: 75 },
      { value: "SAGE{sc0p3d_cust0m_r0l3_f1x}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Check both the role AND the scope for each assignment — an external account stands out." },
      { stage: "task_1", level: 2, pointCost: 20, text: "guest_bob@partnerco.com holds Owner at the subscription root — the widest possible scope." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{gu3st_b0b_0wn3r_r00t_sc0p3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Owner includes one capability Contributor doesn't have at all." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Owner can modify access control itself — the guest could grant further access to anyone." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{0wn3r_c4n_r3gr4nt_4cc3ss}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The fix should match access to only what the partner actually needs, not just a lower built-in role." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Replace it with a scoped custom role covering only the specific permissions required." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{sc0p3d_cust0m_r0l3_f1x}" },
    ],
  },
  {
    slug: "gcp-iam-permissions",
    title: "GCP IAM Permissions Audit",
    description: "Review a GCP project's IAM bindings, spot a public allAuthenticatedUsers grant and an over-broad Editor role, and correct both with minimal custom roles.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Cloud Security", points: 220, published: true,
    flags: [
      { value: "SAGE{4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3}", points: 65 },
      { value: "SAGE{3d1t0r_t00_br04d_f0r_c1_d3pl0y}", points: 75 },
      { value: "SAGE{cust0m_r0l3_c1_sc0p3d}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "One binding's member isn't a specific person or service account at all." },
      { stage: "task_1", level: 2, pointCost: 20, text: "allAuthenticatedUsers means any Google account anywhere, not just your organization." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare what roles/editor actually grants to the two specific services the CI account touches." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Editor grants near-project-wide write access, far beyond deploying to Cloud Run and pushing to Artifact Registry." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{3d1t0r_t00_br04d_f0r_c1_d3pl0y}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The fix should name the exact permissions the CI pipeline needs, nothing more." },
      { stage: "task_3", level: 2, pointCost: 20, text: "A custom role scoped to just Cloud Run deploy and Artifact Registry push replaces the broad Editor grant." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{cust0m_r0l3_c1_sc0p3d}" },
    ],
  },

  // ── Real World Mini Incident ────────────────────────────────────────────
  {
    slug: "ransomware-incident",
    title: "Real Incident: Ransomware Outbreak",
    description: "A full end-to-end ransomware investigation: trace the phishing foothold, follow lateral movement to the file server, and contain the outbreak before recovery.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 320, published: true,
    flags: [
      { value: "SAGE{macr0_3n4bl3d_x1sm_ph1sh1ng}", points: 95 },
      { value: "SAGE{c4ch3d_d0m41n_4dm1n_r3us3}", points: 105 },
      { value: "SAGE{1s0l4t3_r3st0r3_d0nt_p4y_f1rst}", points: 120 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Look at what the email attachment was and what process it spawned on execution." },
      { stage: "task_1", level: 2, pointCost: 25, text: "A macro-enabled spreadsheet spawned PowerShell with an encoded command the moment it was opened." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{macr0_3n4bl3d_x1sm_ph1sh1ng}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Check what kind of credential was used to reach the file server's admin share." },
      { stage: "task_2", level: 2, pointCost: 25, text: "A cached domain admin token on the workstation let the attacker connect directly to FS01's admin$ share." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{c4ch3d_d0m41n_4dm1n_r3us3}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Two hosts are actively compromised right now — think about ordering: contain first, then recover." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Isolate both hosts immediately, then restore from the last known-good backup — don't engage the ransom note first." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{1s0l4t3_r3st0r3_d0nt_p4y_f1rst}" },
    ],
  },
];

async function main() {
  for (const lab of LABS) {
    const { flags, hints, ...labData } = lab;

    const created = await db.lab.upsert({
      where: { slug: lab.slug },
      update: labData,
      create: labData,
    });

    await db.flag.deleteMany({ where: { labId: created.id } });
    await db.labHint.deleteMany({ where: { labId: created.id } });

    await db.flag.createMany({
      data: flags.map((f) => ({ labId: created.id, value: f.value, points: f.points })),
    });
    await db.labHint.createMany({
      data: hints.map((h) => ({ labId: created.id, stage: h.stage, level: h.level, pointCost: h.pointCost, text: h.text })),
    });

    console.log(`✓ ${lab.title} — ${flags.length} flags, ${hints.length} hints`);
  }
  console.log(`Batch 4 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
