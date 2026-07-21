import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Stats · Sage Vault" };

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtTime(sec: number | null): string {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function calcStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diff = (prev.getTime() - curr.getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function buildHeatmap(dates: Date[]): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  dates.forEach((d) => {
    const key = d.toISOString().slice(0, 10);
    counts[key] = (counts[key] ?? 0) + 1;
  });
  const cells: { date: string; count: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    cells.push({ date: d, count: counts[d] ?? 0 });
  }
  return cells;
}

function heatColor(n: number): string {
  if (n === 0) return "#18181b";
  if (n === 1) return "#14532d";
  if (n <= 3) return "#166534";
  if (n <= 6) return "#16a34a";
  return "#22c55e";
}

// ── page ──────────────────────────────────────────────────────────────────────

export default async function StatsPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const [attempts, simSessions, hintsUsed] = await Promise.all([
    db.attempt.findMany({
      where: { userId: me.id },
      include: { lab: { select: { type: true, difficulty: true, title: true } } },
      orderBy: { startedAt: "desc" },
    }),
    db.simulationSession.findMany({
      where: { userId: me.id },
      include: { template: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
    }),
    db.usedHint.count({ where: { userId: me.id } }),
  ]);

  const solved = attempts.filter((a) => a.status === "SOLVED");
  const completedSims = simSessions.filter((s) => s.status === "CONTAINED" || s.status === "BREACHED");

  // Core stats
  const totalAttempted = attempts.length;
  const totalSolved = solved.length;
  const completionRate = totalAttempted ? Math.round((totalSolved / totalAttempted) * 100) : 0;

  const solvedWithTime = solved.filter((a) => a.timeTakenSec);
  const avgSolveTime = solvedWithTime.length
    ? Math.round(solvedWithTime.reduce((s, a) => s + (a.timeTakenSec ?? 0), 0) / solvedWithTime.length)
    : null;

  const ctfSolved = solved.filter((a) => a.lab.type === "CTF" && a.timeTakenSec);
  const fastestCTF = ctfSolved.length ? Math.min(...ctfSolved.map((a) => a.timeTakenSec!)) : null;

  const avgSimScore = completedSims.length
    ? Math.round(completedSims.reduce((s, x) => s + (x.score ?? 0), 0) / completedSims.length)
    : null;

  const bestSimScore = completedSims.length ? Math.max(...completedSims.map((s) => s.score ?? 0)) : null;
  const totalPoints = solved.reduce((s, a) => s + a.score, 0);

  // Streak
  const activityDates = [
    ...attempts.map((a) => a.startedAt),
    ...simSessions.map((s) => s.startedAt),
  ];
  const streak = calcStreak(activityDates);
  const heatmap = buildHeatmap(activityDates);

  // Breakdowns
  const byType = {
    CTF: solved.filter((a) => a.lab.type === "CTF").length,
    BLUE_TEAM: solved.filter((a) => a.lab.type === "BLUE_TEAM").length,
    RED_TEAM: solved.filter((a) => a.lab.type === "RED_TEAM").length,
  };
  const byDiff = {
    EASY: solved.filter((a) => a.lab.difficulty === "EASY").length,
    MEDIUM: solved.filter((a) => a.lab.difficulty === "MEDIUM").length,
    HARD: solved.filter((a) => a.lab.difficulty === "HARD").length,
    INSANE: solved.filter((a) => a.lab.difficulty === "INSANE").length,
  };
  const maxByType = Math.max(...Object.values(byType), 1);
  const maxByDiff = Math.max(...Object.values(byDiff), 1);

  // Heatmap weeks
  const weeks: { date: string; count: number }[][] = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  const bigStats = [
    { label: "Labs Solved",       value: totalSolved,             sub: `of ${totalAttempted} attempted` },
    { label: "Completion Rate",   value: `${completionRate}%`,    sub: "labs finished" },
    { label: "Avg Solve Time",    value: fmtTime(avgSolveTime),   sub: "per lab" },
    { label: "Fastest CTF",       value: fmtTime(fastestCTF),     sub: "personal best" },
    { label: "Flags Captured",    value: totalSolved,             sub: "verified solves" },
    { label: "Hints Used",        value: hintsUsed,               sub: "across all labs" },
    { label: "Avg Sim Score",     value: avgSimScore !== null ? `${avgSimScore}` : "—", sub: "out of 100" },
    { label: "Current Streak",    value: `${streak}d`,            sub: streak > 0 ? "keep it up" : "start today" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Personal Statistics</p>
          <h1 className="text-2xl font-bold">{me.displayName ?? me.email.split("@")[0]}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {totalPoints.toLocaleString()} total points · Skill score {me.skillScore}
          </p>
        </div>

        {/* Big stat grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {bigStats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{s.label}</p>
              <p className="text-3xl font-black tabular-nums text-zinc-100">{s.value}</p>
              <p className="text-xs text-zinc-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Activity heatmap */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Activity — Last 52 Weeks</p>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell) => (
                    <div
                      key={cell.date}
                      title={`${cell.date}${cell.count ? ` · ${cell.count} activities` : ""}`}
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: heatColor(cell.count) }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-zinc-600">Less</span>
            {[0, 1, 3, 6, 8].map((n) => (
              <div key={n} className="w-3 h-3 rounded-sm" style={{ backgroundColor: heatColor(n) }} />
            ))}
            <span className="text-[10px] text-zinc-600">More</span>
          </div>
        </div>

        {/* Breakdown charts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* By type */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Labs by Type</p>
            <div className="space-y-3">
              {[
                { label: "CTF",       value: byType.CTF,       color: "bg-emerald-500" },
                { label: "Blue Team", value: byType.BLUE_TEAM, color: "bg-blue-500" },
                { label: "Red Team",  value: byType.RED_TEAM,  color: "bg-red-500" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">{r.label}</span>
                    <span className="text-zinc-300 font-bold tabular-nums">{r.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${r.color} transition-all`}
                      style={{ width: `${Math.round((r.value / maxByType) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By difficulty */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Labs by Difficulty</p>
            <div className="space-y-3">
              {[
                { label: "Easy",   value: byDiff.EASY,   color: "bg-emerald-500" },
                { label: "Medium", value: byDiff.MEDIUM, color: "bg-amber-500" },
                { label: "Hard",   value: byDiff.HARD,   color: "bg-red-500" },
                { label: "Insane", value: byDiff.INSANE, color: "bg-purple-500" },
              ].map((r) => (
                <div key={r.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-400">{r.label}</span>
                    <span className="text-zinc-300 font-bold tabular-nums">{r.value}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${r.color} transition-all`}
                      style={{ width: `${Math.round((r.value / maxByDiff) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Simulation history */}
        {completedSims.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Simulation History</p>
              <div className="flex gap-4 text-xs text-zinc-500">
                <span>Best: <span className="text-emerald-400 font-bold">{bestSimScore}</span></span>
                <span>Avg: <span className="text-zinc-300 font-bold">{avgSimScore}</span></span>
                <span>Total: <span className="text-zinc-300 font-bold">{completedSims.length}</span></span>
              </div>
            </div>
            <div className="space-y-2">
              {completedSims.slice(0, 10).map((s) => {
                const score = s.score ?? 0;
                const outcome = s.status === "CONTAINED" ? "CONTAINED" : "BREACHED";
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400 truncate">{s.template.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${outcome === "CONTAINED" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/8" : "text-red-400 border-red-500/30 bg-red-500/8"}`}>
                            {outcome}
                          </span>
                          <span className="text-xs font-bold tabular-nums text-zinc-200 w-8 text-right">{score}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent solved labs */}
        {solved.length > 0 && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 pb-6">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Recently Solved</p>
            <div className="divide-y divide-white/5">
              {solved.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-emerald-500 text-xs shrink-0">✓</span>
                    <span className="text-sm text-zinc-300 truncate">{a.lab.title}</span>
                    <span className="text-[10px] text-zinc-600 uppercase font-mono shrink-0">{a.lab.type.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    {a.timeTakenSec && <span className="text-xs text-zinc-500 tabular-nums">{fmtTime(a.timeTakenSec)}</span>}
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      a.lab.difficulty === "EASY"   ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/8" :
                      a.lab.difficulty === "MEDIUM" ? "text-amber-400 border-amber-500/20 bg-amber-500/8" :
                      a.lab.difficulty === "HARD"   ? "text-red-400 border-red-500/20 bg-red-500/8" :
                                                      "text-purple-400 border-purple-500/20 bg-purple-500/8"
                    }`}>{a.lab.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
