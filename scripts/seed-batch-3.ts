// Seeds the big cross-category batch: 5 more Blue Team, 5 Red Team,
// 2 Detection Engineering, 2 more AI Security, 2 DFIR, 2 Cloud Security,
// 1 Threat Intelligence, 1 Real World Mini Incident capstone. 20 labs total.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-3.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  // ── Blue Team ──────────────────────────────────────────────────────────
  {
    slug: "sigma-rule-creation",
    title: "Sigma Rule Creation",
    description: "Write a Sigma detection rule for a suspicious rundll32 execution pattern, then critique it for false-positive risk.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 200, published: true,
    flags: [
      { value: "SAGE{pr0c3ss_cr34t10n_l0gs0urc3}", points: 60 },
      { value: "SAGE{payload_dll_entry}", points: 70 },
      { value: "SAGE{t00_br0ad_f4ls3_p0s1t1v3s}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "These are Windows Event ID 4688 entries — what does 4688 represent?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "4688 fires when a new process is created." },
      { stage: "task_1", level: 3, pointCost: 30, text: "The correct Sigma logsource category is process_creation." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare the two rundll32 command lines — one loads a known system DLL, one doesn't." },
      { stage: "task_2", level: 2, pointCost: 20, text: "The suspicious one loads a file from C:\\Users\\Public with a generic export name." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{payload_dll_entry}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "rundll32.exe is used constantly for completely legitimate purposes." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Matching on the binary name alone, with no command-line condition, would fire on nearly everything." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{t00_br0ad_f4ls3_p0s1t1v3s}" },
    ],
  },
  {
    slug: "yara-rule-basics",
    title: "YARA Rule Basics",
    description: "Extract IOCs from a suspicious binary with static analysis, understand a YARA rule's PE-header check, and see why hash-only detection is fragile.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Malware Analysis", points: 200, published: true,
    flags: [
      { value: "SAGE{185_220_101_9_gate_php}", points: 60 },
      { value: "SAGE{mz_h34d3r_p3_ch3ck}", points: 70 },
      { value: "SAGE{h4sh_1s_fr4g1l3}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at the strings output for anything resembling a URL." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The binary calls out to a gate.php script — a common C2 checkin pattern." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{185_220_101_9_gate_php}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "uint16(0) reads the first two bytes of the file." },
      { stage: "task_2", level: 2, pointCost: 20, text: "0x5A4D is the little-endian encoding of the ASCII characters 'MZ'." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{mz_h34d3r_p3_ch3ck}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "How many bytes need to change to produce a completely different MD5?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "Just one. Hash-blocking alone is trivially defeated by a single-byte patch." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{h4sh_1s_fr4g1l3}" },
    ],
  },
  {
    slug: "ioc-hunting",
    title: "IOC Hunting",
    description: "Sweep a fleet against a fresh threat-intel bulletin, spot the corroborated compromise, and prioritize response by strength of evidence.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Threat Intelligence", points: 220, published: true,
    flags: [
      { value: "SAGE{2_hosts_c2_infected}", points: 70 },
      { value: "SAGE{wkstn_it_14_registry_only}", points: 70 },
      { value: "SAGE{pr10r1t1z3_by_3v1d3nc3}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Count only the hosts that matched the network-based indicators (IP or domain)." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Only WKSTN-HR-07 matched both the IP and the domain." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{2_hosts_c2_infected}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "One host matched only the registry key, not the network IOCs." },
      { stage: "task_2", level: 2, pointCost: 20, text: "That's WKSTN-IT-14 — weaker evidence alone, needs corroboration." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{wkstn_it_14_registry_only}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Which host has the most independent, corroborating IOC matches?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "Strength of evidence should drive triage order, not role or alphabetical order." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{pr10r1t1z3_by_3v1d3nc3}" },
    ],
  },
  {
    slug: "insider-threat-investigation",
    title: "Insider Threat Investigation",
    description: "Investigate a resigning employee's off-hours activity, confirm data exfiltration via DLP, and choose the correct dual security/HR response.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Insider Threat", points: 220, published: true,
    flags: [
      { value: "SAGE{d3p4rt1ng_3mpl0y33_r1sk}", points: 70 },
      { value: "SAGE{sn2291x_3_1gb_usb_exfil}", points: 75 },
      { value: "SAGE{c0nt41n_4nd_3sc4l4t3}", points: 75 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Cross-reference the HR status with the timing and volume of file access." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A resigning employee, off-hours, accessing hundreds of files is a classic pre-departure risk pattern." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{d3p4rt1ng_3mpl0y33_r1sk}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Combine the USB serial number with the data volume copied." },
      { stage: "task_2", level: 2, pointCost: 20, text: "SN2291X received 3.1 GB of confidential data." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{sn2291x_3_1gb_usb_exfil}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "This needs both an immediate security action and a formal process." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Disable access now, preserve evidence, and loop in HR/Legal — don't wait or self-remediate." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{c0nt41n_4nd_3sc4l4t3}" },
    ],
  },
  {
    slug: "persistence-detection",
    title: "Persistence Detection",
    description: "Audit scheduled tasks, Run keys, and services on a workstation to find the malware masquerading as legitimate updater processes.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Log Analysis", points: 150, published: true,
    flags: [
      { value: "SAGE{m4sq3r4d1ng_sch3dul3d_t4sk}", points: 45 },
      { value: "SAGE{run_k3y_p3rsist3nc3}", points: 50 },
      { value: "SAGE{wupdmgr_svc_masquerade}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Compare each task's action path to where the real application would actually be installed." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A real OneDrive updater wouldn't run from C:\\Windows\\Temp." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{m4sq3r4d1ng_sch3dul3d_t4sk}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Two of these entries are legitimate signed Microsoft/Windows binaries." },
      { stage: "task_2", level: 2, pointCost: 20, text: "svchost32.exe in Roaming AppData with a generic name is the odd one out." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{run_k3y_p3rsist3nc3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Look at what binary the new service actually points to." },
      { stage: "task_3", level: 2, pointCost: 20, text: "wupdmgr.exe mimics a Windows Update tool name." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{wupdmgr_svc_masquerade}" },
    ],
  },

  // ── Red Team ───────────────────────────────────────────────────────────
  {
    slug: "password-spraying",
    title: "Password Spraying",
    description: "Distinguish password spraying from brute force, understand how it evades lockout policy, and design a detection that actually catches it.",
    type: "RED_TEAM" as const, difficulty: "EASY" as const, category: "Web Security", points: 150, published: true,
    flags: [
      { value: "SAGE{p4ssw0rd_spr4y_1d3nt1f13d}", points: 45 },
      { value: "SAGE{l0ck0ut_thr3sh0ld_3v4ded}", points: 50 },
      { value: "SAGE{cr0ss_4cc0unt_c0rr3l4t10n}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at what stays constant across attempts, and what varies." },
      { stage: "task_1", level: 2, pointCost: 20, text: "One password, tried against many different usernames." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{p4ssw0rd_spr4y_1d3nt1f13d}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare attempts per individual account to the lockout threshold." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Only 1 attempt per account, but the threshold is 5 — it never trips." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{l0ck0ut_thr3sh0ld_3v4ded}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Per-account thresholds are exactly what this technique is built to slip under." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Detection needs to correlate failures ACROSS accounts sharing timing/password patterns." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{cr0ss_4cc0unt_c0rr3l4t10n}" },
    ],
  },
  {
    slug: "file-upload-bypass",
    title: "File Upload Bypass",
    description: "Break a PHP extension deny-list with an alternate executable extension, then design an allow-list fix that closes the whole vulnerability class.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Web Security", points: 200, published: true,
    flags: [
      { value: "SAGE{1nc0mpl3t3_d3ny_l1st}", points: 60 },
      { value: "SAGE{pht_extension_bypass}", points: 70 },
      { value: "SAGE{4ll0w_l1st_4nd_1s0l4t3}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at exactly which extensions the $blocked array contains." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Apache/mod_php often executes other extensions beyond just .php too." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{1nc0mpl3t3_d3ny_l1st}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Which upload attempt in the log returned 200 instead of 403?" },
      { stage: "task_2", level: 2, pointCost: 20, text: ".pht isn't in the deny-list but is still executed as PHP by the server." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{pht_extension_bypass}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "A deny-list will always be one step behind new bypass extensions." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Allow-list safe extensions, validate content-type, and keep uploads outside the web root." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{4ll0w_l1st_4nd_1s0l4t3}" },
    ],
  },
  {
    slug: "idor-hunting",
    title: "IDOR Hunting",
    description: "Discover an invoice IDOR by incrementing an ID, find the missing ownership check in the code, and assess a worse self-privilege-escalation bug.",
    type: "RED_TEAM" as const, difficulty: "EASY" as const, category: "Web Security", points: 150, published: true,
    flags: [
      { value: "SAGE{pr1y4_18400_1nv0ic3_l34k}", points: 45 },
      { value: "SAGE{m1ss1ng_0wn3rsh1p_ch3ck}", points: 50 },
      { value: "SAGE{s3lf_pr0m0t3_4dm1n_r0l3}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Change the invoice ID in the URL and see what comes back." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Invoice 1002 belongs to a different user entirely." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{pr1y4_18400_1nv0ic3_l34k}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "requireLogin only checks that someone is authenticated, not what they're authorized to see." },
      { stage: "task_2", level: 2, pointCost: 20, text: "There's no check that the invoice's owner matches the session user." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{m1ss1ng_0wn3rsh1p_ch3ck}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Who is being modified, by whom, and which field changed?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "A user edited their own 'role' field with no server-side restriction on which fields are self-editable." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{s3lf_pr0m0t3_4dm1n_r0l3}" },
    ],
  },
  {
    slug: "jwt-exploitation",
    title: "JWT Exploitation",
    description: "Decode a JWT without a key, exploit an alg:none signature-verification bypass, and fix the server to allow-list accepted algorithms.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Web Security", points: 200, published: true,
    flags: [
      { value: "SAGE{sub_482_r0l3_stud3nt}", points: 60 },
      { value: "SAGE{4lg_n0n3_byp4ss}", points: 70 },
      { value: "SAGE{4ll0w_l1st_4lg0r1thm}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "JWTs are Base64URL-encoded, not encrypted — anyone can decode them." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The payload segment decodes directly to JSON." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{sub_482_r0l3_stud3nt}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Look at what the attacker changed the alg field to, and the signature." },
      { stage: "task_2", level: 2, pointCost: 20, text: "A permissive library trusted the algorithm claimed by the token itself." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{4lg_n0n3_byp4ss}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The server must decide which algorithms it accepts — not the token." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Explicitly allow-list HS256 (or whichever is used) and reject 'none' outright." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{4ll0w_l1st_4lg0r1thm}" },
    ],
  },
  {
    slug: "xxe-injection",
    title: "XXE Injection",
    description: "Spot a malicious external entity declaration in an XML upload, confirm local file disclosure, and fix the parser configuration properly.",
    type: "RED_TEAM" as const, difficulty: "MEDIUM" as const, category: "Web Security", points: 200, published: true,
    flags: [
      { value: "SAGE{3xt3rn4l_3nt1ty_d3cl4r3d}", points: 60 },
      { value: "SAGE{3tc_p4sswd_d1scl0s3d}", points: 70 },
      { value: "SAGE{d1s4bl3_3xt3rn4l_3nt1ti3s}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at what SYSTEM \"file:///etc/passwd\" tells the parser to do." },
      { stage: "task_1", level: 2, pointCost: 20, text: "&xxe; is substituted with the contents of that local file wherever it's referenced." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{3xt3rn4l_3nt1ty_d3cl4r3d}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare the 'item' field in the response to the normal request." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It now contains /etc/passwd contents instead of a product name." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{3tc_p4sswd_d1scl0s3d}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Keyword blacklisting for 'ENTITY' is easily bypassed." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Disable external entity/DTD resolution in the XML parser's own configuration." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{d1s4bl3_3xt3rn4l_3nt1ti3s}" },
    ],
  },

  // ── Detection Engineering ──────────────────────────────────────────────
  {
    slug: "detection-tuning",
    title: "Detection Tuning",
    description: "Measure a noisy brute-force rule's true-positive rate, find the benign root cause, and tune it without losing real detections.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 210, published: true,
    flags: [
      { value: "SAGE{8_p3rc3nt_tru3_p0s1t1v3}", points: 65 },
      { value: "SAGE{p4ssw0rd_r3s3t_n0is3}", points: 70 },
      { value: "SAGE{c0nt3xt_4w4r3_suppr3ss10n}", points: 75 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Calculate confirmed real attacks divided by the total sample size." },
      { stage: "task_1", level: 2, pointCost: 20, text: "4 of 50 were confirmed real." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{8_p3rc3nt_tru3_p0s1t1v3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "What routine IT process produces the exact same failed-then-success pattern?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "Password resets cause cached old credentials to auto-retry before the new one takes over." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{p4ssw0rd_r3s3t_n0is3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The rule's core logic is fine — it's missing one piece of context." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Suppress alerts that occur within N minutes of a known password-reset event for that account." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{c0nt3xt_4w4r3_suppr3ss10n}" },
    ],
  },
  {
    slug: "sigma-to-splunk",
    title: "Sigma to Splunk Conversion",
    description: "Translate a Sigma rule into a working SPL search, understand the underlying Sysmon event it depends on, and see why cross-SIEM conversion isn't trivial.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Detection Engineering", points: 210, published: true,
    flags: [
      { value: "SAGE{spl_qu3ry_m4pp3d}", points: 65 },
      { value: "SAGE{sysm0n_3v3nt_10_pr0c3ss_4cc3ss}", points: 70 },
      { value: "SAGE{s13m_f13ld_m4pp1ng_v4r13s}", points: 75 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Match every field named in the Sigma detection block to the SPL search." },
      { stage: "task_1", level: 2, pointCost: 20, text: "TargetImage and GrantedAccess both need to appear in the correct SPL query." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{spl_qu3ry_m4pp3d}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "process_access in Sigma maps to a specific numbered Sysmon event." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Event ID 10 (ProcessAccess) logs one process opening a handle to another." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{sysm0n_3v3nt_10_pr0c3ss_4cc3ss}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about why the same rule needs different field names in different SIEMs." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Sigma is vendor-neutral logic; the actual field/schema mapping is what varies per backend." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{s13m_f13ld_m4pp1ng_v4r13s}" },
    ],
  },

  // ── AI Security ────────────────────────────────────────────────────────
  {
    slug: "llm-jailbreaking",
    title: "LLM Jailbreaking",
    description: "Identify a roleplay/persona jailbreak that talks a content-moderation AI out of its refusal, and pick the defense that actually holds up.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "AI Security", points: 200, published: true,
    flags: [
      { value: "SAGE{r0l3pl4y_j41lbr34k}", points: 60 },
      { value: "SAGE{f1ct10n_1s_p4ck4g1ng_0nly}", points: 70 },
      { value: "SAGE{0utput_f1lt3r1ng_n0t_p3rs0n4_trust}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The attacker didn't use a technical exploit — they asked the model to pretend to be someone else." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Wrapping the request in a fictional 'character' is a classic roleplay jailbreak." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{r0l3pl4y_j41lbr34k}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what actually leaves the system, regardless of the fictional wrapper." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Real, usable instructions still get delivered no matter what story surrounds them." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{f1ct10n_1s_p4ck4g1ng_0nly}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The fix needs to inspect what's actually output, not trust how the request was framed." },
      { stage: "task_3", level: 2, pointCost: 20, text: "An output-side content filter catches this regardless of persona framing on the way in." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{0utput_f1lt3r1ng_n0t_p3rs0n4_trust}" },
    ],
  },
  {
    slug: "ai-data-leakage",
    title: "AI Data Leakage",
    description: "Trace confidential contract details leaking out of an internal AI assistant into unrelated requests, and fix the underlying access-control gap.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "AI Security", points: 200, published: true,
    flags: [
      { value: "SAGE{d14n3_wh1tf13ld_4cm3mfg_l34k}", points: 60 },
      { value: "SAGE{tr41n1ng_d4t4_m3m0r1z4t10n}", points: 70 },
      { value: "SAGE{pr3s3rv3_4cc3ss_c0ntr0ls}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The marketing draft mentions a specific client, discount, and named contact." },
      { stage: "task_1", level: 2, pointCost: 20, text: "None of that belongs in a generic public-facing customer story." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{d14n3_wh1tf13ld_4cm3mfg_l34k}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The exact same specific details recur across a completely different, unrelated session." },
      { stage: "task_2", level: 2, pointCost: 20, text: "That rules out coincidence or hallucination — it's memorized training data leaking out." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{tr41n1ng_d4t4_m3m0r1z4t10n}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Neither employee had legitimate access to that specific deal in the source systems." },
      { stage: "task_3", level: 2, pointCost: 20, text: "The AI's retrieval layer needs to preserve the same per-user access permissions as the original systems." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{pr3s3rv3_4cc3ss_c0ntr0ls}" },
    ],
  },

  // ── DFIR ───────────────────────────────────────────────────────────────
  {
    slug: "windows-registry-analysis",
    title: "Windows Registry Analysis",
    description: "Decode ROT13-obfuscated UserAssist entries, corroborate execution with ShimCache timestamps, and confirm a RunMRU persistence trigger.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{3v1l_t00lk1t_ex3}", points: 65 },
      { value: "SAGE{sh1mc4ch3_c0rr0b0r4t3s_t1m3l1n3}", points: 75 },
      { value: "SAGE{cmtm0n_s1l3nt_runmru_p3rs1st3nc3}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Windows ROT13-encodes UserAssist values by default — apply the same shift to decode." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Each letter shifts 13 places; non-letters (like _ and .) stay unchanged." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{3v1l_t00lk1t_ex3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "ShimCache alone doesn't prove execution — but its timestamp still means something." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It reflects the file's modification time, corroborating when the binary first appeared on disk." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{sh1mc4ch3_c0rr0b0r4t3s_t1m3l1n3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Decode the third UserAssist entry, then check the RunMRU key for the same binary." },
      { stage: "task_3", level: 2, pointCost: 20, text: "cmtmon.exe was launched manually via the Run dialog with a /silent flag." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{cmtm0n_s1l3nt_runmru_p3rs1st3nc3}" },
    ],
  },
  {
    slug: "browser-forensics",
    title: "Browser Forensics",
    description: "Reconstruct a phishing click from Chrome history, spot a double-extension malware download, and confirm corporate credentials were compromised.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "DFIR", points: 220, published: true,
    flags: [
      { value: "SAGE{d0cs_sh4r3_c0rp_1nf0_typ0squ4t}", points: 65 },
      { value: "SAGE{d0ubl3_3xt3ns10n_3x3c}", points: 75 },
      { value: "SAGE{cr3d3nt14ls_c0mpr0m1s3d_r3s3t}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "One domain visited between two legitimate email checks doesn't belong." },
      { stage: "task_1", level: 2, pointCost: 20, text: "docs-share-corp.info imitates a document-sharing brand but is unrelated to the real company." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{d0cs_sh4r3_c0rp_1nf0_typ0squ4t}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Look closely at the full downloaded filename, not just the visible part." },
      { stage: "task_2", level: 2, pointCost: 20, text: "invoice_Q1.html.exe uses a double extension to look harmless." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{d0ubl3_3xt3ns10n_3x3c}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Check the saved-password store for what was typed into the fake login page." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Real corporate SSO credentials were entered — they must be treated as compromised now." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{cr3d3nt14ls_c0mpr0m1s3d_r3s3t}" },
    ],
  },

  // ── Cloud Security ─────────────────────────────────────────────────────
  {
    slug: "cloud-iam-misconfiguration",
    title: "Cloud IAM & S3 Misconfiguration",
    description: "Find a public S3 bucket policy exposing customer PII, confirm the exposure, and assess an overly permissive IAM policy on a CI/CD account.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Cloud Security", points: 220, published: true,
    flags: [
      { value: "SAGE{publ1c_pr1nc1p4l_w1ldc4rd}", points: 65 },
      { value: "SAGE{48000_r3c0rds_p11_3xp0s3d}", points: 75 },
      { value: "SAGE{4dm1n_st4r_st4r_1am_p0l1cy}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "What does the wildcard in the Principal field actually mean?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "\"Principal\": \"*\" means literally anyone on the internet, no AWS account required." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{publ1c_pr1nc1p4l_w1ldc4rd}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Count the rows in the leaked CSV sample plus the noted remainder." },
      { stage: "task_2", level: 2, pointCost: 20, text: "48,000+ customer records including PII, fully public." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{48000_r3c0rds_p11_3xp0s3d}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Read the Action and Resource fields literally, together." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Action:* and Resource:* together mean unrestricted access to everything in the account." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{4dm1n_st4r_st4r_1am_p0l1cy}" },
    ],
  },
  {
    slug: "cloudtrail-analysis",
    title: "CloudTrail Analysis",
    description: "Spot a privilege-escalation backdoor created via CloudTrail events, confirm compromise through source-IP anomaly, and remediate both the key and the backdoor.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Cloud Security", points: 220, published: true,
    flags: [
      { value: "SAGE{b4ckup_svc2_4dm1n_b4ckd00r}", points: 65 },
      { value: "SAGE{s0urc3_1p_4n0m4ly}", points: 75 },
      { value: "SAGE{r3v0k3_4nd_d3l3t3_b4ckd00r}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Follow the sequence: CreateUser, then AttachUserPolicy, then CreateAccessKey." },
      { stage: "task_1", level: 2, pointCost: 20, text: "A new user was created and immediately given AdministratorAccess." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{b4ckup_svc2_4dm1n_b4ckd00r}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Compare the sourceIPAddress against the known-good access pattern." },
      { stage: "task_2", level: 2, pointCost: 20, text: "103.22.14.9 is nowhere near the office VPN range this key normally uses." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{s0urc3_1p_4n0m4ly}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "There are two things to fix here: the leaked credential and the account it created." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Revoke/rotate the key AND delete the backdoor user — one alone leaves a door open." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{r3v0k3_4nd_d3l3t3_b4ckd00r}" },
    ],
  },

  // ── Threat Intelligence ────────────────────────────────────────────────
  {
    slug: "virustotal-investigation",
    title: "VirusTotal Investigation",
    description: "Read a malware detection report, pivot on C2 infrastructure to spot freshly-registered domains, and turn the findings into blocklist + retro-hunt action.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Threat Intelligence", points: 160, published: true,
    flags: [
      { value: "SAGE{3m0t3t_52_0f_71_v3nd0rs}", points: 50 },
      { value: "SAGE{fr3shly_r3g1st3r3d_c2}", points: 55 },
      { value: "SAGE{bl0ck_4nd_r3tr0_hunt}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The 'Popular names' field usually names the malware family directly." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Combine the family name with the vendor detection ratio." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{3m0t3t_52_0f_71_v3nd0rs}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Look at the domain's registration date relative to the sample's first submission." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Legitimate infrastructure is rarely registered mere days before malware starts using it." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{fr3shly_r3g1st3r3d_c2}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Threat intel is only useful if you act on it in two directions." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Block the indicators going forward, and retro-hunt your own logs for prior contact." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{bl0ck_4nd_r3tr0_hunt}" },
    ],
  },

  // ── Real World Mini Incident (capstone) ────────────────────────────────
  {
    slug: "phishing-click-incident",
    title: "Real Incident: User Clicked Phishing Email",
    description: "A full end-to-end investigation: analyze the phishing email, trace the execution chain from click to C2, and file the IOC report to close the incident.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 300, published: true,
    flags: [
      { value: "SAGE{c0rp_1t_supp0rt_1nf0_l00k4l1k3}", points: 90 },
      { value: "SAGE{3x3c_ch41n_t0_c2}", points: 100 },
      { value: "SAGE{198_51_100_77_c2_b34c0n}", points: 110 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Compare the From, Reply-To, and Received domains against the real company domain." },
      { stage: "task_1", level: 2, pointCost: 25, text: "All three point to corp-it-support.info, unrelated to acmecorp.example." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{c0rp_1t_supp0rt_1nf0_l00k4l1k3}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Walk the sequence: link click, download, process execution, network connection." },
      { stage: "task_2", level: 2, pointCost: 25, text: "The download was a disguised executable that launched encoded PowerShell, which then beaconed out." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{3x3c_ch41n_t0_c2}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "The IOC report needs the final network destination to block." },
      { stage: "task_3", level: 2, pointCost: 25, text: "The PowerShell process connected out to 198.51.100.77 on port 8080." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{198_51_100_77_c2_b34c0n}" },
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
  console.log(`Batch 3 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
