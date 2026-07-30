import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { buildWorldState } from "@/lib/simulation/engine";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";

export const dynamic = "force-dynamic";

type MitreMiss = { id: string; name: string; tactic: string; count: number };

function diffColor(d: string) {
  if (d === "HARD" || d === "INSANE") return "text-red-400";
  if (d === "MEDIUM") return "text-amber-400";
  return "text-zinc-500";
}

function formatTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.round((sec % 3600) / 60)}m`;
}

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_COLOR: Record<string, string> = {
  EXCEPTIONAL: "text-sage-400",
  STRONG:      "text-blue-400",
  ADEQUATE:    "text-amber-400",
  DEVELOPING:  "text-orange-400",
};

export default async function InstructorAnalyticsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") redirect("/dashboard");

  // All classrooms owned by this instructor
  const classrooms = await db.classroom.findMany({
    where: { instructorId: user.id },
    include: {
      enrollments: { include: { user: { select: { id: true, displayName: true, email: true, skillScore: true } } } },
      assignments: { include: { lab: { select: { title: true, difficulty: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const studentIds = [...new Set(classrooms.flatMap((c) => c.enrollments.map((e) => e.userId)))];
  const totalStudents = studentIds.length;
  const totalClassrooms = classrooms.length;

  const assignedLabIds = [...new Set(classrooms.flatMap((c) => c.assignments.map((a) => a.labId)))];

  // Fetch all completed sim sessions for these students
  const sessions = studentIds.length > 0
    ? await db.simulationSession.findMany({
        where: { userId: { in: studentIds }, status: { in: ["CONTAINED", "BREACHED"] } },
        include: {
          template: { select: { name: true, slug: true } },
          events: { orderBy: { createdAt: "asc" } },
          user: { select: { id: true, displayName: true, email: true } },
        },
        orderBy: { endedAt: "desc" },
      })
    : [];

  // Lab attempts for enrolled students on assigned labs
  const labAttempts = assignedLabIds.length > 0 && studentIds.length > 0
    ? await db.attempt.findMany({
        where: { labId: { in: assignedLabIds }, userId: { in: studentIds } },
        select: {
          labId: true, userId: true, status: true,
          timeTakenSec: true, startedAt: true,
          lab: { select: { title: true, difficulty: true } },
        },
      })
    : [];

  // Per-lab stats
  type LabStat = { title: string; difficulty: string; attempts: number; solved: number; inProgress: number; times: number[] };
  const labStatMap = new Map<string, LabStat>();
  for (const a of labAttempts) {
    if (!labStatMap.has(a.labId)) {
      labStatMap.set(a.labId, { title: a.lab.title, difficulty: a.lab.difficulty, attempts: 0, solved: 0, inProgress: 0, times: [] });
    }
    const s = labStatMap.get(a.labId)!;
    s.attempts++;
    if (a.status === "SOLVED") { s.solved++; if (a.timeTakenSec) s.times.push(a.timeTakenSec); }
    if (a.status === "IN_PROGRESS") s.inProgress++;
  }
  const labStats = [...labStatMap.values()]
    .map((s) => ({
      ...s,
      solveRate: s.attempts > 0 ? Math.round((s.solved / s.attempts) * 100) : 0,
      avgTimeSec: s.times.length > 0 ? Math.round(s.times.reduce((a, b) => a + b, 0) / s.times.length) : null,
    }))
    .sort((a, b) => a.solveRate - b.solveRate); // hardest first

  // Best session per student
  const bestByStudent = new Map<string, (typeof sessions)[0]>();
  for (const s of sessions) {
    const existing = bestByStudent.get(s.userId);
    if (!existing || s.score > existing.score) bestByStudent.set(s.userId, s);
  }

  const scores = [...bestByStudent.values()].map((s) => s.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const containedCount = [...bestByStudent.values()].filter((s) => s.status === "CONTAINED").length;
  const containmentRate = scores.length > 0 ? Math.round((containedCount / scores.length) * 100) : null;

  // Rating distribution
  const dist = { EXCEPTIONAL: 0, STRONG: 0, ADEQUATE: 0, DEVELOPING: 0 };
  for (const score of scores) dist[toRating(score) as keyof typeof dist]++;

  // Most missed MITRE techniques — build debriefs, collect misses
  const missMap = new Map<string, MitreMiss>();
  for (const s of sessions) {
    if (!s.template.slug) continue;
    try {
      const ws = buildWorldState(s.events);
      const outcome = s.status as "CONTAINED" | "BREACHED";
      const timedEvents = s.events.map((e) => ({
        id: e.id, type: e.type, actor: e.actor, payload: e.payload,
        narrative: e.narrative, createdAt: e.createdAt.toISOString(),
      }));
      const debrief = buildDebrief(s.template.slug, timedEvents, outcome, ws.score);
      // Count MITRE techniques from stages where the student missed the containment opportunity
      const missedStages = new Set(debrief.missedOpportunities.map((mo) => mo.stage));
      for (const t of debrief.mitreTechniques) {
        // Only count a technique as "missed" if it came from a stage with missed containment
        if (missedStages.size > 0 || outcome === "BREACHED") {
          const existing = missMap.get(t.id);
          if (existing) existing.count++;
          else missMap.set(t.id, { id: t.id, name: t.name, tactic: t.tactic, count: 1 });
        }
      }
    } catch { /* skip if template not found */ }
  }

  const topMissed = [...missMap.values()].sort((a, b) => b.count - a.count).slice(0, 8);

  // Students at risk — enrolled but no SOLVED attempts, or stuck (IN_PROGRESS > 0, SOLVED = 0)
  type AtRiskStudent = {
    userId: string; displayName: string | null; email: string;
    inProgress: number; solved: number; oldest: Date | null;
  };
  const atRiskMap = new Map<string, AtRiskStudent>();

  // Seed from enrolled students
  for (const c of classrooms) {
    for (const e of c.enrollments) {
      if (!atRiskMap.has(e.userId)) {
        atRiskMap.set(e.userId, {
          userId: e.userId,
          displayName: e.user.displayName,
          email: e.user.email,
          inProgress: 0, solved: 0, oldest: null,
        });
      }
    }
  }
  for (const a of labAttempts) {
    const s = atRiskMap.get(a.userId);
    if (!s) continue;
    if (a.status === "SOLVED") s.solved++;
    if (a.status === "IN_PROGRESS") {
      s.inProgress++;
      if (!s.oldest || a.startedAt < s.oldest) s.oldest = a.startedAt;
    }
  }

  const atRisk = [...atRiskMap.values()]
    .filter((s) => s.solved === 0 && s.inProgress > 0)
    .sort((a, b) => (a.oldest?.getTime() ?? 0) - (b.oldest?.getTime() ?? 0))
    .slice(0, 10);

  // Top performers (by best sim score)
  const topPerformers = [...bestByStudent.entries()]
    .map(([, s]) => ({ user: s.user, score: s.score, scenario: s.template.name, status: s.status }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Per-classroom summary
  const classroomSummaries = classrooms.map((c) => {
    const cStudentIds = c.enrollments.map((e) => e.userId);
    const cScores = cStudentIds.map((id) => bestByStudent.get(id)?.score).filter((s): s is number => s !== undefined);
    const cAvg = cScores.length > 0 ? Math.round(cScores.reduce((a, b) => a + b, 0) / cScores.length) : null;
    return { id: c.id, name: c.name, students: cStudentIds.length, avgScore: cAvg, labCount: c.assignments.length };
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

          {/* Header */}
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-1">Instructor Analytics</p>
            <h1 className="text-3xl font-bold">Platform Overview</h1>
            <p className="text-zinc-400 text-sm mt-1">Aggregate performance across all your classrooms</p>
          </div>

          {/* Top-line stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Classrooms",      value: totalClassrooms, color: "text-blue-400" },
              { label: "Total Students",  value: totalStudents,   color: "text-zinc-100" },
              { label: "Avg Sim Score",   value: avgScore !== null ? avgScore : "—", color: avgScore !== null && avgScore >= 68 ? "text-sage-400" : "text-amber-400" },
              { label: "Containment Rate", value: containmentRate !== null ? `${containmentRate}%` : "—", color: containmentRate !== null && containmentRate >= 60 ? "text-sage-400" : "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Assessment distribution */}
          {scores.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Assessment Distribution</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["EXCEPTIONAL", "STRONG", "ADEQUATE", "DEVELOPING"] as const).map((r) => {
                  const pct = scores.length > 0 ? Math.round((dist[r] / scores.length) * 100) : 0;
                  return (
                    <div key={r} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
                      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${RATING_COLOR[r]}`}>{r}</p>
                      <p className="text-3xl font-bold text-white">{dist[r]}</p>
                      <p className="text-xs text-zinc-500 mt-1">{pct}% of students</p>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mt-2">
                        <div className={`h-full rounded-full ${RATING_COLOR[r].replace("text", "bg")}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top performers */}
            <section>
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Top Performers</h2>
              {topPerformers.length === 0 ? (
                <p className="text-zinc-600 text-sm italic">No simulation data yet.</p>
              ) : (
                <div className="rounded-xl border border-white/8 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                        <th className="text-left p-3 pl-4">#</th>
                        <th className="text-left p-3">Student</th>
                        <th className="text-left p-3">Scenario</th>
                        <th className="text-right p-3 pr-4">Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {topPerformers.map((p, i) => {
                        const r = toRating(p.score);
                        return (
                          <tr key={p.user.id} className="hover:bg-white/3 transition">
                            <td className="p-3 pl-4 text-zinc-600 text-xs">{i + 1}</td>
                            <td className="p-3">
                              <p className="font-medium">{p.user.displayName ?? p.user.email?.split("@")[0]}</p>
                              <p className={`text-[10px] font-bold ${RATING_COLOR[r]}`}>{r}</p>
                            </td>
                            <td className="p-3 text-xs text-zinc-500 truncate max-w-[140px]">{p.scenario}</td>
                            <td className={`p-3 pr-4 text-right font-bold ${p.status === "CONTAINED" ? "text-sage-400" : "text-red-400"}`}>
                              {p.score}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Most missed MITRE techniques */}
            <section>
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Most Missed Techniques</h2>
              {topMissed.length === 0 ? (
                <p className="text-zinc-600 text-sm italic">No miss data yet.</p>
              ) : (
                <div className="space-y-2">
                  {topMissed.map((t) => (
                    <div key={t.id} className="rounded-lg border border-white/8 bg-zinc-900/40 px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-mono text-[10px] text-zinc-500">{t.id}</span>
                          <span className="text-[10px] text-zinc-600">{t.tactic}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{t.name}</p>
                      </div>
                      <span className="shrink-0 text-xs text-red-400 font-semibold border border-red-500/30 bg-red-500/8 rounded px-2 py-0.5">
                        ×{t.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Lab Performance */}
          <section>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Lab Performance</h2>
            {labStats.length === 0 ? (
              <p className="text-zinc-600 text-sm italic">No lab attempts from your students yet.</p>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="text-left p-3 pl-4">Lab</th>
                      <th className="text-center p-3">Attempts</th>
                      <th className="text-center p-3">Solved</th>
                      <th className="text-center p-3 min-w-[100px]">Solve Rate</th>
                      <th className="text-center p-3">Stuck</th>
                      <th className="text-right p-3 pr-4">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {labStats.map((lab) => {
                      const rateColor = lab.solveRate >= 70 ? "text-sage-400" : lab.solveRate >= 40 ? "text-amber-400" : "text-red-400";
                      const barColor  = lab.solveRate >= 70 ? "bg-sage-500"  : lab.solveRate >= 40 ? "bg-amber-500"  : "bg-red-500";
                      return (
                        <tr key={lab.title} className="hover:bg-white/3 transition">
                          <td className="p-3 pl-4">
                            <p className="font-medium text-zinc-100">{lab.title}</p>
                            <span className={`text-[10px] font-mono ${diffColor(lab.difficulty)}`}>{lab.difficulty}</span>
                          </td>
                          <td className="p-3 text-center text-zinc-400">{lab.attempts}</td>
                          <td className="p-3 text-center text-zinc-400">{lab.solved}</td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`font-bold text-xs ${rateColor}`}>{lab.solveRate}%</span>
                              <div className="h-1 w-16 rounded-full bg-zinc-800">
                                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${lab.solveRate}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {lab.inProgress > 0
                              ? <span className="text-amber-400 font-bold text-xs">{lab.inProgress}</span>
                              : <span className="text-zinc-700">—</span>}
                          </td>
                          <td className="p-3 pr-4 text-right text-xs text-zinc-500">
                            {lab.avgTimeSec ? formatTime(lab.avgTimeSec) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-white/5 px-4 py-2 text-[10px] text-zinc-600 flex gap-4">
                  <span>Sorted by solve rate ascending (hardest first)</span>
                  <span>·</span>
                  <span>Stuck = students still IN_PROGRESS</span>
                  <span>·</span>
                  <span>Avg Time = time to solve for successful attempts</span>
                </div>
              </div>
            )}
          </section>

          {/* Students at Risk */}
          {atRisk.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm uppercase tracking-widest text-zinc-500">Students at Risk</h2>
                <span className="text-[10px] font-bold uppercase tracking-widest border border-amber-500/30 bg-amber-500/8 text-amber-400 rounded px-2 py-0.5">
                  {atRisk.length} stuck
                </span>
              </div>
              <div className="rounded-xl border border-amber-500/15 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="text-left p-3 pl-4">Student</th>
                      <th className="text-center p-3">Labs In Progress</th>
                      <th className="text-center p-3">Labs Solved</th>
                      <th className="text-right p-3 pr-4">Oldest Attempt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {atRisk.map((s) => {
                      const daysSince = s.oldest
                        ? Math.floor((Date.now() - s.oldest.getTime()) / 86_400_000)
                        : null;
                      return (
                        <tr key={s.userId} className="hover:bg-white/3 transition">
                          <td className="p-3 pl-4">
                            <p className="font-medium text-zinc-100">{s.displayName ?? s.email.split("@")[0]}</p>
                            <p className="text-[10px] text-zinc-600">{s.email}</p>
                          </td>
                          <td className="p-3 text-center text-amber-400 font-bold">{s.inProgress}</td>
                          <td className="p-3 text-center text-zinc-600">{s.solved}</td>
                          <td className="p-3 pr-4 text-right text-xs text-zinc-500">
                            {daysSince !== null ? `${daysSince}d ago` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-white/5 px-4 py-2 text-[10px] text-zinc-600">
                  Students with ≥1 in-progress lab and 0 solves · sorted by oldest attempt
                </div>
              </div>
            </section>
          )}

          {/* Per-classroom breakdown */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-widest text-zinc-500">Classroom Breakdown</h2>
              <Link href="/classroom" className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                Manage Classrooms →
              </Link>
            </div>
            {classroomSummaries.length === 0 ? (
              <p className="text-zinc-600 text-sm italic">No classrooms yet.</p>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="text-left p-3 pl-4">Classroom</th>
                      <th className="text-center p-3">Students</th>
                      <th className="text-center p-3">Labs Assigned</th>
                      <th className="text-center p-3">Avg Sim Score</th>
                      <th className="text-right p-3 pr-4">Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {classroomSummaries.map((c) => (
                      <tr key={c.id} className="hover:bg-white/3 transition">
                        <td className="p-3 pl-4 font-medium">
                          <Link href={`/classroom/${c.id}`} className="hover:text-blue-400 transition">{c.name}</Link>
                        </td>
                        <td className="p-3 text-center text-zinc-400">{c.students}</td>
                        <td className="p-3 text-center text-zinc-400">{c.labCount}</td>
                        <td className="p-3 text-center">
                          {c.avgScore !== null ? (
                            <span className={`font-bold ${c.avgScore >= 68 ? "text-sage-400" : c.avgScore >= 48 ? "text-amber-400" : "text-red-400"}`}>
                              {c.avgScore}
                            </span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <Link href={`/classroom/${c.id}/report`} className="text-xs text-zinc-500 hover:text-zinc-300 transition">
                            Print →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </main>
    </>
  );
}
