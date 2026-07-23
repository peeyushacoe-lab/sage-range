import { db } from "@/lib/db";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";

// ── Tactic definitions ────────────────────────────────────────────────────────

export const ALL_TACTICS = [
  { id: "recon",   name: "Reconnaissance",      color: { text: "text-zinc-300",   bar: "bg-zinc-500",   border: "border-zinc-600/40",   bg: "bg-zinc-700/30"   } },
  { id: "resdev",  name: "Resource Development", color: { text: "text-zinc-300",   bar: "bg-zinc-500",   border: "border-zinc-600/40",   bg: "bg-zinc-700/30"   } },
  { id: "ia",      name: "Initial Access",       color: { text: "text-blue-300",   bar: "bg-blue-500",   border: "border-blue-500/30",   bg: "bg-blue-900/20"   } },
  { id: "exec",    name: "Execution",            color: { text: "text-orange-300", bar: "bg-orange-500", border: "border-orange-500/30", bg: "bg-orange-900/20" } },
  { id: "persist", name: "Persistence",          color: { text: "text-yellow-300", bar: "bg-yellow-500", border: "border-yellow-500/30", bg: "bg-yellow-900/20" } },
  { id: "privesc", name: "Privilege Escalation", color: { text: "text-amber-300",  bar: "bg-amber-500",  border: "border-amber-500/30",  bg: "bg-amber-900/20"  } },
  { id: "defevas", name: "Defense Evasion",      color: { text: "text-cyan-300",   bar: "bg-cyan-500",   border: "border-cyan-500/30",   bg: "bg-cyan-900/20"   } },
  { id: "credacc", name: "Credential Access",    color: { text: "text-purple-300", bar: "bg-purple-500", border: "border-purple-500/30", bg: "bg-purple-900/20" } },
  { id: "disc",    name: "Discovery",            color: { text: "text-teal-300",   bar: "bg-teal-500",   border: "border-teal-500/30",   bg: "bg-teal-900/20"   } },
  { id: "latmov",  name: "Lateral Movement",     color: { text: "text-pink-300",   bar: "bg-pink-500",   border: "border-pink-500/30",   bg: "bg-pink-900/20"   } },
  { id: "collect", name: "Collection",           color: { text: "text-indigo-300", bar: "bg-indigo-500", border: "border-indigo-500/30", bg: "bg-indigo-900/20" } },
  { id: "c2",      name: "Command and Control",  color: { text: "text-violet-300", bar: "bg-violet-500", border: "border-violet-500/30", bg: "bg-violet-900/20" } },
  { id: "exfil",   name: "Exfiltration",         color: { text: "text-red-300",    bar: "bg-red-500",    border: "border-red-500/30",    bg: "bg-red-900/20"    } },
  { id: "impact",  name: "Impact",               color: { text: "text-rose-200",   bar: "bg-rose-600",   border: "border-rose-600/40",   bg: "bg-rose-950/40"   } },
] as const;

// ── Precise lab → MITRE technique mapping ────────────────────────────────────

export const LAB_TECHNIQUES: Record<string, { tactic: string; id: string; name: string }[]> = {
  "welcome-ctf": [
    { tactic: "Initial Access",  id: "T1190",     name: "Exploit Public-Facing Application" },
    { tactic: "Discovery",       id: "T1083",     name: "File and Directory Discovery" },
  ],
  "sql-injection-101": [
    { tactic: "Initial Access",  id: "T1190",     name: "Exploit Public-Facing Application" },
    { tactic: "Execution",       id: "T1059.007", name: "JavaScript / SQL" },
    { tactic: "Collection",      id: "T1213",     name: "Data from Information Repositories" },
    { tactic: "Credential Access", id: "T1552.001", name: "Credentials In Files" },
  ],
  "soc-alert-investigation": [
    { tactic: "Initial Access",        id: "T1566.001", name: "Spearphishing Attachment" },
    { tactic: "Execution",             id: "T1059.001", name: "PowerShell" },
    { tactic: "Persistence",           id: "T1547.001", name: "Registry Run Keys / Startup Folder" },
    { tactic: "Command and Control",   id: "T1071.001", name: "Web Protocols (HTTPS C2)" },
    { tactic: "Discovery",             id: "T1082",     name: "System Information Discovery" },
  ],
  "network-forensics-101": [
    { tactic: "Credential Access",     id: "T1040",  name: "Network Sniffing" },
    { tactic: "Command and Control",   id: "T1071",  name: "Application Layer Protocol" },
    { tactic: "Exfiltration",          id: "T1048",  name: "Exfiltration Over Alternative Protocol" },
    { tactic: "Discovery",             id: "T1046",  name: "Network Service Discovery" },
  ],
  "privilege-escalation": [
    { tactic: "Privilege Escalation",  id: "T1548.001", name: "Setuid and Setgid" },
    { tactic: "Privilege Escalation",  id: "T1548.003", name: "Sudo and Sudo Caching" },
    { tactic: "Discovery",             id: "T1083",     name: "File and Directory Discovery" },
  ],
  "osint-investigation": [
    { tactic: "Reconnaissance",        id: "T1589",  name: "Gather Victim Identity Information" },
    { tactic: "Reconnaissance",        id: "T1591",  name: "Gather Victim Org Information" },
    { tactic: "Reconnaissance",        id: "T1593",  name: "Search Open Websites/Domains" },
  ],
  "windows-log-analysis": [
    { tactic: "Credential Access",     id: "T1110",     name: "Brute Force" },
    { tactic: "Defense Evasion",       id: "T1078",     name: "Valid Accounts" },
    { tactic: "Lateral Movement",      id: "T1021.001", name: "Remote Desktop Protocol" },
    { tactic: "Discovery",             id: "T1087",     name: "Account Discovery" },
  ],
  "malware-triage": [
    { tactic: "Execution",             id: "T1204.002", name: "Malicious File" },
    { tactic: "Defense Evasion",       id: "T1055",     name: "Process Injection" },
    { tactic: "Persistence",           id: "T1053",     name: "Scheduled Task / Job" },
    { tactic: "Command and Control",   id: "T1071",     name: "Application Layer Protocol" },
  ],
  "xss-fundamentals": [
    { tactic: "Initial Access",        id: "T1189",     name: "Drive-by Compromise" },
    { tactic: "Collection",            id: "T1185",     name: "Browser Session Hijacking" },
    { tactic: "Execution",             id: "T1059.007", name: "JavaScript" },
  ],
  "ssrf-attack": [
    { tactic: "Initial Access",        id: "T1190",     name: "Exploit Public-Facing Application" },
    { tactic: "Discovery",             id: "T1083",     name: "File and Directory Discovery" },
    { tactic: "Credential Access",     id: "T1552.001", name: "Credentials In Files" },
    { tactic: "Lateral Movement",      id: "T1021",     name: "Remote Services (internal pivot)" },
  ],
  "active-directory-101": [
    { tactic: "Credential Access",     id: "T1110.003", name: "Password Spraying" },
    { tactic: "Credential Access",     id: "T1558",     name: "Steal or Forge Kerberos Tickets" },
    { tactic: "Lateral Movement",      id: "T1021.002", name: "SMB / Windows Admin Shares" },
    { tactic: "Discovery",             id: "T1018",     name: "Remote System Discovery" },
  ],
  "phishing-analysis": [
    { tactic: "Reconnaissance",        id: "T1598",     name: "Phishing for Information" },
    { tactic: "Initial Access",        id: "T1566.001", name: "Spearphishing Attachment" },
    { tactic: "Initial Access",        id: "T1566.002", name: "Spearphishing Link" },
  ],
  "memory-forensics": [
    { tactic: "Defense Evasion",       id: "T1055",     name: "Process Injection" },
    { tactic: "Execution",             id: "T1059.001", name: "PowerShell" },
    { tactic: "Credential Access",     id: "T1003",     name: "OS Credential Dumping" },
    { tactic: "Discovery",             id: "T1057",     name: "Process Discovery" },
  ],
  "web-recon": [
    { tactic: "Reconnaissance",        id: "T1590",  name: "Gather Victim Network Information" },
    { tactic: "Reconnaissance",        id: "T1595",  name: "Active Scanning" },
    { tactic: "Reconnaissance",        id: "T1592",  name: "Gather Victim Host Information" },
    { tactic: "Discovery",             id: "T1046",  name: "Network Service Discovery" },
  ],
};

// ── Coverage computation ──────────────────────────────────────────────────────

export type MitreCoverage = {
  tacticsCovered: number;
  coveragePct: number;
  totalSimTechs: number;
  totalLabTechs: number;
  labsSolvedCount: number;
  simTechsByTactic: Map<string, Map<string, string>>;
  labTechsByTactic: Map<string, Map<string, string>>;
  labsByTactic: Map<string, string[]>;
};

export async function computeMitreCoverage(userId: string): Promise<MitreCoverage> {
  const [solvedAttempts, completedSims] = await Promise.all([
    db.attempt.findMany({
      where: { userId, status: "SOLVED" },
      include: { lab: { select: { slug: true, title: true, difficulty: true } } },
    }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      include: {
        template: { select: { slug: true, name: true } },
        events: { select: { id: true, type: true, actor: true, payload: true, narrative: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  const simTechsByTactic = new Map<string, Map<string, string>>();
  for (const sim of completedSims) {
    try {
      const outcome = sim.status as "CONTAINED" | "BREACHED";
      const timedEvents = sim.events.map((e) => ({
        id: e.id, type: e.type, actor: e.actor,
        payload: e.payload, narrative: e.narrative,
        createdAt: e.createdAt.toISOString(),
      }));
      const debrief = buildDebrief(sim.template.slug, timedEvents, outcome, sim.score);
      for (const t of debrief.mitreTechniques) {
        if (!simTechsByTactic.has(t.tactic)) simTechsByTactic.set(t.tactic, new Map());
        simTechsByTactic.get(t.tactic)!.set(t.id, t.name);
      }
    } catch { /* skip unrecognised templates */ }
  }

  const labTechsByTactic = new Map<string, Map<string, string>>();
  const labsByTactic     = new Map<string, string[]>();

  for (const attempt of solvedAttempts) {
    const techs = LAB_TECHNIQUES[attempt.lab.slug] ?? [];
    for (const tech of techs) {
      if (!labTechsByTactic.has(tech.tactic)) labTechsByTactic.set(tech.tactic, new Map());
      labTechsByTactic.get(tech.tactic)!.set(tech.id, tech.name);
      if (!labsByTactic.has(tech.tactic)) labsByTactic.set(tech.tactic, []);
      const list = labsByTactic.get(tech.tactic)!;
      if (!list.includes(attempt.lab.title)) list.push(attempt.lab.title);
    }
  }

  const tacticsCovered = ALL_TACTICS.filter(
    (t) => simTechsByTactic.has(t.name) || labTechsByTactic.has(t.name)
  ).length;
  const coveragePct = Math.round((tacticsCovered / ALL_TACTICS.length) * 100);

  const totalSimTechs = [...simTechsByTactic.values()].reduce((s, m) => s + m.size, 0);
  const totalLabTechs = [...labTechsByTactic.values()].reduce((s, m) => s + m.size, 0);

  return {
    tacticsCovered, coveragePct, totalSimTechs, totalLabTechs,
    labsSolvedCount: solvedAttempts.length,
    simTechsByTactic, labTechsByTactic, labsByTactic,
  };
}
