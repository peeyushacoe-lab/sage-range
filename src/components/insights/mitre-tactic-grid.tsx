import { ALL_TACTICS, type MitreCoverage } from "@/lib/insights/mitre";

export function MitreTacticGrid({ coverage }: { coverage: MitreCoverage }) {
  const { tacticsCovered, coveragePct, totalSimTechs, totalLabTechs, labsSolvedCount, simTechsByTactic, labTechsByTactic, labsByTactic } = coverage;

  return (
    <div className="space-y-8">
      {/* Kill chain bar + legend */}
      <div className="rounded-xl border border-edge bg-surface-1 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-ink-3">Kill Chain Heat Map</p>
          <div className="flex gap-5 text-xs text-ink-3">
            <span><span className="text-violet-400 font-bold">{totalSimTechs}</span> sim techniques</span>
            <span><span className="text-ok font-bold">{totalLabTechs}</span> lab techniques</span>
            <span><span className="text-info font-bold">{labsSolvedCount}</span> labs solved</span>
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
                className={`flex-1 rounded transition-all ${covered ? t.color.bar + " opacity-80" : "bg-surface-2"}`}
              />
            );
          })}
        </div>

        <div className="flex justify-between text-[10px] text-ink-3">
          <span>Reconnaissance</span>
          <span>Impact</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[10px] text-ink-3 pt-1 border-t border-edge-subtle">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-violet-500/70 inline-block" /> Simulation exposure</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-ok-wash inline-block" /> Lab practice</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-surface-2 inline-block" /> Not yet covered</span>
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
                  : "border-edge-strong/60 bg-surface-1 opacity-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${covered ? tactic.color.bar : "bg-surface-3"}`} />
                  <p className={`text-sm font-semibold leading-tight ${covered ? tactic.color.text : "text-ink-3"}`}>
                    {tactic.name}
                  </p>
                </div>
                {!covered && (
                  <span className="text-[10px] text-ink-3 border border-edge-strong rounded px-1.5 py-0.5 shrink-0">Gap</span>
                )}
              </div>

              {labTechs && labTechs.size > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1.5">Lab Practice</p>
                  <div className="flex flex-wrap gap-1">
                    {[...labTechs.entries()].slice(0, 5).map(([id, name]) => (
                      <span
                        key={id}
                        title={name}
                        className="text-[10px] font-mono border border-ok-edge bg-ok-wash text-ok rounded px-1.5 py-0.5"
                      >
                        {id}
                      </span>
                    ))}
                    {labTechs.size > 5 && (
                      <span className="text-[10px] text-ink-3">+{labTechs.size - 5}</span>
                    )}
                  </div>
                  {labs.length > 0 && (
                    <p className="text-[10px] text-ink-3 mt-1 truncate">
                      {labs.slice(0, 2).join(", ")}
                      {labs.length > 2 && ` +${labs.length - 2} more`}
                    </p>
                  )}
                </div>
              )}

              {simTechs && simTechs.size > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1.5">Simulation Exposure</p>
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
                      <span className="text-[10px] text-ink-3">+{simTechs.size - 4}</span>
                    )}
                  </div>
                </div>
              )}

              {!covered && (
                <p className="text-[10px] text-ink-3 mt-1">
                  Complete labs or simulations in this area.
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Coverage gaps */}
      {tacticsCovered < ALL_TACTICS.length && (
        <div className="rounded-xl border border-edge bg-surface-1 p-5">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">
            Coverage Gaps — {ALL_TACTICS.length - tacticsCovered} tactic{ALL_TACTICS.length - tacticsCovered !== 1 ? "s" : ""} remaining
          </p>
          <div className="flex flex-wrap gap-2">
            {ALL_TACTICS
              .filter((t) => !simTechsByTactic.has(t.name) && !labTechsByTactic.has(t.name))
              .map((t) => (
                <span key={t.id} className="text-xs border border-edge-strong/60 bg-surface-1 text-ink-3 rounded-lg px-3 py-1.5">
                  {t.name}
                </span>
              ))}
          </div>
          <p className="text-xs text-ink-3 mt-3">
            Solve labs and run simulations covering these tactics to build full kill-chain coverage.
          </p>
        </div>
      )}

      {tacticsCovered === ALL_TACTICS.length && (
        <div className="rounded-xl border border-ok-edge bg-ok-wash p-5 text-center">
          <p className="text-ok font-bold text-lg">Full Kill Chain Coverage</p>
          <p className="text-sm text-ink-2 mt-1">All 14 MITRE ATT&CK Enterprise tactics covered. Exceptional work.</p>
        </div>
      )}
    </div>
  );
}

export function MitreCoverageHeader({ coverage }: { coverage: MitreCoverage }) {
  return (
    <div className="text-right">
      <p className="text-4xl font-black tabular-nums">{coverage.coveragePct}<span className="text-lg text-ink-3">%</span></p>
      <p className="text-xs text-ink-3 mt-0.5">{coverage.tacticsCovered} / {ALL_TACTICS.length} tactics covered</p>
    </div>
  );
}
