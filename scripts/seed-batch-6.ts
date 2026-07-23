// Seeds batch 6: closes out the Red Team roadmap gap — 10 labs covering
// tooling workflow (Hydra, Burp), web/API pentesting, Linux post-exploitation,
// and a full Active Directory attack chain (Kerberoasting, DCSync, Golden
// Ticket, lateral movement).
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-6.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "hydra-advanced",
    title: "Hydra Advanced Techniques",
    description: "Move beyond basic Hydra usage — build a targeted wordlist to avoid lockouts, read a real result, and know when to stop.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Web Security", points: 200, published: true,
    flags: [
      { value: "SAGE{t4rg3t3d_w0rdl1st_4v01ds_l0ck0ut}", points: 60 },
      { value: "SAGE{jsm1th_summ3r2026_val1d}", points: 70 },
      { value: "SAGE{st0p_spr4y1ng_4ft3r_h1t}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The org's disclosed password pattern is season+year — use that instead of a huge generic list." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A small, targeted wordlist matching the known pattern avoids tripping the lockout threshold." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{t4rg3t3d_w0rdl1st_4v01ds_l0ck0ut}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Read the Hydra output line for the successful login directly." },
      { stage: "task_2", level: 2, pointCost: 20, text: "jsmith / Summer2026! is the valid pair." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{jsm1th_summ3r2026_val1d}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about what continuing to spray does once you already have a working credential." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Stop spraying that account and move to using the credential for the authorized next step." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{st0p_spr4y1ng_4ft3r_h1t}" },
    ],
  },
  {
    slug: "api-pentesting",
    title: "API Pentesting",
    description: "Test a REST API for broken object-level authorization and excessive data exposure, then design the right access-control fix.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Web Security", points: 220, published: true,
    flags: [
      { value: "SAGE{b0l4_br0k3n_0bj3ct_l3v3l_4uth}", points: 65 },
      { value: "SAGE{3xc3ss1v3_d4t4_3xp0sur3}", points: 75 },
      { value: "SAGE{s3rv3r_s1d3_0wn3rsh1p_ch3ck}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Changing the order ID in the URL alone returns someone else's order." },
      { stage: "task_1", level: 2, pointCost: 20, text: "This is OWASP API Security's #1 issue: Broken Object Level Authorization." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{b0l4_br0k3n_0bj3ct_l3v3l_4uth}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The UI only shows last 4 digits, but check what the raw API response contains." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Full card numbers and SSNs in the response body are Excessive Data Exposure, regardless of what the UI displays." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{3xc3ss1v3_d4t4_3xp0sur3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The fix needs to happen where the request can't be trusted: the server." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Enforce server-side ownership checks on every object fetch, independent of the ID supplied." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{s3rv3r_s1d3_0wn3rsh1p_ch3ck}" },
    ],
  },
  {
    slug: "post-exploitation-basics",
    title: "Post-Exploitation Basics",
    description: "After landing a shell on a Linux host, enumerate for credentials and privilege escalation, then plan the next pivot.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Linux Security", points: 220, published: true,
    flags: [
      { value: "SAGE{pl41nt3xt_cr3d_1n_b4sh_h1st0ry}", points: 65 },
      { value: "SAGE{v1m_sud0_pr1v3sc}", points: 75 },
      { value: "SAGE{3num3r4t3_n3tw0rk_f0r_p1v0t}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Check the shell history file for anything that looks like a command with a password in it." },
      { stage: "task_1", level: 2, pointCost: 20, text: ".bash_history reveals a plaintext database password used in an earlier mysql command." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{pl41nt3xt_cr3d_1n_b4sh_h1st0ry}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "vim can execute shell commands — think about what that means when run as root via sudo." },
      { stage: "task_2", level: 2, pointCost: 20, text: "vim's :!sh command spawns a shell, and NOPASSWD sudo on it means instant root." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{v1m_sud0_pr1v3sc}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "With root, what should you look at before trying to move further into the network?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "Check network config and ARP tables to find other reachable hosts to plan lateral movement." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{3num3r4t3_n3tw0rk_f0r_p1v0t}" },
    ],
  },
  {
    slug: "burp-suite-workflow",
    title: "Burp Suite Workflow",
    description: "Use Burp Suite's core workflow — Proxy, Repeater, and Intruder — to tamper with a role parameter and brute-force a PIN field.",
    type: "RED_TEAM" as const, difficulty: "EASY" as const, category: "Web Security", points: 160, published: true,
    flags: [
      { value: "SAGE{r3p34t3r_f0r_m4nu4l_t4mp3r1ng}", points: 50 },
      { value: "SAGE{r0l3_p4r4m_pr1v_3sc4l4t10n}", points: 55 },
      { value: "SAGE{1ntrud3r_f0r_p1n_bruteforce}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "You want to manually resend one intercepted request with a changed parameter and see the response." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Repeater is Burp's tool for exactly that: manual, one-off request tampering." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{r3p34t3r_f0r_m4nu4l_t4mp3r1ng}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Check what the response looks like after changing role=user to role=admin." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Admin dashboard content in the response confirms vertical privilege escalation via the role parameter." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{r0l3_p4r4m_pr1v_3sc4l4t10n}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "You need to automatically try thousands of PIN combinations — that's not a manual-repeat job." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Intruder automates payload brute-forcing across a defined position, like a 4-digit PIN." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{1ntrud3r_f0r_p1n_bruteforce}" },
    ],
  },
  {
    slug: "advanced-sql-injection",
    title: "Advanced SQL Injection: Blind & Time-Based",
    description: "Extract data from a login form with no visible error messages, using boolean-blind and time-based blind SQL injection.",
    type: "RED_TEAM" as const, difficulty: "HARD" as const, category: "Web Security", points: 280, published: true,
    flags: [
      { value: "SAGE{b00l3an_bl1nd_sql1_c0nf1rm3d}", points: 85 },
      { value: "SAGE{t1m3_b4s3d_bl1nd_3xtr4ct10n}", points: 95 },
      { value: "SAGE{d3l4y_1nd3p3nd3nt_0f_c0nt3nt}", points: 100 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Compare the page returned by ' AND 1=1-- against ' AND 1=2--, even with no SQL error text visible." },
      { stage: "task_1", level: 2, pointCost: 25, text: "A different response between a true and false condition confirms boolean-blind injection is possible." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{b00l3an_bl1nd_sql1_c0nf1rm3d}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "The payload uses SLEEP() tied to a condition about the database name's first character." },
      { stage: "task_2", level: 2, pointCost: 25, text: "This is time-based blind extraction — the response delay itself carries the leaked bit of information." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{t1m3_b4s3d_bl1nd_3xtr4ct10n}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Think about what the technique actually measures versus what the page displays." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Response delay is measurable regardless of whether the page content differs at all." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{d3l4y_1nd3p3nd3nt_0f_c0nt3nt}" },
    ],
  },
  {
    slug: "advanced-xss",
    title: "Advanced XSS: Stored & DOM-Based",
    description: "Find a stored XSS that survives a naive script-tag filter, and understand why a DOM-based sink bypasses server-side sanitization entirely.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Web Security", points: 220, published: true,
    flags: [
      { value: "SAGE{1mg_0n3rr0r_byp4ss3s_f1lt3r}", points: 65 },
      { value: "SAGE{3v3nt_h4ndl3rs_n0_scr1pt_n33d3d}", points: 75 },
      { value: "SAGE{cl13nt_s1d3_0nly_n3v3r_s3rv3r}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The filter only blocks the literal string <script>. What other tags can execute JavaScript?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "<img src=x onerror=alert(1)> never contains the word 'script' but still runs JS." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{1mg_0n3rr0r_byp4ss3s_f1lt3r}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what actually triggers JavaScript execution in a browser." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Any element with an inline event-handler attribute can run script — the <script> tag isn't required at all." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{3v3nt_h4ndl3rs_n0_scr1pt_n33d3d}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Look at where location.hash's value actually travels." },
      { stage: "task_3", level: 2, pointCost: 20, text: "The URL fragment is never sent to the server at all, so server-side filtering can't see it." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{cl13nt_s1d3_0nly_n3v3r_s3rv3r}" },
    ],
  },
  {
    slug: "kerberoasting",
    title: "Kerberoasting",
    description: "Request service tickets for SPN accounts, identify the one crackable offline due to weak encryption, and understand why service accounts are prime targets.",
    type: "RED_TEAM" as const, difficulty: "HARD" as const, category: "Active Directory", points: 260, published: true,
    flags: [
      { value: "SAGE{svc_sql_rc4_crack4bl3}", points: 80 },
      { value: "SAGE{st4l3_s3rv1c3_4cc0unt_pw}", points: 85 },
      { value: "SAGE{4es_0nly_l0ng_r4nd0m_pw}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Check the encryption type listed against each SPN account's ticket." },
      { stage: "task_1", level: 2, pointCost: 25, text: "svc_sql's ticket uses RC4, which is crackable offline; the others use AES." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{svc_sql_rc4_crack4bl3}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Think about how service account passwords are typically managed compared to user accounts." },
      { stage: "task_2", level: 2, pointCost: 25, text: "They're often set once at creation and never rotated or held to the same complexity policy." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{st4l3_s3rv1c3_4cc0unt_pw}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "The fix targets both the password itself and the ticket encryption in use." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Long random passwords (or gMSAs) plus enforcing AES-only tickets closes this off." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{4es_0nly_l0ng_r4nd0m_pw}" },
    ],
  },
  {
    slug: "dcsync-attack",
    title: "DCSync Attack",
    description: "Abuse Replicating Directory Changes permissions to pull password hashes straight from Active Directory without touching a domain controller's disk.",
    type: "RED_TEAM" as const, difficulty: "HARD" as const, category: "Active Directory", points: 260, published: true,
    flags: [
      { value: "SAGE{r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll}", points: 80 },
      { value: "SAGE{l00ks_l1k3_l3g1t_r3pl1c4t10n}", points: 85 },
      { value: "SAGE{r3v0k3_r3pl_perm_4ud1t_0th3rs}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Look for a permission on the domain object itself, not on any individual user." },
      { stage: "task_1", level: 2, pointCost: 25, text: "'Replicating Directory Changes All' granted to a non-DC service account enables DCSync." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Compare this to directly copying the NTDS.dit file off a domain controller." },
      { stage: "task_2", level: 2, pointCost: 25, text: "DCSync rides the legitimate replication protocol, so it blends in as normal DC traffic." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{l00ks_l1k3_l3g1t_r3pl1c4t10n}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "The fix is about the permission grant itself, and making sure it's not elsewhere too." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Revoke the replication permission from the non-DC account and audit for any other unnecessary grants of it." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{r3v0k3_r3pl_perm_4ud1t_0th3rs}" },
    ],
  },
  {
    slug: "golden-ticket-attack",
    title: "Golden Ticket Attack",
    description: "Understand how a stolen KRBTGT hash lets an attacker forge unlimited, unexpirable domain admin tickets — and why only resetting it twice fixes it.",
    type: "RED_TEAM" as const, difficulty: "INSANE" as const, category: "Active Directory", points: 340, published: true,
    flags: [
      { value: "SAGE{krbtgt_4cc0unt_h4sh_st0l3n}", points: 100 },
      { value: "SAGE{s1gn3d_by_krbtgt_n0t_us3r_pw}", points: 115 },
      { value: "SAGE{r3s3t_krbtgt_tw1c3}", points: 125 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 20, text: "One account's hash, once stolen, can sign a ticket for literally anyone in the domain." },
      { stage: "task_1", level: 2, pointCost: 30, text: "The KRBTGT account's hash is what signs every Kerberos ticket-granting ticket in the domain." },
      { stage: "task_1", level: 3, pointCost: 40, text: "Flag: SAGE{krbtgt_4cc0unt_h4sh_st0l3n}" },
      { stage: "task_2", level: 1, pointCost: 20, text: "Think about what a Golden Ticket is cryptographically tied to." },
      { stage: "task_2", level: 2, pointCost: 30, text: "It's signed by KRBTGT's hash, not the impersonated user's own password — so resetting the user's password does nothing." },
      { stage: "task_2", level: 3, pointCost: 40, text: "Flag: SAGE{s1gn3d_by_krbtgt_n0t_us3r_pw}" },
      { stage: "task_3", level: 1, pointCost: 20, text: "AD keeps both a current and previous password hash for KRBTGT." },
      { stage: "task_3", level: 2, pointCost: 30, text: "Resetting KRBTGT's password twice flushes both hash versions, invalidating every forged ticket." },
      { stage: "task_3", level: 3, pointCost: 40, text: "Flag: SAGE{r3s3t_krbtgt_tw1c3}" },
    ],
  },
  {
    slug: "lateral-movement-techniques",
    title: "Lateral Movement Techniques",
    description: "Compare PsExec, WMI, and Pass-the-Hash lateral movement by their forensic footprint, and pick the right detection strategy for each.",
    type: "RED_TEAM" as const, difficulty: "HARD" as const, category: "Active Directory", points: 260, published: true,
    flags: [
      { value: "SAGE{wm1_st34lth13st_l3g1t_pr0t0c0l}", points: 80 },
      { value: "SAGE{s3rv1c3_cr34t10n_7045_psex3c}", points: 85 },
      { value: "SAGE{ntlm_w1th0ut_k3rb3r0s_4l3rt}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Compare the three techniques' artifacts — one uses a completely ordinary management protocol." },
      { stage: "task_1", level: 2, pointCost: 25, text: "WMI rides a legitimate management channel, leaving the least obviously-malicious footprint." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{wm1_st34lth13st_l3g1t_pr0t0c0l}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "PsExec has to install something on the target to run commands remotely." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Event ID 7045 (service creation), often named PSEXESVC, is the giveaway." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{s3rv1c3_cr34t10n_7045_psex3c}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Pass-the-Hash always uses one specific authentication protocol, regardless of which tool delivers it." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Alert on NTLM logons (type 3) for privileged accounts with no matching Kerberos ticket request." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{ntlm_w1th0ut_k3rb3r0s_4l3rt}" },
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
  console.log(`Batch 6 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
