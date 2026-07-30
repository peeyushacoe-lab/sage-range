import { RANKS } from "@/lib/cyber-identity";

function formatThreshold(min: number, nextMin: number | null): string {
  const fmt = (n: number) => n.toLocaleString();
  return nextMin === null ? `${fmt(min)}+` : `${fmt(min)}–${fmt(nextMin - 1)}`;
}

export function RankLegend() {
  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-3">Rank Legend</p>
      <div className="flex flex-wrap gap-2">
        {RANKS.map((r) => (
          <div
            key={r.tier}
            className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/2 px-2.5 py-1.5"
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
            <span className="text-xs font-semibold" style={{ color: r.color }}>{r.label}</span>
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">{formatThreshold(r.min, r.nextMin)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
