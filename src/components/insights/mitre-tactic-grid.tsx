import { ALL_TACTICS, type MitreCoverage } from "@/lib/insights/mitre";

export function MitreTacticGrid({ coverage }: { coverage: MitreCoverage }) {
  const { tacticsCovered, coveragePct, totalSimTechs, totalLabTechs, labsSolvedCount, simTechsByTactic, labTechsByTactic, labsByTactic } = coverage;

  return (
    <div className="space-y-8">
      {/* Kill chain bar + legend */}
      <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Kill Chain Heat Map</p>
          <div className="flex gap-5 text-xs text-zinc-500">
            <span><span className="text-violet-400 font-bold">{totalSimTechs}</span> sim techniques</span>
            <span><span className="text-emerald-400 font-bold">{totalLabTechs}</span> lab techniques</span>
            <span><span className="text-blue-400 font-bold">{labsSolvedCount}</span> labs solved</span>
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
    </div>
  );
}

export function MitreCoverageHeader({ coverage }: { coverage: MitreCoverage }) {
  return (
    <div className="text-right">
      <p className="text-4xl font-black tabular-nums">{coverage.coveragePct}<span className="text-lg text-zinc-500">%</span></p>
      <p className="text-xs text-zinc-500 mt-0.5">{coverage.tacticsCovered} / {ALL_TACTICS.length} tactics covered</p>
    </div>
  );
}
