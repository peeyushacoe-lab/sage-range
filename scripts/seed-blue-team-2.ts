// Seeds the second Blue Team batch (labs 15-20): Linux Auth Investigation,
// Web Server Log Analysis, DNS Exfiltration Detection, PowerShell Attack
// Detection, RDP Attack Investigation, MITRE ATT&CK Mapping.
// Idempotent — safe to run multiple times. Run: npx tsx scripts/seed-blue-team-2.ts

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const LABS = [
  {
    slug: "linux-auth-investigation",
    title: "Linux Authentication Investigation",
    description: "Analyze /var/log/auth.log to trace an SSH brute force through a sudo privilege escalation and into planted persistence.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Log Analysis",
    points: 200,
    published: true,
    flags: [
      { value: "SAGE{ssh_brut3_f0rc3_succ3ss}", points: 60 },
      { value: "SAGE{gtf0b1ns_sud0_3scap3}", points: 70 },
      { value: "SAGE{cr0n_4nd_ssh_k3y_p3rsist3nce}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "How many accounts were targeted from the same source IP, and how did the sequence end?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "Hundreds of failures against multiple usernames from one IP is a volumetric attack pattern." },
      { stage: "task_1", level: 3, pointCost: 30, text: "It's SSH Brute Force — the attacker eventually guessed svc_backup's password." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Check what command the sudoers entry allowed svc_backup to run as root." },
      { stage: "task_2", level: 2, pointCost: 20, text: "`find` has an -exec flag that can run arbitrary commands, including spawning a shell." },
      { stage: "task_2", level: 3, pointCost: 30, text: "This is a documented GTFOBins technique for escaping restricted sudo permissions." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Two separate files were modified after root access was gained — check crontab and the SSH directory." },
      { stage: "task_3", level: 2, pointCost: 20, text: "One entry beacons out periodically; the other grants direct SSH login without a password." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag format: SAGE{cr0n_4nd_ssh_k3y_p3rsist3nce}" },
    ],
  },
  {
    slug: "web-server-log-analysis",
    title: "Web Server Log Analysis",
    description: "Detect a SQL injection scan, a path traversal bypass, and a web shell upload from raw Nginx access logs.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Log Analysis",
    points: 200,
    published: true,
    flags: [
      { value: "SAGE{sqlm4p_sc4n_d3t3ct3d}", points: 60 },
      { value: "SAGE{p4th_tr4v3rsal_c0nfig_php}", points: 70 },
      { value: "SAGE{w3bsh3ll_upl04d3d}", points: 70 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Check the query-string payloads — do they look like anything a real user would type?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "Look at the User-Agent header for this source IP." },
      { stage: "task_1", level: 3, pointCost: 30, text: "It's an automated scan by the sqlmap tool, confirmed by the User-Agent string." },
      { stage: "task_2", level: 1, pointCost: 10, text: "The first traversal attempt was blocked (403). What's different about the second one?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "URL-encoding slashes (%2f) can bypass a naive string filter looking for '../'." },
      { stage: "task_2", level: 3, pointCost: 30, text: "Flag format: SAGE{p4th_tr4v3rsal_c0nfig_php} — name the technique and the file read." },
      { stage: "task_3", level: 1, pointCost: 10, text: "What filename was uploaded, and what does its extension suggest about a weak filter?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "The server executed the uploaded file as PHP despite the .jpg-looking name." },
      { stage: "task_3", level: 3, pointCost: 30, text: "This is an unrestricted file upload leading to a web shell." },
    ],
  },
  {
    slug: "dns-exfiltration-detection",
    title: "DNS Exfiltration Detection",
    description: "Spot an abnormal DNS query pattern, decode a hex-encoded payload smuggled in TXT record subdomains, and confirm the exfiltration technique.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Log Analysis",
    points: 220,
    published: true,
    flags: [
      { value: "SAGE{dns_tunn3l_sp0tt3d}", points: 70 },
      { value: "SAGE{dns_3xfil_txt_tunn3l}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "Compare the query length and record type of the suspicious entries to the normal ones." },
      { stage: "task_1", level: 2, pointCost: 20, text: "The subdomain labels are unusually long strings of hex characters, not real hostnames." },
      { stage: "task_1", level: 3, pointCost: 30, text: "This is DNS tunneling — data hidden inside TXT query subdomains." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Each pair of hex characters is one ASCII byte, e.g. 4a = 'J', 6f = 'o'." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Decode the string two characters at a time from left to right." },
      { stage: "task_2", level: 3, pointCost: 30, text: "It decodes to 'Join this secure SQL data' — a fragment of a larger stolen dataset." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Why would an attacker pick DNS specifically for exfiltration, over say HTTP?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "DNS is almost always allowed outbound through firewalls, making it a reliable covert channel." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag format: SAGE{dns_3xfil_txt_tunn3l}" },
    ],
  },
  {
    slug: "powershell-attack-detection",
    title: "PowerShell Attack Detection",
    description: "Decode a Base64-encoded PowerShell command, recover the download URL AMSI blocked, and locate the persistence that survives reboots.",
    type: "BLUE_TEAM" as const,
    difficulty: "MEDIUM" as const,
    category: "Log Analysis",
    points: 220,
    published: true,
    flags: [
      { value: "SAGE{3nc0d3d_p0w3rsh3ll_fl4g}", points: 60 },
      { value: "SAGE{d0wnl04d_cr4dl3_f0und}", points: 80 },
      { value: "SAGE{pr0fil3_p3rsist3nc3}", points: 80 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "One flag in the command line hides the actual instructions from plain-text log review." },
      { stage: "task_1", level: 2, pointCost: 20, text: "It takes a long string of letters and numbers as its argument." },
      { stage: "task_1", level: 3, pointCost: 30, text: "-Enc accepts a Base64-encoded UTF-16LE command string." },
      { stage: "task_2", level: 1, pointCost: 10, text: "PowerShell -Enc payloads are Base64 of UTF-16LE (2 bytes per character), not plain UTF-8." },
      { stage: "task_2", level: 2, pointCost: 20, text: "Decoding reveals a WebClient download cradle — look for the IP and script name in the result." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The URL is http://198.51.100.42/p.ps1" },
      { stage: "task_3", level: 1, pointCost: 10, text: "Which file runs automatically every single time a new PowerShell session opens?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "profile.ps1 under WindowsPowerShell in the user's Documents folder." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag format: SAGE{pr0fil3_p3rsist3nc3}" },
    ],
  },
  {
    slug: "rdp-attack-investigation",
    title: "RDP Attack Investigation",
    description: "Trace an RDP brute force to a successful logon, then follow the attacker's account creation and privilege escalation on the box.",
    type: "BLUE_TEAM" as const,
    difficulty: "EASY" as const,
    category: "Log Analysis",
    points: 150,
    published: true,
    flags: [
      { value: "SAGE{rdp_brut3_f0rc3}", points: 40 },
      { value: "SAGE{n3w_acc0unt_cr3at3d}", points: 50 },
      { value: "SAGE{b4ckup_svc_4dmin_p3rsist3nce}", points: 60 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "How many different accounts were targeted from the same source IP?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "Over a thousand failures against 6 different accounts, all from one IP, ending in success." },
      { stage: "task_1", level: 3, pointCost: 30, text: "It's an RDP brute force attack." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Look at the command run from net.exe inside the RDP session." },
      { stage: "task_2", level: 2, pointCost: 20, text: "`net user ... /add` creates a new local Windows account." },
      { stage: "task_2", level: 3, pointCost: 30, text: "The attacker created a new local account named backup_svc." },
      { stage: "task_3", level: 1, pointCost: 10, text: "Check which security group the new account was added to right after creation." },
      { stage: "task_3", level: 2, pointCost: 20, text: "Event ID 4732 shows a member being added to a local group." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag format: SAGE{b4ckup_svc_4dmin_p3rsist3nce} — the account was added to Administrators." },
    ],
  },
  {
    slug: "mitre-attack-mapping",
    title: "MITRE ATT&CK Mapping",
    description: "Map each stage of a multi-step incident narrative to its correct MITRE ATT&CK tactic and technique ID.",
    type: "BLUE_TEAM" as const,
    difficulty: "EASY" as const,
    category: "SOC",
    points: 150,
    published: true,
    flags: [
      { value: "SAGE{initial_acc3ss_ta0001}", points: 40 },
      { value: "SAGE{lsass_dump_t1003}", points: 50 },
      { value: "SAGE{scheduled_task_persistence_t1053}", points: 60 },
    ],
    hints: [
      { stage: "task_1", level: 1, pointCost: 10, text: "This is the very first action in the whole incident — how did the attacker get in at all?" },
      { stage: "task_1", level: 2, pointCost: 20, text: "A malicious email attachment is a classic delivery vector for gaining a foothold." },
      { stage: "task_1", level: 3, pointCost: 30, text: "This maps to the Initial Access tactic (TA0001)." },
      { stage: "task_2", level: 1, pointCost: 10, text: "Which Windows process stores credentials in memory that attackers commonly target?" },
      { stage: "task_2", level: 2, pointCost: 20, text: "LSASS (Local Security Authority Subsystem Service) holds credential material in memory." },
      { stage: "task_2", level: 3, pointCost: 30, text: "This is T1003.001 — OS Credential Dumping: LSASS Memory." },
      { stage: "task_3", level: 1, pointCost: 10, text: "What did the malware create that would automatically run again after a reboot?" },
      { stage: "task_3", level: 2, pointCost: 20, text: "A scheduled task set to run at every logon is a common persistence mechanism." },
      { stage: "task_3", level: 3, pointCost: 30, text: "Flag format: SAGE{scheduled_task_persistence_t1053} — MITRE technique T1053." },
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

    // Idempotent flags/hints: wipe and recreate so re-running the seed doesn't duplicate.
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
  console.log("Blue Team batch 2 seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
