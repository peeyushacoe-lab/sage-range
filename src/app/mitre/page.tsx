import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "MITRE ATT&CK Progress · Sage Vault" };

// ── Tactic definitions ────────────────────────────────────────────────────────

const ALL_TACTICS = [
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

const LAB_TECHNIQUES: Record<string, { tactic: string; id: string; name: string }[]> = {
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MitrePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const [solvedAttempts, completedSims] = await Promise.all([
    db.attempt.findMany({
      where: { userId: me.id, status: "SOLVED" },
      include: { lab: { select: { slug: true, title: true, difficulty: true } } },
    }),
    db.simulationSession.findMany({
      where: { userId: me.id, status: { in: ["CONTAINED", "BREACHED"] } },
      include: {
        template: { select: { slug: true, name: true } },
        events: { select: { id: true, type: true, actor: true, payload: true, narrative: true, createdAt: true }, orderBy: { createdAt: "asc" } },
      },
    }),
  ]);

  // ── Sim → MITRE techniques ───────────────────────────────────────────────────
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

  // ── Lab → MITRE techniques ───────────────────────────────────────────────────
  // labTechsByTactic: tactic → Map<techId, techName>
  // labsByTactic:     tactic → list of lab titles
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

  // ── Stats ────────────────────────────────────────────────────────────────────
  const tacticsCovered = ALL_TACTICS.filter(
    (t) => simTechsByTactic.has(t.name) || labTechsByTactic.has(t.name)
  ).length;
  const coveragePct = Math.round((tacticsCovered / ALL_TACTICS.length) * 100);

  const totalSimTechs = [...simTechsByTactic.values()].reduce((s, m) => s + m.size, 0);
  const totalLabTechs = [...labTechsByTactic.values()].reduce((s, m) => s + m.size, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">MITRE ATT&CK Framework</p>
            <h1 className="text-2xl font-bold">Kill Chain Coverage</h1>
            <p className="text-sm text-zinc-500 mt-1">Your coverage across 14 Enterprise tactics</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black tabular-nums">{coveragePct}<span className="text-lg text-zinc-500">%</span></p>
            <p className="text-xs text-zinc-500 mt-0.5">{tacticsCovered} / {ALL_TACTICS.length} tactics covered</p>
          </div>
        </div>

        {/* Kill chain bar + legend */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Kill Chain Heat Map</p>
            <div className="flex gap-5 text-xs text-zinc-500">
              <span><span className="text-violet-400 font-bold">{totalSimTechs}</span> sim techniques</span>
              <span><span className="text-emerald-400 font-bold">{totalLabTechs}</span> lab techniques</span>
              <span><span className="text-blue-400 font-bold">{solvedAttempts.length}</span> labs solved</span>
            </div>
          </div>

          <div className="flex gap-1 h-8">
            {ALL_TACTICS.map((t) => {
              const hasSim = simTechsByTactic.has(t.name);
              const hasLab = labTechsByTactic.has(t.name);
              const covered = hasSim || hasLab;
              return (
                <div
                  key={t.id}
                  title={`${t.name}${covered ? " ✓" : " — not yet covered"}`}
                  className={`flex-1 rounded transition-all ${covered ? t.color.bar + " opacity-80" : "bg-zinc-800"}`}
                />
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-zinc-600">
            <span>Reconnaissance</span>
            <span>Impact</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-500 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-500/70 inline-block" /> Simulation exposure</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/70 inline-block" /> Lab practice</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-zinc-800 inline-block" /> Not yet covered</span>
          </div>
        </div>

        {/* Tactic grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_TACTICS.map((tactic) => {
            const simTechs = simTechsByTactic.get(tactic.name);
            const labTechs = labTechsByTactic.get(tactic.name);
            const labs     = labsByTactic.get(tactic.name) ?? [];
            const covered  = !!simTechs || !!labTechs;

            return (
              <div
                key={tactic.id}
                className={`rounded-xl border p-4 transition-all ${
                  covered
                    ? `${tactic.color.border} ${tactic.color.bg}`
                    : "border-zinc-800/60 bg-zinc-900/20 opacity-50"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${covered ? tactic.color.bar : "bg-zinc-700"}`} />
                    <p className={`text-sm font-semibold leading-tight ${covered ? tactic.color.text : "text-zinc-600"}`}>
                      {tactic.name}
                    </p>
                  </div>
                  {!covered && (
                    <span className="text-[10px] text-zinc-700 border border-zinc-800 rounded px-1.5 py-0.5 shrink-0">Gap</span>
                  )}
                </div>

                {/* Lab techniques */}
                {labTechs && labTechs.size > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Lab Practice</p>
                    <div className="flex flex-wrap gap-1">
                      {[...labTechs.entries()].slice(0, 5).map(([id, name]) => (
                        <span
                          key={id}
                          title={name}
                          className="text-[10px] font-mono border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded px-1.5 py-0.5"
                        >
                          {id}
                        </span>
                      ))}
                      {labTechs.size > 5 && (
                        <span className="text-[10px] text-zinc-600">+{labTechs.size - 5}</span>
                      )}
                    </div>
                    {labs.length > 0 && (
                      <p className="text-[10px] text-zinc-600 mt-1 truncate">
                        {labs.slice(0, 2).join(", ")}
                        {labs.length > 2 && ` +${labs.length - 2} more`}
                      </p>
                    )}
                  </div>
                )}

                {/* Sim techniques */}
                {simTechs && simTechs.size > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Simulation Exposure</p>
                    <div className="flex flex-wrap gap-1">
                      {[...simTechs.entries()].slice(0, 4).map(([id, name]) => (
                        <span
                          key={id}
                          title={name}
                          className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${tactic.color.border} ${tactic.color.text} opacity-80`}
                        >
                          {id}
                        </span>
                      ))}
                      {simTechs.size > 4 && (
                        <span className="text-[10px] text-zinc-600">+{simTechs.size - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Not yet covered placeholder */}
                {!covered && (
                  <p className="text-[10px] text-zinc-700 mt-1">
                    Complete labs or simulations in this area.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Coverage gaps */}
        {tacticsCovered < ALL_TACTICS.length && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">
              Coverage Gaps — {ALL_TACTICS.length - tacticsCovered} tactic{ALL_TACTICS.length - tacticsCovered !== 1 ? "s" : ""} remaining
            </p>
            <div className="flex flex-wrap gap-2">
              {ALL_TACTICS
                .filter((t) => !simTechsByTactic.has(t.name) && !labTechsByTactic.has(t.name))
                .map((t) => (
                  <span key={t.id} className="text-xs border border-zinc-700/60 bg-zinc-900/40 text-zinc-500 rounded-lg px-3 py-1.5">
                    {t.name}
                  </span>
                ))}
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              Solve labs and run simulations covering these tactics to build full kill-chain coverage.
            </p>
          </div>
        )}

        {tacticsCovered === ALL_TACTICS.length && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-center">
            <p className="text-emerald-400 font-bold text-lg">Full Kill Chain Coverage</p>
            <p className="text-sm text-zinc-400 mt-1">All 14 MITRE ATT&CK Enterprise tactics covered. Exceptional work.</p>
          </div>
        )}

      </main>
    </div>
  );
}
