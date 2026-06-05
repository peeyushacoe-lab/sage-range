import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { buildWorldState } from "@/lib/simulation/engine";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";

export const dynamic = "force-dynamic";

type MitreMiss = { id: string; name: string; tactic: string; count: number };

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
