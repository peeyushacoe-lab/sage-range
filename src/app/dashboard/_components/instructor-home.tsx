import Link from "next/link";
import { db } from "@/lib/db";
import type { AppUser } from "@/lib/current-user";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

export async function InstructorHome({ user }: { user: AppUser }) {
  const classrooms = await db.classroom.findMany({
    where: { instructorId: user.id },
    include: {
      _count: { select: { enrollments: true, assignments: true } },
      enrollments: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const studentIds = [...new Set(classrooms.flatMap((c) => c.enrollments.map((e) => e.userId)))];

  const [labProgress, simSessions, totalAssignments] = await Promise.all([
    studentIds.length > 0
      ? db.labResponse.groupBy({
          by: ["userId"],
          where: { userId: { in: studentIds } },
          _count: { id: true },
        })
      : Promise.resolve([]),
    studentIds.length > 0
      ? db.simulationSession.findMany({
          where: { userId: { in: studentIds }, status: { in: ["CONTAINED", "BREACHED"] } },
          select: { userId: true, score: true },
          orderBy: { score: "desc" },
        })
      : Promise.resolve([]),
    db.classroomLabAssignment.count({ where: { classroomId: { in: classrooms.map((c) => c.id) } } }),
  ]);

  const simByUser = new Map<string, number>();
  for (const s of (simSessions as { userId: string; score: number | null }[])) {
    const sc = s.score ?? 0;
    if (sc > (simByUser.get(s.userId) ?? 0)) simByUser.set(s.userId, sc);
  }

  const simCompletedCount = simByUser.size;

  // Top sim performers from enrolled students
  const topPerformers = [...simByUser.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Get names for top performers
  const topIds = topPerformers.map(([id]) => id);
  const topUsers = topIds.length > 0
    ? await db.user.findMany({ where: { id: { in: topIds } }, select: { id: true, displayName: true, email: true } })
    : [];
  const topUserMap = new Map(topUsers.map((u) => [u.id, u]));

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Instructor Hub</p>
          <h1 className="text-2xl font-bold text-zinc-100">{user.displayName ?? user.email.split("@")[0]}</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage classrooms, track student progress, and run exercises.</p>
        </div>
        <Link href="/classroom"
          className="rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-400 transition">
          Open Classroom Hub →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Classrooms", value: classrooms.length, color: "text-zinc-100" },
          { label: "Total Students", value: studentIds.length, color: "text-blue-400" },
          { label: "Lab Assignments", value: totalAssignments, color: "text-sage-400" },
          { label: "Completed Sims", value: simCompletedCount, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Classrooms */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">My Classrooms</h2>
          <Link href="/classroom" className="text-xs text-blue-400 hover:text-blue-300 transition">Manage all →</Link>
        </div>
        {classrooms.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-8 text-center">
            <p className="text-zinc-500 text-sm mb-3">No classrooms yet.</p>
            <Link href="/classroom" className="text-xs text-blue-400 hover:underline">Create your first classroom →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classrooms.map((c) => (
              <Link key={c.id} href={`/classroom/${c.id}`}
                className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 hover:border-white/20 hover:bg-zinc-800/40 transition block">
                <p className="font-semibold text-zinc-100 text-sm mb-1">{c.name}</p>
                <p className="text-xs text-zinc-500 font-mono mb-3">Code: {c.joinCode}</p>
                <div className="flex gap-4 text-xs text-zinc-400">
                  <span><span className="font-bold text-blue-400">{c._count.enrollments}</span> students</span>
                  <span><span className="font-bold text-sage-400">{c._count.assignments}</span> labs</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top simulation performers */}
      <section className="pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Top Simulation Performers</h2>
          {classrooms.length > 0 && (
            <Link href={`/classroom/${classrooms[0].id}/report`} className="text-xs text-blue-400 hover:text-blue-300 transition">Full report →</Link>
          )}
        </div>
        {topPerformers.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-6 text-center">
            <p className="text-zinc-500 text-sm">No students have completed a simulation yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-zinc-500 text-xs uppercase tracking-wider bg-zinc-900/50">
                  <th className="text-left p-4">Rank</th>
                  <th className="text-left p-4">Student</th>
                  <th className="text-center p-4">Assessment</th>
                  <th className="text-right p-4">Best Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topPerformers.map(([userId, score], idx) => {
                  const u = topUserMap.get(userId);
                  const rating = toRating(score);
                  return (
                    <tr key={userId} className="hover:bg-zinc-900/50 transition">
                      <td className="p-4 text-zinc-500 font-mono">{idx + 1}</td>
                      <td className="p-4">
                        <p className="font-medium text-zinc-100">{u?.displayName ?? u?.email.split("@")[0] ?? userId}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-bold uppercase border rounded px-2 py-0.5 ${
                          rating === "EXCEPTIONAL" ? "text-sage-400 border-sage-500/40 bg-sage-500/8" :
                          rating === "STRONG"      ? "text-blue-400 border-blue-500/40 bg-blue-500/8" :
                          rating === "ADEQUATE"    ? "text-amber-400 border-amber-500/40 bg-amber-500/8" :
                                                     "text-zinc-400 border-zinc-600 bg-zinc-800"
                        }`}>{rating}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-sage-400">{score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
