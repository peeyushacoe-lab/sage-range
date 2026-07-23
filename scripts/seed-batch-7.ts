// Seeds batch 7: AI Security category — 7 labs covering API hardening,
// threat modeling for LLM features, hallucination risk, a full security
// assessment of an internal LLM app, AI-generated phishing detection,
// AI-assisted threat hunting, and evaluating AI-based detection engines.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-7.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "secure-ai-apis",
    title: "Securing AI APIs",
    description: "Harden an LLM-backed API against key leakage, unrestricted access, and cost-based denial of service.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "AI Security", points: 220, published: true,
    flags: [
      { value: "SAGE{4p1_k3y_s3rv3r_s1d3_0nly}", points: 65 },
      { value: "SAGE{r4t3_l1m1t_pr3v3nts_c0st_d0s}", points: 75 },
      { value: "SAGE{v4l1d4t3_1nput_f1lt3r_0utput}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "A browser-shipped JS bundle is fully readable by anyone who opens dev tools." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The API key must live only on the server, never in code sent to the client." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4p1_k3y_s3rv3r_s1d3_0nly}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "A single user hammering an expensive LLM endpoint can rack up real inference costs fast." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Per-user rate limiting and quotas cap the damage any one caller can do." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{r4t3_l1m1t_pr3v3nts_c0st_d0s}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The API sits between untrusted users and a model that can be manipulated." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Validate every input and filter every output, not just rate-limit." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{v4l1d4t3_1nput_f1lt3r_0utput}" },
    ],
  },
  {
    slug: "ai-threat-modeling",
    title: "AI Threat Modeling",
    description: "Apply structured threat modeling to a new AI chatbot feature and identify the highest-priority threat before launch.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "AI Security", points: 220, published: true,
    flags: [
      { value: "SAGE{prompt_1nject10n_4bus1ng_funct10ns}", points: 65 },
      { value: "SAGE{s3rv3r_s1d3_4uth_0n_funct10n_c4ll}", points: 75 },
      { value: "SAGE{m0d3l_judgm3nt_n0t_4_s3cur1ty_b0und4ry}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The chatbot can invoke database functions on the user's behalf — think about what steers that decision." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Prompt injection could trick the model into abusing its own function-calling ability." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{prompt_1nject10n_4bus1ng_funct10ns}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The fix can't rely on the model behaving correctly — it needs an independent check." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Enforce server-side authorization on every function call, regardless of what the model decided." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{s3rv3r_s1d3_4uth_0n_funct10n_c4ll}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about how deterministic (or not) an LLM's behavior really is." },
      { stage: "task_3", level: 2, pointCost: 20, text: "LLM outputs are probabilistic and manipulable, so they can't serve as a security boundary on their own." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{m0d3l_judgm3nt_n0t_4_s3cur1ty_b0und4ry}" },
    ],
  },
  {
    slug: "ai-hallucination-risks",
    title: "AI Hallucination Risks",
    description: "Understand how confidently-wrong AI outputs create real security and business risk, and how to catch them before they cause harm.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "AI Security", points: 160, published: true,
    flags: [
      { value: "SAGE{4i_h4llucin4t10n}", points: 50 },
      { value: "SAGE{w4st3d_1r_t1m3_0n_f4k3_cv3}", points: 55 },
      { value: "SAGE{v3r1fy_4g41nst_4uth0r1t4t1v3_s0urc3}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The AI report cites a CVE with a detailed description, but the CVE ID doesn't actually exist." },
      { stage: "task_1", level: 2, pointCost: 20, text: "This is the well-known phenomenon of an AI confidently generating false information." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4i_h4llucin4t10n}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what a responder would actually do if they trusted that fake CVE." },
      { stage: "task_2", level: 2, pointCost: 20, text: "They'd burn real incident response time chasing a vulnerability that isn't real." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{w4st3d_1r_t1m3_0n_f4k3_cv3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The safeguard has to happen before anyone acts on the claim." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Require human verification of critical AI claims against an authoritative source first." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{v3r1fy_4g41nst_4uth0r1t4t1v3_s0urc3}" },
    ],
  },
  {
    slug: "ai-security-assessment",
    title: "AI Security Assessment",
    description: "Run a structured security assessment of an internal LLM application, covering the model, the training data, and mitigations.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "AI Security", points: 260, published: true,
    flags: [
      { value: "SAGE{p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l}", points: 80 },
      { value: "SAGE{m0d3l_c4n_l34k_tr41n1ng_p11}", points: 85 },
      { value: "SAGE{0utput_dlp_f1lt3r1ng}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "The model was fine-tuned on internal support tickets — think about what those tickets contain." },
      { stage: "task_1", level: 2, pointCost: 25, text: "The tickets contain customer PII, which risks being memorized into the fine-tuned model." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{p11_m3m0r1z3d_1n_f1n3tun3d_m0d3l}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Consider what happens when any user, not just the data's original owner, queries the model." },
      { stage: "task_2", level: 2, pointCost: 25, text: "The model may regurgitate memorized PII in responses to any user, not just the original ticket's customer." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{m0d3l_c4n_l34k_tr41n1ng_p11}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Retraining isn't the only lever — think about what can catch leakage after generation." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Output filtering/DLP scanning on model responses can catch and redact leaked PII before it reaches the user." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{0utput_dlp_f1lt3r1ng}" },
    ],
  },
  {
    slug: "detect-ai-generated-phishing",
    title: "Detecting AI-Generated Phishing",
    description: "Spot the tells of an LLM-crafted phishing email that no longer has the broken grammar of old-school phishing.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "AI Security", points: 220, published: true,
    flags: [
      { value: "SAGE{n0_gr4mm4r_4w4rd_ph1sh1ng}", points: 65 },
      { value: "SAGE{f0cus_0n_m3t4d4t4_n0t_wr1t1ng}", points: 75 },
      { value: "SAGE{0ut_0f_b4nd_v3r1f1c4t10n}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Compare this email's writing quality to classic broken-English phishing." },
      { stage: "task_1", level: 2, pointCost: 20, text: "There are no grammar mistakes at all — the classic phishing tell is gone." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{n0_gr4mm4r_4w4rd_ph1sh1ng}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "If writing quality is no longer a signal, what else can you inspect?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "Sender domain mismatch, urgency + payment combos, and send-time anomalies are still detectable." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{f0cus_0n_m3t4d4t4_n0t_wr1t1ng}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The control needs to work regardless of how convincing the email is." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Verify any payment/wire request through a separate, known-good channel before acting." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{0ut_0f_b4nd_v3r1f1c4t10n}" },
    ],
  },
  {
    slug: "ai-assisted-threat-hunting",
    title: "AI-Assisted Threat Hunting",
    description: "Use an LLM to accelerate log triage during a hunt, while knowing exactly where to stop trusting its output blindly.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "AI Security", points: 220, published: true,
    flags: [
      { value: "SAGE{4nalyst_v3r1f13s_41_sh0rtl1st}", points: 65 },
      { value: "SAGE{4i_4ug3nts_hum4n_d0nt_r3pl4c3}", points: 75 },
      { value: "SAGE{d4t4_l34v3s_p3r1m3t3r_thr1rd_p4rty}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "The AI shortlist is a starting point, not a conclusion." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The analyst must still verify each flagged IP against the raw evidence before acting." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{4nalyst_v3r1f13s_41_sh0rtl1st}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about the right relationship between the AI tool and the human analyst." },
      { stage: "task_2", level: 2, pointCost: 20, text: "AI augments triage and pattern-spotting; the analyst still makes the final call." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{4i_4ug3nts_hum4n_d0nt_r3pl4c3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Consider where a third-party AI tool actually processes the data you send it." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Sensitive log data can leave your security perimeter and end up with an external provider." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{d4t4_l34v3s_p3r1m3t3r_thr1rd_p4rty}" },
    ],
  },
  {
    slug: "ai-detection-evaluation",
    title: "Evaluating AI-Based Detections",
    description: "Assess a vendor's AI-powered detection engine using precision, recall, and false-positive cost rather than marketing claims.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "AI Security", points: 260, published: true,
    flags: [
      { value: "SAGE{4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4}", points: 80 },
      { value: "SAGE{prec1s10n_4nd_rec4ll_m4tt3r}", points: 85 },
      { value: "SAGE{4l3rt_f4t1gu3_fr0m_f4ls3_p0s1t1v3s}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "The dataset is 99% benign traffic — think about what a lazy 'always predict benign' model would score." },
      { stage: "task_1", level: 2, pointCost: 25, text: "On heavily imbalanced data, high accuracy is meaningless because a trivial model could achieve it too." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{4ccur4cy_m1sl34d1ng_1mb4l4nc3d_d4t4}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "You need metrics that specifically account for the rare positive class." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Precision and recall matter because they surface performance accuracy hides on imbalanced data." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{prec1s10n_4nd_rec4ll_m4tt3r}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Think about what happens to a SOC team drowning in false alarms over time." },
      { stage: "task_3", level: 2, pointCost: 25, text: "High false positives cause alert fatigue, and real alerts start getting missed or ignored." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{4l3rt_f4t1gu3_fr0m_f4ls3_p0s1t1v3s}" },
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
  console.log(`Batch 7 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
