// Visual kill-chain timeline component — horizontal stage flow
// with per-stage duration and containment indicators.

type TimelineEntry = {
  stage: string;
  label: string;
  enteredAt: string;
  durationSec: number | null;
  wasBlocked: boolean;
};

const STAGE_SEVERITY: Record<string, string> = {
  NORMAL:               "border-edge-strong bg-surface-1 text-ink-2",
  INITIAL_ACCESS:       "border-info-edge bg-info-wash text-info",
  EXECUTION:            "border-sev-high-edge bg-sev-high-wash text-sev-high",
  PERSISTENCE:          "border-yellow-500/40 bg-yellow-900/20 text-yellow-300",
  PRIVILEGE_ESCALATION: "border-warn-edge bg-warn-wash text-warn",
  LATERAL_MOVEMENT:     "border-pink-500/40 bg-pink-900/20 text-pink-300",
  CREDENTIAL_ACCESS:    "border-accent-edge bg-accent-wash text-accent",
  DATA_EXFILTRATION:    "border-danger-edge bg-danger-wash text-danger",
  RANSOMWARE:           "border-danger-edge bg-danger-wash text-danger",
  IMPACT:               "border-danger-edge bg-danger-wash text-danger",
};

function fmt(sec: number): string {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

export function AttackTimeline({ timeline }: { timeline: TimelineEntry[] }) {
  const total = timeline.reduce((acc, t) => acc + (t.durationSec ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm uppercase tracking-widest text-ink-3">Attack Timeline</h2>
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <span>{timeline.length} stage{timeline.length !== 1 ? "s" : ""}</span>
          {total > 0 && <span>· {fmt(total)} total</span>}
        </div>
      </div>

      {/* Horizontal stage flow */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2 mb-4">
        {timeline.map((entry, i) => {
          const colors = STAGE_SEVERITY[entry.stage] ?? STAGE_SEVERITY.NORMAL;
          const isLast = i === timeline.length - 1;
          const widthPct = entry.durationSec && total > 0
            ? Math.max(8, Math.round((entry.durationSec / total) * 100))
            : Math.round(100 / timeline.length);

          return (
            <div key={entry.stage} className="flex items-stretch shrink-0" style={{ minWidth: `${widthPct}%` }}>
              <div className={`flex-1 rounded-lg border p-3 ${colors} ${entry.wasBlocked ? "ring-2 ring-ok" : ""}`}>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide leading-tight">
                    {entry.label}
                  </p>
                  {entry.wasBlocked && (
                    <span className="text-[8px] font-bold text-ok bg-ok-wash border border-ok-edge rounded px-1 shrink-0">
                      STOPPED
                    </span>
                  )}
                </div>
                {entry.durationSec !== null && (
                  <p className="text-[10px] opacity-60">{fmt(entry.durationSec)}</p>
                )}
                <p className="text-[9px] opacity-40 mt-1">
                  {new Date(entry.enteredAt).toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit", hour12: false,
                  })}
                </p>
              </div>

              {/* Connector arrow */}
              {!isLast && (
                <div className="flex items-center px-1 shrink-0">
                  <span className="text-ink-3 text-xs">→</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stage duration bars */}
      {total > 0 && (
        <div className="rounded-xl border border-edge bg-surface-1 p-4">
          <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-3">Time in Each Stage</p>
          <div className="space-y-2">
            {timeline.filter((t) => t.durationSec !== null && t.durationSec > 0).map((entry) => {
              const pct = Math.round(((entry.durationSec ?? 0) / total) * 100);
              const colors = STAGE_SEVERITY[entry.stage] ?? STAGE_SEVERITY.NORMAL;
              const barColor = entry.wasBlocked ? "bg-ok" :
                entry.stage.includes("RANSOMWARE") || entry.stage.includes("EXFIL") || entry.stage.includes("IMPACT") ? "bg-danger" :
                entry.stage.includes("LATERAL") || entry.stage.includes("ESCALATION") ? "bg-sev-high" :
                "bg-surface-3";

              return (
                <div key={entry.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${colors.split(" ")[2] ?? "text-ink-2"}`}>
                      {entry.label}
                      {entry.wasBlocked && <span className="text-ok text-[10px] ml-1">(contained)</span>}
                    </span>
                    <span className="text-xs text-ink-3">
                      {fmt(entry.durationSec ?? 0)} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
