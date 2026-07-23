// Seeds batch 9: Cloud Security (5 labs) + the final 2 Blue Team labs that
// closed out that category's roadmap gap (lateral movement hunting and
// malware timeline reconstruction).
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-batch-9.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "azure-logs-analysis",
    title: "Azure Logs Analysis",
    description: "Use Azure Activity Log and Sign-in logs to reconstruct an account compromise and identify the risky operation that followed.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Cloud Security", points: 220, published: true,
    flags: [
      { value: "SAGE{1mp0ss1bl3_tr4v3l_d3t3ct3d}", points: 65 },
      { value: "SAGE{r3v0k3_4dm1n_r0l3_4nd_t0k3ns}", points: 75 },
      { value: "SAGE{c0mb1n3_s1gn1n_4nd_4ct1v1ty_l0gs}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Two logins 15 minutes apart from countries that can't physically be reached in that time." },
      { stage: "task_1", level: 2, pointCost: 20, text: "This is a classic impossible travel signal — the account is likely compromised." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{1mp0ss1bl3_tr4v3l_d3t3ct3d}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "The compromised account just granted itself Global Admin — that's the most urgent thing on the board." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Revoke the newly created admin role assignment and force token/session revocation for the account." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{r3v0k3_4dm1n_r0l3_4nd_t0k3ns}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Sign-in logs and activity logs each show a different half of the story." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Together they reconstruct who authenticated when and what they did — the full attack chain." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{c0mb1n3_s1gn1n_4nd_4ct1v1ty_l0gs}" },
    ],
  },
  {
    slug: "cloud-incident-response",
    title: "Cloud Incident Response",
    description: "Respond to a live cloud compromise where the attacker has valid credentials, balancing containment speed against evidence preservation.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Cloud Security", points: 260, published: true,
    flags: [
      { value: "SAGE{r3v0k3_cr3d3nt14ls_1mm3d14t3ly}", points: 80 },
      { value: "SAGE{pr3s3rv3_3v1d3nc3_b3f0r3_t34rd0wn}", points: 85 },
      { value: "SAGE{4ud1t_4ll_4ct10ns_n0t_just_0n3_s3rv1c3}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "The exfiltration is happening right now using stolen IAM credentials — what stops it fastest?" },
      { stage: "task_1", level: 2, pointCost: 25, text: "Revoke/rotate the compromised credentials immediately to cut off further access." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{r3v0k3_cr3d3nt14ls_1mm3d14t3ly}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Think about what you'd lose by immediately deleting or terminating the affected resources." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Tearing things down right away destroys the volatile evidence and logs you need for scoping." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{pr3s3rv3_3v1d3nc3_b3f0r3_t34rd0wn}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "The attacker had valid credentials — they could have touched more than just the one S3 bucket." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Review the audit trail for every action those credentials took across all services, not just where you first noticed." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{4ud1t_4ll_4ct10ns_n0t_just_0n3_s3rv1c3}" },
    ],
  },
  {
    slug: "kubernetes-basics",
    title: "Kubernetes Security Basics",
    description: "Spot a dangerously misconfigured Kubernetes pod spec before it ships to production.",
    type: "BLUE_TEAM" as const, difficulty: "EASY" as const, category: "Cloud Security", points: 160, published: true,
    flags: [
      { value: "SAGE{pr1v1l3g3d_tru3_h0st_4cc3ss}", points: 50 },
      { value: "SAGE{h0stp4th_bre4ks_1s0l4t10n}", points: 55 },
      { value: "SAGE{l34st_pr1v_p0d_sp3c}", points: 55 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "One boolean field in the pod's securityContext removes most container isolation entirely." },
      { stage: "task_1", level: 2, pointCost: 20, text: "privileged: true gives the pod essentially root access to the underlying host node." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{pr1v1l3g3d_tru3_h0st_4cc3ss}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what a container inside this pod could reach on the physical/virtual host itself." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Mounting host / lets a compromised container read/write anything on the host, breaking isolation." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{h0stp4th_bre4ks_1s0l4t10n}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "The fix is about removing what isn't needed, not adding more controls on top." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Remove privileged mode and the hostPath mount; grant only the minimal permissions actually required." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{l34st_pr1v_p0d_sp3c}" },
    ],
  },
  {
    slug: "docker-security",
    title: "Docker Security",
    description: "Harden a Dockerfile and running container configuration against common container escape and supply-chain risks.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Cloud Security", points: 220, published: true,
    flags: [
      { value: "SAGE{r00t_us3r_4nd_unp1nn3d_t4g}", points: 65 },
      { value: "SAGE{r00t_1ns1d3_c4n_m34n_r00t_0uts1d3}", points: 75 },
      { value: "SAGE{p1n_d1g3st_f0r_supply_ch41n}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Look at both the default user the process runs as, and the base image tag used." },
      { stage: "task_1", level: 2, pointCost: 20, text: "Running as root and pulling an unpinned 'latest' tag are two separate risk categories here." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{r00t_us3r_4nd_unp1nn3d_t4g}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Container isolation isn't perfect — think about what a kernel exploit or escape would grant." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Root inside the container often becomes root on the host if isolation is ever broken." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{r00t_1ns1d3_c4n_m34n_r00t_0uts1d3}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Think about what 'latest' can silently point to between two different builds." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Pinning to a specific digest prevents the base image from silently changing to something else, possibly compromised." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{p1n_d1g3st_f0r_supply_ch41n}" },
    ],
  },
  {
    slug: "container-escape-theory",
    title: "Container Escape Theory",
    description: "Understand the kernel-sharing model that makes container escapes possible, and where the real security boundary actually lives.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Cloud Security", points: 260, published: true,
    flags: [
      { value: "SAGE{sh4r3d_h0st_k3rn3l}", points: 80 },
      { value: "SAGE{3xpl01t_k3rn3l_0r_runt1m3_bug}", points: 85 },
      { value: "SAGE{vm_b0und4ry_f0r_untrust3d_w0rkl04ds}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "Compare what a VM's hypervisor separates versus what containers actually share underneath." },
      { stage: "task_1", level: 2, pointCost: 25, text: "All containers on a host share that host's single kernel — VMs each get their own." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{sh4r3d_h0st_k3rn3l}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "Given the shared kernel, think about what a successful escape actually has to break." },
      { stage: "task_2", level: 2, pointCost: 25, text: "It exploits a vulnerability in the shared kernel or the container runtime to break namespace/cgroup isolation." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{3xpl01t_k3rn3l_0r_runt1m3_bug}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "For truly hostile, untrusted workloads, a shared kernel is a shared attack surface." },
      { stage: "task_3", level: 2, pointCost: 25, text: "A separate VM (or a sandboxed runtime like gVisor/Kata) gives a real boundary that standard containers don't." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{vm_b0und4ry_f0r_untrust3d_w0rkl04ds}" },
    ],
  },
  {
    slug: "threat-hunting-lateral-movement",
    title: "Threat Hunting: Lateral Movement",
    description: "Hunt through authentication and process logs to uncover an attacker moving laterally between hosts using stolen credentials.",
    type: "BLUE_TEAM" as const, difficulty: "HARD" as const, category: "Incident Response", points: 260, published: true,
    flags: [
      { value: "SAGE{1_4cc0unt_5_h0sts_2_m1n}", points: 80 },
      { value: "SAGE{b4s3l1n3_4nd_pr0c3ss_c0nf1rm}", points: 85 },
      { value: "SAGE{d1s4bl3_4cc0unt_1s0l4t3_h0sts}", points: 95 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 15, text: "One service account authenticating to five different hosts inside two minutes is not normal usage." },
      { stage: "task_1", level: 2, pointCost: 25, text: "One account, five hosts, two minutes — that speed and spread is the strongest hunting signal here." },
      { stage: "task_1", level: 3, pointCost: 35, text: "Flag: SAGE{1_4cc0unt_5_h0sts_2_m1n}" },
      { stage: "task_2", level: 1, pointCost: 15, text: "You need more than just the login pattern to rule out legitimate automation." },
      { stage: "task_2", level: 2, pointCost: 25, text: "Check the account's normal baseline plus look for remote-exec process activity on each host." },
      { stage: "task_2", level: 3, pointCost: 35, text: "Flag: SAGE{b4s3l1n3_4nd_pr0c3ss_c0nf1rm}" },
      { stage: "task_3", level: 1, pointCost: 15, text: "Think about stopping both the account's further use and the spread across hosts." },
      { stage: "task_3", level: 2, pointCost: 25, text: "Disable/reset the compromised account's credentials and isolate the affected hosts." },
      { stage: "task_3", level: 3, pointCost: 35, text: "Flag: SAGE{d1s4bl3_4cc0unt_1s0l4t3_h0sts}" },
    ],
  },
  {
    slug: "malware-timeline-analysis",
    title: "Malware Timeline Analysis",
    description: "Reconstruct a precise timeline of a malware infection from scattered timestamps across multiple log sources.",
    type: "BLUE_TEAM" as const, difficulty: "MEDIUM" as const, category: "Incident Response", points: 220, published: true,
    flags: [
      { value: "SAGE{5h16m_dw3ll_t1m3}", points: 65 },
      { value: "SAGE{t1m3l1n3_r3v34ls_d3t3ct10n_g4p}", points: 75 },
      { value: "SAGE{c2_b34c0n_34rl13st_r3l14bl3_s1gn4l}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Compare the process execution timestamp (09:14:03) against the encryption start time (14:30)." },
      { stage: "task_1", level: 2, pointCost: 20, text: "That gap works out to 5 hours 16 minutes of dwell time before the destructive action." },
      { stage: "task_1", level: 3, pointCost: 30, text: "Flag: SAGE{5h16m_dw3ll_t1m3}" },
      { stage: "task_2", level: 1, pointCost: 10, text: "Think about what that multi-hour gap represents in terms of missed opportunity." },
      { stage: "task_2", level: 2, pointCost: 20, text: "It shows over 5 hours of undetected access before encryption — a real detection gap to close." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag: SAGE{t1m3l1n3_r3v34ls_d3t3ct10n_g4p}" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Which timestamp gives the earliest reliable proof of actual compromise, not just a risky click?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "The C2 beacon at 09:15 is the earliest strong signal, giving hours of lead time before encryption." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag: SAGE{c2_b34c0n_34rl13st_r3l14bl3_s1gn4l}" },
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
  console.log(`Batch 9 seed complete: ${LABS.length} labs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
