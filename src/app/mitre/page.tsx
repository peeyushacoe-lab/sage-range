import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "MITRE ATT&CK Progress · Sage Vault" };

// ── ATT&CK Tactic Registry ────────────────────────────────────────────────────

const ALL_TACTICS = [
  { id: "recon",     name: "Reconnaissance",       color: { text: "text-zinc-300",    bar: "bg-zinc-500",    border: "border-zinc-600/40",    bg: "bg-zinc-700/30"    } },
  { id: "resdev",    name: "Resource Development",  color: { text: "text-zinc-300",    bar: "bg-zinc-500",    border: "border-zinc-600/40",    bg: "bg-zinc-700/30"    } },
  { id: "ia",        name: "Initial Access",        color: { text: "text-blue-300",    bar: "bg-blue-500",    border: "border-blue-500/30",    bg: "bg-blue-900/20"    } },
  { id: "exec",      name: "Execution",             color: { text: "text-orange-300",  bar: "bg-orange-500",  border: "border-orange-500/30",  bg: "bg-orange-900/20"  } },
  { id: "persist",   name: "Persistence",           color: { text: "text-yellow-300",  bar: "bg-yellow-500",  border: "border-yellow-500/30",  bg: "bg-yellow-900/20"  } },
  { id: "privesc",   name: "Privilege Escalation",  color: { text: "text-amber-300",   bar: "bg-amber-500",   border: "border-amber-500/30",   bg: "bg-amber-900/20"   } },
  { id: "defevas",   name: "Defense Evasion",       color: { text: "text-cyan-300",    bar: "bg-cyan-500",    border: "border-cyan-500/30",    bg: "bg-cyan-900/20"    } },
  { id: "credacc",   name: "Credential Access",     color: { text: "text-purple-300",  bar: "bg-purple-500",  border: "border-purple-500/30",  bg: "bg-purple-900/20"  } },
  { id: "disc",      name: "Discovery",             color: { text: "text-teal-300",    bar: "bg-teal-500",    border: "border-teal-500/30",    bg: "bg-teal-900/20"    } },
  { id: "latmov",    name: "Lateral Movement",      color: { text: "text-pink-300",    bar: "bg-pink-500",    border: "border-pink-500/30",    bg: "bg-pink-900/20"    } },
  { id: "collect",   name: "Collection",            color: { text: "text-indigo-300",  bar: "bg-indigo-500",  border: "border-indigo-500/30",  bg: "bg-indigo-900/20"  } },
  { id: "c2",        name: "Command and Control",   color: { text: "text-violet-300",  bar: "bg-violet-500",  border: "border-violet-500/30",  bg: "bg-violet-900/20"  } },
  { id: "exfil",     name: "Exfiltration",          color: { text: "text-red-300",     bar: "bg-red-500",     border: "border-red-500/30",     bg: "bg-red-900/20"     } },
  { id: "impact",    name: "Impact",                color: { text: "text-rose-200",    bar: "bg-rose-600",    border: "border-rose-600/40",    bg: "bg-rose-950/40"    } },
] as const;

// ── Lab category → MITRE tactic mapping ─────────────────────────────────────
// Labs don't store tactic metadata; we infer from their category string.

const CATEGORY_TACTIC_MAP: Record<string, string[]> = {
  // Reconnaissance
  "osint":                  ["Reconnaissance"],
  "open source intelligence": ["Reconnaissance"],
  "network scanning":       ["Reconnaissance", "Discovery"],
  "enumeration":            ["Reconnaissance", "Discovery"],
  "footprinting":           ["Reconnaissance"],
  "passive recon":          ["Reconnaissance"],
  // Initial Access
  "sql injection":          ["Initial Access", "Execution"],
  "xss":                    ["Initial Access", "Execution"],
  "cross-site scripting":   ["Initial Access", "Execution"],
  "web application":        ["Initial Access"],
  "phishing":               ["Initial Access"],
  "injection":              ["Initial Access", "Execution"],
  "authentication bypass":  ["Initial Access", "Credential Access"],
  "web exploitation":       ["Initial Access", "Execution"],
  "web":                    ["Initial Access"],
  // Execution
  "buffer overflow":        ["Execution"],
  "binary exploitation":    ["Execution"],
  "reverse engineering":    ["Execution", "Defense Evasion"],
  "code execution":         ["Execution"],
  "scripting":              ["Execution"],
  "shellcode":              ["Execution"],
  "rop chains":             ["Execution"],
  // Persistence
  "persistence":            ["Persistence"],
  "backdoor":               ["Persistence"],
  // Privilege Escalation
  "privilege escalation":   ["Privilege Escalation"],
  "linux privesc":          ["Privilege Escalation"],
  "windows privesc":        ["Privilege Escalation"],
  "privesc":                ["Privilege Escalation"],
  "suid":                   ["Privilege Escalation"],
  // Defense Evasion
  "steganography":          ["Defense Evasion", "Collection"],
  "cryptography":           ["Defense Evasion", "Credential Access"],
  "obfuscation":            ["Defense Evasion"],
  "malware analysis":       ["Defense Evasion", "Execution"],
  "anti-forensics":         ["Defense Evasion"],
  // Credential Access
  "password cracking":      ["Credential Access"],
  "hash cracking":          ["Credential Access"],
  "credential dumping":     ["Credential Access"],
  "kerberos":               ["Credential Access", "Lateral Movement"],
  // Discovery
  "forensics":              ["Discovery"],
  "digital forensics":      ["Discovery"],
  "log analysis":           ["Discovery"],
  "dfir":                   ["Discovery"],
  "memory forensics":       ["Discovery"],
  "network analysis":       ["Discovery", "Reconnaissance"],
  "packet analysis":        ["Discovery"],
  "wireshark":              ["Discovery"],
  // Lateral Movement
  "lateral movement":       ["Lateral Movement"],
  "pivoting":               ["Lateral Movement"],
  "network":                ["Lateral Movement", "Discovery"],
  // Collection
  "collection":             ["Collection"],
  "data exfiltration":      ["Collection", "Exfiltration"],
  // Command and Control
  "c2":                     ["Command and Control"],
  "command and control":    ["Command and Control"],
  "covert channels":        ["Command and Control"],
  // Exfiltration
  "exfiltration":           ["Exfiltration"],
  "data leakage":           ["Exfiltration"],
  // Impact
  "ransomware":             ["Impact"],
  "denial of service":      ["Impact"],
  "dos":                    ["Impact"],
  "impact":                 ["Impact"],
};

function labCategoryToTactics(category: string): string[] {
  const lower = category.toLowerCase().trim();
  // Exact match first
  if (CATEGORY_TACTIC_MAP[lower]) return CATEGORY_TACTIC_MAP[lower];
  // Substring match
  for (const [key, tactics] of Object.entries(CATEGORY_TACTIC_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return tactics;
  }
  return [];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MitrePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const [solvedAttempts, completedSims] = await Promise.all([
    db.attempt.findMany({
      where: { userId: me.id, status: "SOLVED" },
      include: { lab: { select: { category: true, title: true, difficulty: true } } },
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
  // Map: tacticName → Set<techniqueId>
  const simTechniquesByTactic = new Map<string, Map<string, string>>();

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
        if (!simTechniquesByTactic.has(t.tactic)) simTechniquesByTactic.set(t.tactic, new Map());
        simTechniquesByTactic.get(t.tactic)!.set(t.id, t.name);
      }
    } catch { /* skip if template not found */ }
  }

  // ── Lab → MITRE tactics ──────────────────────────────────────────────────────
  const labsByTactic = new Map<string, { title: string; difficulty: string }[]>();
  for (const attempt of solvedAttempts) {
    const tactics = labCategoryToTactics(attempt.lab.category);
    for (const tactic of tactics) {
      if (!labsByTactic.has(tactic)) labsByTactic.set(tactic, []);
      labsByTactic.get(tactic)!.push({ title: attempt.lab.title, difficulty: attempt.lab.difficulty });
    }
  }

  // ── Overall stats ────────────────────────────────────────────────────────────
  const tacticsCoveredSim = new Set([...simTechniquesByTactic.keys()]).size;
  const tacticsCoveredLabs = new Set([...labsByTactic.keys()]).size;
  const tacticsCovered = ALL_TACTICS.filter(
    (t) => simTechniquesByTactic.has(t.name) || labsByTactic.has(t.name)
  ).length;
  const coveragePct = Math.round((tacticsCovered / ALL_TACTICS.length) * 100);

  const totalTechniques = [...simTechniquesByTactic.values()].reduce((s, m) => s + m.size, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">MITRE ATT&CK Framework</p>
            <h1 className="text-2xl font-bold">Progress Tracker</h1>
            <p className="text-sm text-zinc-500 mt-1">Coverage across the 14 Enterprise tactics</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums">{coveragePct}%</p>
            <p className="text-xs text-zinc-500 mt-0.5">{tacticsCovered} / {ALL_TACTICS.length} tactics covered</p>
          </div>
        </div>

        {/* Coverage summary bar */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Overall Kill Chain Coverage</p>
            <div className="flex gap-5 text-xs text-zinc-500">
              <span><span className="text-violet-400 font-bold">{totalTechniques}</span> sim techniques</span>
              <span><span className="text-emerald-400 font-bold">{solvedAttempts.length}</span> labs solved</span>
              <span><span className="text-blue-400 font-bold">{completedSims.length}</span> simulations</span>
            </div>
          </div>
          {/* Kill chain bar */}
          <div className="flex gap-1 h-7">
            {ALL_TACTICS.map((t) => {
              const hasSim = simTechniquesByTactic.has(t.name);
              const hasLab = labsByTactic.has(t.name);
              const covered = hasSim || hasLab;
              return (
                <div
                  key={t.id}
                  title={`${t.name}${covered ? " — covered" : " — not yet covered"}`}
                  className={`flex-1 rounded transition-all ${covered ? t.color.bar + " opacity-80" : "bg-zinc-800"}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1.5">
            <span>Reconnaissance</span>
            <span>Impact</span>
          </div>
          <div className="flex items-center gap-3 mt-3 text-[10px] text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-500/70 inline-block" /> Simulation exposure</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/70 inline-block" /> Lab practice</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-zinc-800 inline-block" /> Not yet covered</span>
          </div>
        </div>

        {/* Tactic grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ALL_TACTICS.map((tactic) => {
            const simTechniques = simTechniquesByTactic.get(tactic.name);
            const labs = labsByTactic.get(tactic.name) ?? [];
            const covered = !!simTechniques || labs.length > 0;
            const techCount = simTechniques?.size ?? 0;

            return (
              <div
                key={tactic.id}
                className={`rounded-xl border p-4 transition-all ${
                  covered
                    ? `${tactic.color.border} ${tactic.color.bg}`
                    : "border-zinc-800/60 bg-zinc-900/20 opacity-60"
                }`}
              >
                {/* Tactic header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${covered ? tactic.color.bar : "bg-zinc-700"}`} />
                    <p className={`text-sm font-semibold leading-tight ${covered ? tactic.color.text : "text-zinc-600"}`}>
                      {tactic.name}
                    </p>
                  </div>
                  {!covered && (
                    <span className="text-[10px] text-zinc-700 border border-zinc-800 rounded px-1.5 py-0.5 shrink-0">Not covered</span>
                  )}
                </div>

                {/* Sim techniques */}
                {techCount > 0 && simTechniques && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Simulation Exposure</p>
                    <div className="flex flex-wrap gap-1">
                      {[...simTechniques.entries()].slice(0, 4).map(([id, name]) => (
                        <span
                          key={id}
                          title={name}
                          className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${tactic.color.border} ${tactic.color.text} opacity-80`}
                        >
                          {id}
                        </span>
                      ))}
                      {simTechniques.size > 4 && (
                        <span className="text-[10px] text-zinc-600">+{simTechniques.size - 4} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Lab coverage */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-zinc-600">Lab Practice</p>
                    <span className={`text-[10px] font-bold tabular-nums ${labs.length > 0 ? tactic.color.text : "text-zinc-700"}`}>
                      {labs.length} lab{labs.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-zinc-800/80">
                    {labs.length > 0 && (
                      <div
                        className={`h-full rounded-full ${tactic.color.bar}`}
                        style={{ width: `${Math.min(100, labs.length * 20)}%` }}
                      />
                    )}
                  </div>
                  {labs.length > 0 && (
                    <p className="text-[10px] text-zinc-600 mt-1 truncate">
                      {labs.slice(0, 2).map((l) => l.title).join(", ")}
                      {labs.length > 2 && ` +${labs.length - 2} more`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gaps: uncovered tactics */}
        {tacticsCovered < ALL_TACTICS.length && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Coverage Gaps — Tactics to Work On</p>
            <div className="flex flex-wrap gap-2">
              {ALL_TACTICS.filter((t) => !simTechniquesByTactic.has(t.name) && !labsByTactic.has(t.name)).map((t) => (
                <span key={t.id} className="text-xs border border-zinc-700/60 bg-zinc-900/40 text-zinc-500 rounded-lg px-3 py-1.5">
                  {t.name}
                </span>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-3">
              Complete labs and simulations in these areas to build full kill-chain coverage.
            </p>
          </div>
        )}

        {/* Perfect coverage */}
        {tacticsCovered === ALL_TACTICS.length && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-5 text-center">
            <p className="text-emerald-400 font-bold text-lg">Full Kill Chain Coverage</p>
            <p className="text-sm text-zinc-400 mt-1">You&apos;ve covered all 14 MITRE ATT&CK Enterprise tactics.</p>
          </div>
        )}

      </main>
    </div>
  );
}
