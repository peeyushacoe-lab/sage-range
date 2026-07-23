// Seeds batch 5: closes out the named DFIR and Detection Engineering gaps,
// plus 3 more Blue Team batch-2 labs (Splunk hunting, USB file-copy forensics,
// incident severity triage). 10 labs total.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-5.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  // ── DFIR ───────────────────────────────────────────────────────────────
  {
    slug: "prefetch-analysis",
    title: "Prefetch Analysis",
    description: "Parse Windows Prefetch files to reconstruct execution history, spot a rare execution outlier, and correlate run count with intrusion timing.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{upd4t3_h3lp3r_run_c0unt_1}", points: 65 },
      { value: "SAGE{public_f0ld3r_3x3cut10n}", points: 75 },
      { value: "SAGE{pr3f3tch_c0nf1rms_3ntry_p01nt}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Compare run counts — a normal workstation tool is used constantly." },
      { stage: "task_1", level: 2, pointCost: 20, text: "update_helper.exe has only run once, unlike calc.exe or chrome.exe." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{upd4t3_h3lp3r_run_c0unt_1}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Check where the executable actually ran from on disk." },
      { stage: "task_2", level: 2, pointCost: 20, text: "C:\\Users\\Public is writable by anyone and isn't where legitimate installers place binaries." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{public_f0ld3r_3x3cut10n}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Compare the prefetch last-run time against the phishing alert timestamp." },
      { stage: "task_3", level: 2, pointCost: 20, text: "The near-identical timestamps confirm the attachment executed almost immediately after opening." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{pr3f3tch_c0nf1rms_3ntry_p01nt}" },
    ],
  },
  {
    slug: "usb-artefacts",
    title: "USB Artefacts Investigation",
    description: "Correlate USBSTOR registry entries, shellbag evidence, and DLP logs to prove which USB device exfiltrated data and when.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{4c530001a1b2c3d4_l4st_c0nn_apr9}", points: 65 },
      { value: "SAGE{sh3llb4gs_c0nf1rm_4cc3ss}", points: 75 },
      { value: "SAGE{1m4g3_pr3s3rv3_3v1d3nc3}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The USBSTOR key entry lists both the serial number and the last-connected timestamp directly." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Serial 4C530001A1B2C3D4, last connected April 9." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4c530001a1b2c3d4_l4st_c0nn_apr9}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Shellbags record which folders a user actually browsed, not just whether a device was plugged in." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Matching shellbag entries confirm the files were actively accessed on that specific device." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{sh3llb4gs_c0nf1rm_4cc3ss}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about evidence handling before drawing final conclusions." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Image and preserve the physical device as evidence before it can be altered or returned." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{1m4g3_pr3s3rv3_3v1d3nc3}" },
    ],
  },
  {
    slug: "event-correlation",
    title: "Event Correlation",
    description: "Correlate Windows Security, Sysmon, and privilege-assignment logs across three different hosts to trace one attacker session end-to-end.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{l0g0n1d_0x3e7a21_c0rr3l4t10n}", points: 65 },
      { value: "SAGE{s1ngl3_s3ss10n_multi_h0st_p1v0t}", points: 75 },
      { value: "SAGE{k1ll_s3ss10n_r0t4t3_cr3ds}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "All three log lines share one field value in common." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The Logon ID 0x3E7A21 appears in every entry, tying them to the same session." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{l0g0n1d_0x3e7a21_c0rr3l4t10n}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Read the three hosts' events in timestamp order as one story." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Logon on Host A, SMB pivot to Host B, privilege escalation on Host C — all one session." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{s1ngl3_s3ss10n_multi_h0st_p1v0t}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "A single Logon ID can be killed centrally, and the account behind it can be rotated." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Kill that specific session and rotate svc_deploy's credentials everywhere it has access." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{k1ll_s3ss10n_r0t4t3_cr3ds}" },
    ],
  },

  // ── Detection Engineering ────────────────────────────────────────────────
  {
    slug: "sigma-to-sentinel",
    title: "Sigma to Sentinel Conversion",
    description: "Convert a Sigma detection rule into Microsoft Sentinel KQL, and fix a logic gap that would have missed the actual attack technique.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 220, published: true,
    flags: [
      { value: "SAGE{d3v1c3pr0c3ss3v3nts_t4bl3}", points: 65 },
      { value: "SAGE{t00_br0ad_kql_transl4t10n}", points: 75 },
      { value: "SAGE{4rgum3nt_sc0p3d_d3t3ct10n}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "A Sigma process_creation category maps to a specific process-event table in Sentinel/Defender." },
      { stage: "task_1", level: 2, pointCost: 20, text: "DeviceProcessEvents (or SecurityEvent) is the process-creation source table." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{d3v1c3pr0c3ss3v3nts_t4bl3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Look at exactly what the translated KQL filters on." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Matching only the process name means it fires on virtually every legitimate rundll32 use too." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{t00_br0ad_kql_transl4t10n}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The fix needs to narrow on what makes the malicious usage different, not just the binary." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Scope the condition to the specific suspicious argument/DLL pattern." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{4rgum3nt_sc0p3d_d3t3ct10n}" },
    ],
  },
  {
    slug: "ioc-feed-integration",
    title: "IOC Feed Integration",
    description: "Wire an external threat-intel IOC feed into your SIEM's watchlist, resolve conflicting entries, and decide which indicators are safe to auto-block.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 220, published: true,
    flags: [
      { value: "SAGE{h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns}", points: 65 },
      { value: "SAGE{m0n1t0r_f1rst_n0t_4ut0_bl0ck}", points: 75 },
      { value: "SAGE{h1gh_c0nf_multi_f33d_4ut0bl0ck}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Weigh both the confidence level and how recently each feed observed the indicator." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The high-confidence, 2-day-old entry is more trustworthy than the low-confidence, 45-day-old one." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Medium confidence from one feed alone isn't enough for automatic enforcement." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Watchlist it for monitoring/alerting first, don't auto-block on a single medium-confidence source." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{m0n1t0r_f1rst_n0t_4ut0_bl0ck}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Auto-blocking needs a higher bar than any single feed can usually provide alone." },
      { stage: "task_3", level: 2, pointCost: 20, text: "High confidence AND corroboration across multiple independent feeds is the right bar." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{h1gh_c0nf_multi_f33d_4ut0bl0ck}" },
    ],
  },
  {
    slug: "detection-logic-building",
    title: "Build Detection Logic",
    description: "Design multi-condition detection logic for credential stuffing that distinguishes it from normal login noise using combined threshold logic.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 220, published: true,
    flags: [
      { value: "SAGE{h1gh_v0lum3_4nd_un1qu3_us3rs}", points: 65 },
      { value: "SAGE{4nd_l0g1c_n0t_0r}", points: 75 },
      { value: "SAGE{b4s3l1n3_dr1v3n_thr3sh0ld}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Credential stuffing looks different from normal noise on two axes at once." },
      { stage: "task_1", level: 2, pointCost: 20, text: "High failed-login volume combined with a large number of distinct usernames from one source." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{h1gh_v0lum3_4nd_un1qu3_us3rs}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what happens if either condition alone could trigger the alert." },
      { stage: "task_2", level: 2, pointCost: 20, text: "OR logic would fire on either high volume OR many usernames alone — too noisy. Require both together." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{4nd_l0g1c_n0t_0r}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "A fixed static number won't work for every environment or every time of day." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Base the threshold on the environment's own historical baseline, alerting only on real deviations." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{b4s3l1n3_dr1v3n_thr3sh0ld}" },
    ],
  },
  {
    slug: "detection-validation",
    title: "Detection Validation & Tuning",
    description: "Run a new detection rule against a week of real traffic, measure its false-positive rate, and decide whether it's ready for blocking mode.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 220, published: true,
    flags: [
      { value: "SAGE{98_p3rc3nt_f4ls3_p0s1t1v3_r4t3}", points: 65 },
      { value: "SAGE{n0t_r34dy_f0r_4ut0_bl0ck}", points: 75 },
      { value: "SAGE{3xclud3_kn0wn_g00d_r3b4s3l1n3}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Divide false positives by total alerts fired." },
      { stage: "task_1", level: 2, pointCost: 20, text: "334 of 340 alerts were false positives — about 98%." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{98_p3rc3nt_f4ls3_p0s1t1v3_r4t3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Consider what auto-blocking would do at a 98% false-positive rate." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It would constantly disrupt legitimate admin work — not ready for blocking mode." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{n0t_r34dy_f0r_4ut0_bl0ck}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Look at what the 334 false positives likely have in common." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Exclude known-legitimate signed admin script sources and re-baseline before reconsidering blocking." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{3xclud3_kn0wn_g00d_r3b4s3l1n3}" },
    ],
  },

  // ── Blue Team batch 2 ─────────────────────────────────────────────────────
  {
    slug: "splunk-detection-hunt",
    title: "Splunk Detection Hunt",
    description: "Write and refine a Splunk search to hunt for beaconing C2 traffic hidden in a week of proxy logs, then pivot the finding across the fleet.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "SOC", points: 220, published: true,
    flags: [
      { value: "SAGE{60s_1nt3rv4l_b34c0n1ng}", points: 65 },
      { value: "SAGE{t1m3_d3lt4_v4r14nc3_4n4lys1s}", points: 75 },
      { value: "SAGE{p1v0t_4cr0ss_4ll_h0sts}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at the time gap between successive requests to the same destination." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Requests recur roughly every 60 seconds with almost no variance — classic beacon timing." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{60s_1nt3rv4l_b34c0n1ng}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "A raw port/domain filter alone won't separate beacons from normal browsing." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Compute time deltas between requests per destination and look for low-variance, regular intervals." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{t1m3_d3lt4_v4r14nc3_4n4lys1s}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "One infected host is rarely the whole story." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Pivot the confirmed beaconing domain across every other host's proxy logs to find additional infections." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{p1v0t_4cr0ss_4ll_h0sts}" },
    ],
  },
  {
    slug: "usb-forensics",
    title: "USB Forensics: File Copy Detection",
    description: "Analyze LNK files and Windows Search history to prove which specific files were copied to a USB drive before an employee's last day.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Insider Threat", points: 220, published: true,
    flags: [
      { value: "SAGE{2_c0nf1d3nt14l_f1l3s_jun14}", points: 65 },
      { value: "SAGE{f0cus_0n_r3l3v4nt_t1m3fr4m3}", points: 75 },
      { value: "SAGE{pr3s3rv3_4s_c1rcumst4nt14l_3v1d3nc3}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Filter the LNK files by both the drive letter and the date of the employee's last day." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Two confidential files were accessed from E: on June 14, the employee's last working day." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{2_c0nf1d3nt14l_f1l3s_jun14}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Not every LNK file on the same drive is relevant to this specific investigation." },
      { stage: "task_2", level: 2, pointCost: 20, text: "The month-old vacation photo just shows prior device use — stay focused on the June 14 timeframe." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{f0cus_0n_r3l3v4nt_t1m3fr4m3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "LNK evidence alone, without the physical device, still has investigative value — just not absolute proof." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Preserve it as strong circumstantial evidence for HR/Legal and try to recover the physical device if it's still accessible." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{pr3s3rv3_4s_c1rcumst4nt14l_3v1d3nc3}" },
    ],
  },
  {
    slug: "incident-severity-classification",
    title: "Incident Severity Classification",
    description: "Triage three simultaneous alerts against an organization's severity matrix and decide which one demands immediate escalation.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "SOC", points: 170, published: true,
    flags: [
      { value: "SAGE{4l3rt_2_d0m41n_4dm1n_cr1t1c4l}", points: 50 },
      { value: "SAGE{pr1v_4cc3ss_4n0m4ly_1mp4ct}", points: 60 },
      { value: "SAGE{l0w_s3v_r0ut1n3_m0n1t0r1ng}", points: 60 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Weigh account privilege, timing/location anomaly, and impact of the follow-on action for each alert." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A domain admin logon from a new country at 3 AM followed by AD replication changes is the standout." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4l3rt_2_d0m41n_4dm1n_cr1t1c4l}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "No single factor alone makes it critical — it's the combination." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Privileged account, plus anomalous access pattern, plus high-impact action together push it to critical." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{pr1v_4cc3ss_4n0m4ly_1mp4ct}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Neither of the other two alerts shows privilege escalation or follow-on impact." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Both are low severity — routine monitoring is sufficient, and they shouldn't compete with the critical alert for response time." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{l0w_s3v_r0ut1n3_m0n1t0r1ng}" },
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
  console.log(`Batch 5 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
