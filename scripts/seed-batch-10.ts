// Seeds batch 10: Real World Mini Incidents — 10 labs covering insider theft,
// BEC, DDoS, supply chain compromise, cloud data breach, credential stuffing,
// zero-day exploitation, rogue wireless AP, payment card skimming, and
// third-party vendor compromise. Each is a compact, realistic incident
// scenario built around a single core lesson.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-10.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "insider-data-theft",
    title: "Insider Data Theft",
    description: "Investigate a departing employee suspected of exfiltrating proprietary data before their last day, using DLP alerts and access logs.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 260, published: true,
    flags: [
      { value: "SAGE{15gb_p3rs0n4l_dr1v3_upl04d}", points: 80 },
      { value: "SAGE{st4g1ng_4cc3ss_b3f0r3_3xf1l}", points: 85 },
      { value: "SAGE{r3v0k3_4cc3ss_pr3s3rv3_f0r3ns1cs}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Check DLP alerts around the time resignation was announced." },
      { stage: "task_1", level: 2, pointCost: 25, text: "A 15GB upload to a personal Google Drive account 2 days before resignation is the concrete red flag." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{15gb_p3rs0n4l_dr1v3_upl04d}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "The employee accessed a folder they hadn't touched in 8 months, just before the upload." },
      { stage: "task_2", level: 2, pointCost: 25, text: "This looks like staging — gathering files they didn't normally need ahead of exfiltration." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{st4g1ng_4cc3ss_b3f0r3_3xf1l}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Think about both stopping further access and keeping what's needed for the investigation." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Restrict/revoke access to sensitive systems and preserve the account and device for forensic imaging." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{r3v0k3_4cc3ss_pr3s3rv3_f0r3ns1cs}" },
    ],
  },
  {
    slug: "business-email-compromise",
    title: "Business Email Compromise",
    description: "Investigate a BEC incident where an attacker gained access to a mailbox and used it to redirect a vendor payment.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Incident Response", points: 220, published: true,
    flags: [
      { value: "SAGE{4ut0f0rw4rd_1nv01c3_rul3}", points: 65 },
      { value: "SAGE{p4ym3nt_r3d1r3ct10n_fr4ud}", points: 75 },
      { value: "SAGE{4tt3mpt_w1r3_r3c4ll_1mm3d14t3ly}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Check the compromised mailbox's inbox rules for anything auto-forwarding or auto-deleting." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A rule forwarding all 'invoice' emails externally and deleting the originals is the malicious feature here." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4ut0f0rw4rd_1nv01c3_rul3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The attacker sent 'updated' bank details from a trusted, compromised account mid-transaction." },
      { stage: "task_2", level: 2, pointCost: 20, text: "This specific technique is payment/invoice redirection fraud." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{p4ym3nt_r3d1r3ct10n_fr4ud}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Money may still be moving — think about what's still reversible." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Contact the bank/vendor immediately to attempt to halt or recall the wire transfer." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{4tt3mpt_w1r3_r3c4ll_1mm3d14t3ly}" },
    ],
  },
  {
    slug: "ddos-attack-incident",
    title: "DDoS Attack Incident",
    description: "Respond to a volumetric DDoS attack taking down a public-facing service, distinguishing it from an internal outage.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Incident Response", points: 220, published: true,
    flags: [
      { value: "SAGE{50x_b4s3l1n3_thous4nds_0f_1ps}", points: 65 },
      { value: "SAGE{scrubb1ng_s3rv1c3_4bs0rbs_v0lum3}", points: 75 },
      { value: "SAGE{d0s_c4n_h1d3_cr3d_stuff1ng}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at how far above baseline the traffic is, and how many distinct sources are involved." },
      { stage: "task_1", level: 2, pointCost: 20, text: "50x baseline from thousands of distinct IPs all hitting the same endpoint confirms a DDoS, not a normal surge." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{50x_b4s3l1n3_thous4nds_0f_1ps}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "You need something that can absorb volume before it ever reaches your own servers." },
      { stage: "task_2", level: 2, pointCost: 20, text: "A DDoS scrubbing service or CDN can filter the flood before it reaches your origin." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{scrubb1ng_s3rv1c3_4bs0rbs_v0lum3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "A flood of login attempts can hide something else inside it." },
      { stage: "task_3", level: 2, pointCost: 20, text: "A DDoS can mask a credential stuffing attempt riding along inside the traffic flood." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{d0s_c4n_h1d3_cr3d_stuff1ng}" },
    ],
  },
  {
    slug: "supply-chain-compromise",
    title: "Supply Chain Compromise",
    description: "Discover that a trusted third-party software update itself was the initial infection vector, and scope the resulting blast radius.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 260, published: true,
    flags: [
      { value: "SAGE{tru5t3d_51gn3d_upd4t3_b4ckd00r}", points: 80 },
      { value: "SAGE{s1gn1ng_n0t_suff1c13nt_4l0n3}", points: 85 },
      { value: "SAGE{4ll_1nst4lls_4ss3ss3d_4s_c0mpr0m1s3d}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "The malicious DLL rode in through a signed, official update from a trusted vendor." },
      { stage: "task_1", level: 2, pointCost: 25, text: "A backdoor inside a legitimately signed, trusted update is what made this so hard to catch." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{tru5t3d_51gn3d_upd4t3_b4ckd00r}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Think about what code signing actually proves, and what it doesn't." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Signing proves origin/integrity from the vendor, not that the vendor's build pipeline itself is clean." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{s1gn1ng_n0t_suff1c13nt_4l0n3}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "You can't know in advance which specific installs were targeted further." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Treat every system that installed the compromised update version as potentially compromised until proven otherwise." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{4ll_1nst4lls_4ss3ss3d_4s_c0mpr0m1s3d}" },
    ],
  },
  {
    slug: "cloud-data-breach",
    title: "Cloud Data Breach",
    description: "Investigate a publicly-exposed cloud storage bucket that leaked customer data, and determine how long it was exposed.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Incident Response", points: 220, published: true,
    flags: [
      { value: "SAGE{2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss}", points: 65 },
      { value: "SAGE{n0_4ut0m4t3d_3xp0sur3_m0n1t0r1ng}", points: 75 },
      { value: "SAGE{br34ch_n0t1f1c4t10n_r3qu1r3d}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Compare when public read was enabled against when external download requests actually started." },
      { stage: "task_1", level: 2, pointCost: 20, text: "External downloads began 2 days after the misconfiguration, which is the realistic start of unauthorized access." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The misconfiguration sat undiscovered for 45 days — what does that gap say about monitoring?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "There was no automated alerting for public bucket exposure, letting it go unnoticed for over a month." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{n0_4ut0m4t3d_3xp0sur3_m0n1t0r1ng}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Confirmed unauthorized access to customer data triggers obligations beyond just fixing the bucket." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Breach notification to affected customers and regulators is likely required." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{br34ch_n0t1f1c4t10n_r3qu1r3d}" },
    ],
  },
  {
    slug: "credential-stuffing-attack",
    title: "Credential Stuffing Attack",
    description: "Recognize a credential stuffing attack using leaked password lists from an unrelated breach, and separate it from targeted brute force.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Incident Response", points: 160, published: true,
    flags: [
      { value: "SAGE{cr3d3nt14l_stuff1ng}", points: 50 },
      { value: "SAGE{m4ny_4cc0unts_kn0wn_cr3ds}", points: 55 },
      { value: "SAGE{mfa_d3f34ts_stuff1ng}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Each pair is tried only once, and they match a known public breach dump from a different company." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Using breached credentials from other sites against this login is credential stuffing." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{cr3d3nt14l_stuff1ng}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare targeting many different accounts once each versus guessing repeatedly on one account." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It targets many accounts with pre-obtained, likely-valid pairs rather than repeatedly guessing one account's password." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{m4ny_4cc0unts_kn0wn_cr3ds}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about what control still stops a login even with the correct password." },
      { stage: "task_3", level: 2, pointCost: 20, text: "MFA defeats stuffing because a correct password alone is no longer enough to log in." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{mfa_d3f34ts_stuff1ng}" },
    ],
  },
  {
    slug: "zero-day-exploitation",
    title: "Zero-Day Exploitation",
    description: "Respond to active exploitation of a vulnerability with no available vendor patch, focusing on compensating controls instead of a fix that doesn't exist yet.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 260, published: true,
    flags: [
      { value: "SAGE{n0_p4tch_4v41l4bl3_y3t}", points: 80 },
      { value: "SAGE{c0mp3ns4t1ng_c0ntr0ls_n0t_p4tch}", points: 85 },
      { value: "SAGE{r3sp0ns1bl3_d1scl0sur3_h3lps_4ll}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "The vulnerability is being actively used, but the vendor hasn't shipped a fix yet." },
      { stage: "task_1", level: 2, pointCost: 25, text: "No patch being available at the time of active exploitation is exactly what defines a zero-day." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{n0_p4tch_4v41l4bl3_y3t}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "You can't apply a fix that doesn't exist — what can you do instead, right now?" },
      { stage: "task_2", level: 2, pointCost: 25, text: "Deploy compensating controls like WAF rules, segmentation, or disabling the vulnerable feature." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{c0mp3ns4t1ng_c0ntr0ls_n0t_p4tch}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Think beyond your own organization — who else is affected by this same unpatched flaw?" },
      { stage: "task_3", level: 2, pointCost: 25, text: "Responsible disclosure speeds up a vendor fix and protects other exposed organizations too." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{r3sp0ns1bl3_d1scl0sur3_h3lps_4ll}" },
    ],
  },
  {
    slug: "rogue-wireless-ap",
    title: "Rogue Wireless Access Point",
    description: "Track down an unauthorized wireless access point set up inside the office broadcasting a name that mimics the corporate Wi-Fi.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Incident Response", points: 220, published: true,
    flags: [
      { value: "SAGE{ev1l_tw1n_4p_l00k4l1k3_ss1d}", points: 65 },
      { value: "SAGE{tr14ngul4t3_s1gn4l_l0c4t3_d3v1c3}", points: 75 },
      { value: "SAGE{r3s3t_cr3ds_p0t3nt14lly_c4ptur3d}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The rogue SSID looks almost identical to the real corporate one, differing by a single character." },
      { stage: "task_1", level: 2, pointCost: 20, text: "This look-alike SSID is designed to enable an evil-twin style attack, tricking users into connecting." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{ev1l_tw1n_4p_l00k4l1k3_ss1d}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "You need to find where in the building this physical device actually is." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Triangulating signal strength across multiple scan points helps physically locate the device." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{tr14ngul4t3_s1gn4l_l0c4t3_d3v1c3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Anyone who connected to the rogue AP may have had their traffic intercepted." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Force a password reset for potentially affected accounts, since credentials may have been captured." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{r3s3t_cr3ds_p0t3nt14lly_c4ptur3d}" },
    ],
  },
  {
    slug: "payment-card-skimmer",
    title: "Payment Card Skimmer",
    description: "Investigate a web-based payment card skimmer (Magecart-style) injected into a checkout page's JavaScript.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Incident Response", points: 220, published: true,
    flags: [
      { value: "SAGE{m4g3c4rt_style_sk1mm3r}", points: 65 },
      { value: "SAGE{t4rg3ts_p4ym3nt_d4t4_p01nt}", points: 75 },
      { value: "SAGE{csp_bl0cks_unauth0r1z3d_scr1pts}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "A new script tag pointing to an unfamiliar domain was injected into the checkout page." },
      { stage: "task_1", level: 2, pointCost: 20, text: "This kind of web-based card-stealing injection is commonly called a Magecart-style skimmer." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{m4g3c4rt_style_sk1mm3r}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The script only runs on one specific page — think about why that page in particular." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It's positioned exactly where customers enter card data, avoiding pages with nothing worth stealing." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{t4rg3ts_p4ym3nt_d4t4_p01nt}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about a browser-enforced policy that restricts which scripts are even allowed to load." },
      { stage: "task_3", level: 2, pointCost: 20, text: "A Content Security Policy restricting allowed script sources would have blocked this from ever loading." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{csp_bl0cks_unauth0r1z3d_scr1pts}" },
    ],
  },
  {
    slug: "third-party-vendor-compromise",
    title: "Third-Party Vendor Compromise",
    description: "Assess the blast radius when a third-party vendor with privileged access to your environment is itself compromised.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 260, published: true,
    flags: [
      { value: "SAGE{4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d}", points: 80 },
      { value: "SAGE{r3v0k3_v3nd0r_4cc3ss_n0w}", points: 85 },
      { value: "SAGE{l34st_pr1v_4nd_m0n1t0r_v3nd0rs}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "The vendor's own environment — the one holding credentials into your network — was breached." },
      { stage: "task_1", level: 2, pointCost: 25, text: "You must assume the credentials the vendor used to access your environment are now compromised too." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Don't wait for the vendor's investigation to finish before acting on your side." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Immediately revoke or disable the vendor's remote access until the situation is fully understood." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{r3v0k3_v3nd0r_4cc3ss_n0w}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "This incident should prompt a broader look at how third parties are trusted in general." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Review whether third-party access follows least-privilege and is properly monitored, not just trusted by default." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{l34st_pr1v_4nd_m0n1t0r_v3nd0rs}" },
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
  console.log(`Batch 10 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
