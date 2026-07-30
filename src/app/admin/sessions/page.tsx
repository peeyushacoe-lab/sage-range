import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:    "bg-ok-wash text-ok border-ok-edge",
  CONTAINED: "bg-info-wash text-info border-info-edge",
  BREACHED:  "bg-danger-wash text-danger border-danger-edge",
  DEBRIEFED: "bg-surface-2 text-ink-3 border-edge-strong",
  ABANDONED: "bg-surface-2 text-ink-3 border-edge-strong",
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
          <p className="text-ink-3 text-sm mt-1">Last 50 simulation runs</p>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-ok-edge bg-ok-wash px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ok" />
              </span>
              <span className="text-xs font-semibold text-ok">{activeCount} live</span>
            </div>
          )}
          <span className="text-xs text-ink-3">{totalCount} total</span>
        </div>
      </div>

      <div className="rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">User</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Scenario</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Stage</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Score</th>
              <th className="text-center px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Status</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {sessions.map((s) => (
              <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{s.user.displayName ?? s.user.email.split("@")[0]}</p>
                  <p className="text-xs text-ink-3">{s.user.email}</p>
                </td>
                <td className="px-4 py-3 text-ink-2">{s.template.name}</td>
                <td className="px-4 py-3 text-xs text-ink-3 font-mono">{s.currentStage}</td>
                <td className="px-4 py-3 text-right font-bold text-ink tabular-nums">{s.score ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.ABANDONED}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-ink-3 font-mono">
                  {s.startedAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="text-center py-16 text-ink-3 text-sm">No sessions yet.</div>
        )}
      </div>
    </div>
  );
}
