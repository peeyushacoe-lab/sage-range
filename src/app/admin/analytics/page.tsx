import { buildInstructorAnalytics } from "@/lib/insights/instructor-analytics";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Admin" };

function Pct({ value }: { value: number | null }) {
  if (value === null) return <span className="text-zinc-700">—</span>;
  const color = value >= 70 ? "text-sage-400" : value >= 40 ? "text-amber-400" : "text-red-400";
  return <span className={color}>{value}%</span>;
}

function fmtMin(sec: number | null) {
  if (sec === null) return "—";
  const m = Math.round(sec / 60);
  return m < 1 ? `${sec}s` : `${m}m`;
}

export default async function AdminAnalyticsPage() {
  const a = await buildInstructorAnalytics();

  return (
    <div className="p-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white">Learning Analytics</h1>
        <p className="text-zinc-500 text-sm mt-1">Cohort-wide outcomes across every lab and Boss Fight — recomputed live from attempt history.</p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ["Students", a.totals.students],
          ["Lab attempts", a.totals.labAttempts],
          ["Boss Fights passed", a.totals.bossFightsCompleted],
          ["Avg MITRE coverage", `${a.totals.avgMitreCoveragePct}%`],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Labs — hardest first */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Labs — sorted hardest first (lowest first-attempt success)</h2>
        <div className="rounded-xl border border-white/8 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Lab</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Attempts</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Solved</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Mean time</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">1st-try success</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Hint usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {a.labStats.map((l) => (
                <tr key={l.slug} className="hover:bg-white/2">
                  <td className="px-4 py-2.5">
                    <p className="text-zinc-200">{l.title}</p>
                    <p className="text-xs text-zinc-600 font-mono">{l.slug}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{l.attempts}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{l.solved}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{fmtMin(l.meanTimeToCompleteSec)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums"><Pct value={l.firstAttemptSuccessRate} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums"><Pct value={l.hintUsageRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Boss Fights — lowest completion first */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Boss Fights — sorted by lowest completion rate</h2>
        <div className="rounded-xl border border-white/8 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Simulation</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Started</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Completed</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Completion</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Mean time</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">1st-try success</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Hint usage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {a.bossFightStats.map((b) => (
                <tr key={b.slug} className="hover:bg-white/2">
                  <td className="px-4 py-2.5">
                    <p className="text-zinc-200">{b.title}</p>
                    <p className="text-xs text-zinc-600 font-mono">{b.slug}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{b.studentsStarted}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{b.studentsCompleted}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums"><Pct value={b.completionRate} /></td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{b.meanTimeToCompleteMin ? `${b.meanTimeToCompleteMin}m` : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums"><Pct value={b.firstAttemptSuccessRate} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums"><Pct value={b.hintUsageRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Learning Paths */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Learning Paths</h2>
        <div className="rounded-xl border border-white/8 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Path</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Enrolled</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Completed</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Completion rate</th>
                <th className="text-right px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">Capstone pass rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {a.pathStats.map((p) => (
                <tr key={p.slug} className="hover:bg-white/2">
                  <td className="px-4 py-2.5 text-zinc-200">{p.title}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{p.enrolled}</td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">{p.completed}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums"><Pct value={p.completionRate} /></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {p.capstoneSlug ? <Pct value={p.capstonePassRate} /> : <span className="text-zinc-700">no capstone</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MITRE cohort gaps */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">MITRE ATT&amp;CK — weakest tactics cohort-wide</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {a.mitreGapsCohort.map((m) => (
            <div key={m.tactic} className="rounded-lg border border-white/6 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-zinc-300">{m.tactic}</span>
              <span className="text-xs text-zinc-500">
                {m.studentsWithCoverage}/{m.totalStudents} students — <Pct value={m.coveragePct} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly trend */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Improvement over time — last 8 weeks</h2>
        {a.weeklyTrend.length === 0 ? (
          <p className="text-sm text-zinc-600">Not enough submission history yet.</p>
        ) : (
          <div className="rounded-xl border border-white/8 p-4 flex items-end gap-2 h-40">
            {a.weeklyTrend.map((w) => (
              <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] text-zinc-500">{w.successRate}%</span>
                <div className="w-full bg-sage-500/70 rounded-t" style={{ height: `${Math.max(4, w.successRate)}%` }} />
                <span className="text-[9px] text-zinc-700 rotate-0">{w.weekStart.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
