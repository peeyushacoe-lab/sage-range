import { db } from "@/lib/db";
import { CopyFlagBtn } from "./_copy-flag-btn";

export const dynamic = "force-dynamic";

const TYPE_CONFIG = {
  CTF:       { label: "CTF",        color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/20", dot: "bg-emerald-500" },
  BLUE_TEAM: { label: "Blue Team",  color: "text-blue-400",    bg: "bg-blue-500/8 border-blue-500/20",       dot: "bg-blue-500" },
  RED_TEAM:  { label: "Red Team",   color: "text-red-400",     bg: "bg-red-500/8 border-red-500/20",         dot: "bg-red-500" },
} as const;

const DIFF_CONFIG = {
  EASY:   { color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/20" },
  MEDIUM: { color: "text-amber-400",   bg: "bg-amber-500/8 border-amber-500/20" },
  HARD:   { color: "text-red-400",     bg: "bg-red-500/8 border-red-500/20" },
  INSANE: { color: "text-purple-400",  bg: "bg-purple-500/8 border-purple-500/20" },
} as const;

export default async function CheatsheetPage() {
  const labs = await db.lab.findMany({
    include: { flags: { orderBy: { points: "asc" } } },
    orderBy: [{ type: "asc" }, { difficulty: "asc" }, { title: "asc" }],
  });

  const byType = labs.reduce<Record<string, typeof labs>>((acc, lab) => {
    acc[lab.type] = acc[lab.type] ?? [];
    acc[lab.type].push(lab);
    return acc;
  }, {});

  const totalFlags = labs.reduce((sum, l) => sum + l.flags.length, 0);
  const totalPoints = labs.reduce((sum, l) => sum + l.flags.reduce((s, f) => s + f.points, 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Lab Cheatsheet</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {labs.length} labs · {totalFlags} flags · {totalPoints} total points
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest border border-red-500/30 bg-red-500/8 text-red-400 rounded-lg px-3 py-1.5">
          Admin Only
        </span>
      </div>

      {(["CTF", "BLUE_TEAM", "RED_TEAM"] as const).map((type) => {
        const group = byType[type] ?? [];
        if (!group.length) return null;
        const cfg = TYPE_CONFIG[type];

        return (
          <div key={type} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <h2 className={`text-base font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</h2>
              <span className="text-xs text-zinc-600">{group.length} labs · {group.reduce((s, l) => s + l.flags.length, 0)} flags</span>
            </div>

            <div className="space-y-3">
              {group.map((lab) => {
                const diffCfg = DIFF_CONFIG[lab.difficulty as keyof typeof DIFF_CONFIG];
                return (
                  <div key={lab.id} className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden">
                    {/* Lab header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-zinc-100">{lab.title}</p>
                        <span className="text-xs font-mono text-zinc-600">{lab.slug}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!lab.published && (
                          <span className="text-[10px] font-bold uppercase border rounded px-2 py-0.5 text-zinc-600 border-zinc-700 bg-zinc-800">
                            Draft
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase border rounded px-2 py-0.5 ${diffCfg.color} ${diffCfg.bg}`}>
                          {lab.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Flags */}
                    {lab.flags.length === 0 ? (
                      <div className="px-5 py-3 text-xs text-zinc-600 italic">No flags configured</div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {lab.flags.map((flag, i) => (
                          <div key={flag.id} className="flex items-center justify-between px-5 py-3 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xs text-zinc-600 shrink-0">#{i + 1}</span>
                              <code className="text-sm font-mono text-emerald-300 font-bold">{flag.value}</code>
                              {!flag.caseSensitive && (
                                <span className="text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5">case-insensitive</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-xs text-zinc-500 tabular-nums">{flag.points} pts</span>
                              <CopyFlagBtn value={flag.value} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
