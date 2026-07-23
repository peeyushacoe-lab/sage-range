// Seeds batch 8: Threat Intelligence category — 6 labs covering WHOIS pivoting,
// IOC correlation across alerts, threat actor profiling, MITRE ATT&CK Navigator
// mapping, malware family research, and multi-source campaign attribution.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-8.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "whois-analysis",
    title: "WHOIS Analysis",
    description: "Use WHOIS registration data to spot infrastructure patterns tying a phishing domain back to an attacker's other domains.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Threat Intelligence", points: 160, published: true,
    flags: [
      { value: "SAGE{d0m41n_r3g1st3r3d_3_d4ys_4g0}", points: 50 },
      { value: "SAGE{sh4r3d_1nfr4_p1v0t_c4mp41gn}", points: 55 },
      { value: "SAGE{wh01s_4l0n3_w34k_3v1d3nc3}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "A bank's real login portal doesn't get registered a few days before an active phishing campaign." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Domain age of only 3 days is the strongest single red flag here." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{d0m41n_r3g1st3r3d_3_d4ys_4g0}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Multiple domains sharing the same nameservers or registrant fingerprint aren't a coincidence." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Shared infrastructure lets you pivot from one confirmed domain to find the rest of the campaign." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{sh4r3d_1nfr4_p1v0t_c4mp41gn}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about how easy WHOIS privacy protection and fake details are to obtain." },
      { stage: "task_3", level: 2, pointCost: 20, text: "WHOIS data is trivially spoofable/hidden, so it's weak evidence without corroboration from other sources." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{wh01s_4l0n3_w34k_3v1d3nc3}" },
    ],
  },
  {
    slug: "ioc-correlation",
    title: "IOC Correlation",
    description: "Correlate indicators of compromise across multiple internal alerts and an external threat feed to confirm a single coordinated campaign.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Threat Intelligence", points: 220, published: true,
    flags: [
      { value: "SAGE{s1ngl3_c4mp41gn_sh4r3d_c2}", points: 65 },
      { value: "SAGE{c0rr3l4t3_by_sh4r3d_10c_n0t_src}", points: 75 },
      { value: "SAGE{p1v0t_0n_c0nf1rm3d_10cs}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The three alerts have different source IPs, but check what C2 domain they all beacon to." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A shared C2 domain across all three alerts confirms they're part of one campaign." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{s1ngl3_c4mp41gn_sh4r3d_c2}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Grouping alerts by source IP alone would miss the connection here." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Correlate by the shared indicator (C2 domain/subnet), not by which internal host triggered the alert." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{c0rr3l4t3_by_sh4r3d_10c_n0t_src}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "You've confirmed the shared infrastructure — what do you do with that now?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "Pivot on the confirmed IOCs to hunt for any other hosts talking to the same infrastructure." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{p1v0t_0n_c0nf1rm3d_10cs}" },
    ],
  },
  {
    slug: "threat-actor-profiling",
    title: "Threat Actor Profiling",
    description: "Build a profile of an intrusion set from observed TTPs, and match it against known threat actor reporting.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Threat Intelligence", points: 220, published: true,
    flags: [
      { value: "SAGE{t4rg3t3d_4pt_styl3_1ntrus10n}", points: 65 },
      { value: "SAGE{4nt1c1p4t3_n3xt_m0v3s_fr0m_pr0f1l3}", points: 75 },
      { value: "SAGE{ttp_0v3rl4p_n0t_pr00f}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Spearphishing plus Cobalt Strike plus a specific sector/region focus points away from opportunistic crimeware." },
      { stage: "task_1", level: 2, pointCost: 20, text: "This combination reads as a targeted, APT-style intrusion rather than commodity malware." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{t4rg3t3d_4pt_styl3_1ntrus10n}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what a profile match lets defenders do, even without perfect certainty." },
      { stage: "task_2", level: 2, pointCost: 20, text: "A profile match lets you anticipate likely next moves and apply relevant known mitigations." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{4nt1c1p4t3_n3xt_m0v3s_fr0m_pr0f1l3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Consider how unique any given TTP actually is to one specific group." },
      { stage: "task_3", level: 2, pointCost: 20, text: "TTPs get shared or copied between groups, so overlap alone isn't proof of the same actor." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{ttp_0v3rl4p_n0t_pr00f}" },
    ],
  },
  {
    slug: "mitre-navigator",
    title: "MITRE ATT&CK Navigator",
    description: "Map a real intrusion's observed behaviors onto the MITRE ATT&CK framework using the Navigator tool to visualize coverage gaps.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Threat Intelligence", points: 160, published: true,
    flags: [
      { value: "SAGE{p3rs1st3nc3_t4ct1c}", points: 50 },
      { value: "SAGE{bl1nd_sp0t_cr3d3nt14l_4cc3ss}", points: 55 },
      { value: "SAGE{v1su4l1z3_c0v3r4g3_g4ps}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Scheduled tasks are a classic technique for staying on a host across reboots." },
      { stage: "task_1", level: 2, pointCost: 20, text: "That maps to the Persistence tactic in the ATT&CK matrix." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{p3rs1st3nc3_t4ct1c}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Credential dumping happened, but no detections fired for that tactic — what does that gap mean?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "It's a detection blind spot for Credential Access that needs new coverage built out." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{bl1nd_sp0t_cr3d3nt14l_4cc3ss}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Compare reading a text narrative of an intrusion versus seeing it plotted on the full technique matrix." },
      { stage: "task_3", level: 2, pointCost: 20, text: "The heatmap visualizes exactly where your detection coverage has gaps against the techniques actually used." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{v1su4l1z3_c0v3r4g3_g4ps}" },
    ],
  },
  {
    slug: "malware-family-research",
    title: "Malware Family Research",
    description: "Identify a malware sample's family from its behavioral characteristics, and pull the associated known IOCs to hunt for it.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Threat Intelligence", points: 220, published: true,
    flags: [
      { value: "SAGE{l0ckb1t_r4ns0mw4r3_f4m1ly}", points: 65 },
      { value: "SAGE{f4m1ly_1d_t41l0rs_r3sp0ns3}", points: 75 },
      { value: "SAGE{ch3ck_f4m1ly_sp3c1f1c_f33ds}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The encrypted file extension and ransom note filename are distinctive identifiers." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The .lockbit3 extension and double-extortion model point to the LockBit ransomware family." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{l0ckb1t_r4ns0mw4r3_f4m1ly}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think beyond 'it's ransomware' — what does knowing the specific family unlock?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "Family-specific TTPs and known weaknesses let you tailor both response and recovery." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{f4m1ly_1d_t41l0rs_r3sp0ns3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Generic threat feeds won't have the freshest infrastructure for one specific family." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Check threat intel feeds/reports specifically tracking this named ransomware family." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{ch3ck_f4m1ly_sp3c1f1c_f33ds}" },
    ],
  },
  {
    slug: "campaign-attribution",
    title: "Campaign Attribution",
    description: "Weigh technical, operational, and strategic evidence together to assess confidence in attributing a multi-stage campaign to a specific actor.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Threat Intelligence", points: 260, published: true,
    flags: [
      { value: "SAGE{m0d3r4t3_c0nf1d3nc3_4ttr1but10n}", points: 80 },
      { value: "SAGE{c0rr0b0r4t3_4cr0ss_3v1d3nc3_typ3s}", points: 85 },
      { value: "SAGE{st4t3_c0nf1d3nc3_3xpl1c1tly}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Weigh one high-confidence indicator against two medium-confidence ones together, not in isolation." },
      { stage: "task_1", level: 2, pointCost: 25, text: "Combined, this evidence supports a moderate — not low, not high — overall confidence level." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{m0d3r4t3_c0nf1d3nc3_4ttr1but10n}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Think about how custom malware can end up in the hands of more than one group." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Malware can be shared, leaked, sold, or false-flagged, so it needs corroboration from other evidence types." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{c0rr0b0r4t3_4cr0ss_3v1d3nc3_typ3s}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Think about how the report should present the attribution to avoid overstating certainty." },
      { stage: "task_3", level: 2, pointCost: 25, text: "State the confidence level explicitly and show the supporting evidence rather than asserting certainty." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{st4t3_c0nf1d3nc3_3xpl1c1tly}" },
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
  console.log(`Batch 8 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
