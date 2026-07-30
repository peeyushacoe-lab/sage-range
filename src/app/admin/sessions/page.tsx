import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  CONTAINED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  BREACHED:  "bg-red-500/15 text-red-400 border-red-500/30",
  DEBRIEFED: "bg-zinc-800 text-zinc-500 border-zinc-700",
  ABANDONED: "bg-zinc-800 text-zinc-600 border-zinc-700",
};

export default async function SessionsPage() {
  const [sessions, activeCount, totalCount] = await Promise.all([
    db.simulationSession.findMany({
      include: { template: true, user: { select: { displayName: true, email: true } } },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    db.simulationSession.count({ where: { status: "ACTIVE" } }),
    db.simulationSession.count(),
  ]);

  return (
    <div className="p-8">
      <div className="flex items-center gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-zinc-500 text-sm mt-1">Last 50 simulation runs</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-400">{activeCount} live</span>
            </div>
          )}
          <span className="text-xs text-zinc-600">{totalCount} total</span>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">User</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Scenario</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Stage</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Score</th>
              <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Status</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200">{s.user.displayName ?? s.user.email.split("@")[0]}</p>
                  <p className="text-xs text-zinc-600">{s.user.email}</p>
                </td>
                <td className="px-4 py-3 text-zinc-300">{s.template.name}</td>
                <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{s.currentStage}</td>
                <td className="px-4 py-3 text-right font-bold text-zinc-200 tabular-nums">{s.score ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.ABANDONED}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-zinc-600 font-mono">
                  {s.startedAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">No sessions yet.</div>
        )}
      </div>
    </div>
  );
}
