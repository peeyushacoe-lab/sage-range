// MITRE ATT&CK heatmap — groups observed techniques into tactic columns.
// Tactics not seen in the simulation are shown dimmed to give full coverage context.

type Technique = { id: string; name: string; tactic: string };

const ALL_TACTICS = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
];

const TACTIC_COLOR: Record<string, { active: string; dot: string; border: string }> = {
  "Reconnaissance":       { active: "bg-surface-3/60 text-ink-2",      dot: "bg-ink-3",    border: "border-edge-strong/40" },
  "Resource Development": { active: "bg-surface-3/60 text-ink-2",      dot: "bg-ink-3",    border: "border-edge-strong/40" },
  "Initial Access":       { active: "bg-info-wash text-info",      dot: "bg-info",    border: "border-info-edge" },
  "Execution":            { active: "bg-sev-high-wash text-sev-high",  dot: "bg-sev-high",  border: "border-sev-high-edge" },
  "Persistence":          { active: "bg-yellow-900/50 text-yellow-300",  dot: "bg-yellow-400",  border: "border-yellow-500/30" },
  "Privilege Escalation": { active: "bg-warn-wash text-warn",   dot: "bg-warn",   border: "border-warn-edge" },
  "Defense Evasion":      { active: "bg-cyan-900/50 text-cyan-300",     dot: "bg-cyan-400",    border: "border-cyan-500/30" },
  "Credential Access":    { active: "bg-accent-wash text-accent", dot: "bg-accent",  border: "border-accent-edge" },
  "Discovery":            { active: "bg-ok-wash text-ok",     dot: "bg-ok",    border: "border-ok-edge" },
  "Lateral Movement":     { active: "bg-pink-900/50 text-pink-300",     dot: "bg-pink-400",    border: "border-pink-500/30" },
  "Collection":           { active: "bg-indigo-900/50 text-indigo-300", dot: "bg-indigo-400",  border: "border-indigo-500/30" },
  "Command and Control":  { active: "bg-violet-900/50 text-violet-300", dot: "bg-violet-400",  border: "border-violet-500/30" },
  "Exfiltration":         { active: "bg-danger-wash text-danger",       dot: "bg-danger",     border: "border-danger-edge" },
  "Impact":               { active: "bg-danger-wash text-danger",       dot: "bg-danger",     border: "border-danger-edge" },
};

export function MitreHeatmap({ techniques }: { techniques: Technique[] }) {
  const byTactic = new Map<string, Technique[]>();
  for (const t of techniques) {
    if (!byTactic.has(t.tactic)) byTactic.set(t.tactic, []);
    byTactic.get(t.tactic)!.push(t);
  }

  const activeTactics = ALL_TACTICS.filter((t) => byTactic.has(t));
  const coverage = activeTactics.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm uppercase tracking-widest text-ink-3">MITRE ATT&CK Coverage</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-3">{techniques.length} technique{techniques.length !== 1 ? "s" : ""}</span>
          <span className="text-xs text-ink-3">across {coverage} tactic{coverage !== 1 ? "s" : ""}</span>
          <div className="h-1.5 w-24 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-danger-wash"
              style={{ width: `${Math.round((coverage / ALL_TACTICS.length) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-danger font-semibold">{Math.round((coverage / ALL_TACTICS.length) * 100)}%</span>
        </div>
      </div>

      {/* Observed techniques grid */}
      {techniques.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
          {techniques.map((t) => {
            const colors = TACTIC_COLOR[t.tactic] ?? TACTIC_COLOR["Reconnaissance"];
            return (
              <div key={t.id} className={`rounded-lg border p-3 ${colors.border} ${colors.active}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />
                  <span className="font-mono text-[10px] text-ink-2">{t.id}</span>
                  <span className="text-[10px] text-ink-3 ml-auto truncate">{t.tactic}</span>
                </div>
                <p className="text-sm font-medium leading-snug">{t.name}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tactic coverage bar — all 14 tactics, active ones lit up */}
      <div className="rounded-xl border border-edge bg-surface-1 p-4">
        <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-3">Kill Chain Coverage</p>
        <div className="flex flex-wrap gap-2">
          {ALL_TACTICS.map((tactic) => {
            const isActive = byTactic.has(tactic);
            const colors = TACTIC_COLOR[tactic] ?? TACTIC_COLOR["Reconnaissance"];
            const count = byTactic.get(tactic)?.length ?? 0;
            return (
              <div
                key={tactic}
                title={isActive ? `${count} technique${count !== 1 ? "s" : ""}` : "Not observed"}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 transition ${
                  isActive
                    ? `${colors.border} ${colors.active}`
                    : "border-edge-strong/60 bg-surface-1 text-ink-3"
                }`}
              >
                {isActive && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${colors.dot}`} />}
                <span className="text-[10px] font-medium leading-none">{tactic}</span>
                {isActive && <span className="text-[10px] opacity-60 ml-0.5">{count}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
