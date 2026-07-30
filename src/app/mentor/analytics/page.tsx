import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

export default async function MentorAnalytics() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") redirect("/dashboard");

  // ── Pending reviews ────────────────────────────────────────────────────────
  const pendingReviews = await db.assessmentSubmission.count({
    where: { review: null },
  });

  // ── Students at risk: started module but inactive 7+ days ─────────────────
  const activeProgress = await db.userModuleProgress.findMany({
    where: { completedAt: null, startedAt: { lt: SEVEN_DAYS_AGO } },
    include: { user: { select: { id: true, displayName: true, email: true } }, module: { select: { title: true, path: { select: { title: true } } } } },
    orderBy: { startedAt: "asc" },
    take: 50,
  });

  // Deduplicate by userId (one row per at-risk student)
  const atRiskMap = new Map<string, typeof activeProgress[0]>();
  for (const p of activeProgress) {
    if (!atRiskMap.has(p.userId)) atRiskMap.set(p.userId, p);
  }
  const atRiskStudents = Array.from(atRiskMap.values());

  // ── Average quiz scores per module ────────────────────────────────────────
  const quizStats = await db.quizAttempt.groupBy({
    by: ["quizId"],
    _avg: { score: true },
    _count: { id: true },
  });

  const quizIds = quizStats.map((q) => q.quizId);
  const quizzes = await db.quiz.findMany({
    where: { id: { in: quizIds } },
    include: { module: { select: { title: true, path: { select: { title: true } } } } },
  });
  const quizMap = new Map(quizzes.map((q) => [q.id, q]));

  const moduleQuizStats = quizStats
    .map((s) => ({
      quiz: quizMap.get(s.quizId),
      avg: Math.round(s._avg.score ?? 0),
      attempts: s._count.id,
    }))
    .filter((s) => s.quiz)
    .sort((a, b) => a.avg - b.avg); // Worst first

  // ── Overall completion stats ───────────────────────────────────────────────
  const totalStudents = await db.user.count({ where: { role: "STUDENT" } });
  const studentsWithProgress = await db.userModuleProgress.groupBy({
    by: ["userId"],
  });

  const completedPathsCount = await db.userPathProgress.count({ where: { completedAt: { not: null } } });
  const submittedAssessments = await db.assessmentSubmission.count();
  const approvedAssessments = await db.mentorReview.count({ where: { status: "APPROVED" } });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/mentor" backLabel="Review Queue" />

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Mentor Analytics</h1>
          <p className="text-zinc-400 text-sm mt-1">Track student engagement and identify who needs support</p>
        </header>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Pending Reviews", value: pendingReviews, color: pendingReviews > 0 ? "text-amber-400" : "text-sage-400", alert: pendingReviews > 5 },
            { label: "At Risk Students", value: atRiskStudents.length, color: atRiskStudents.length > 0 ? "text-orange-400" : "text-sage-400", alert: atRiskStudents.length > 0 },
            { label: "Paths Completed", value: completedPathsCount, color: "text-sage-400", alert: false },
            { label: "Approvals / Submissions", value: `${approvedAssessments}/${submittedAssessments}`, color: "text-blue-400", alert: false },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-xl border p-5 ${kpi.alert ? "border-amber-500/30 bg-amber-500/5" : "border-white/8"}`}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{kpi.label}</p>
              <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* At risk students */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
            Students At Risk — Inactive 7+ Days ({atRiskStudents.length})
          </h2>
          {atRiskStudents.length === 0 ? (
            <p className="text-sm text-zinc-600 rounded-xl border border-white/8 p-6 text-center">
              No at-risk students. All students engaged in the last 7 days.
            </p>
          ) : (
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/2">
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Student</th>
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Stuck On</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Days Inactive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {atRiskStudents.map((p) => {
                    const days = Math.floor((Date.now() - p.startedAt.getTime()) / 86400000);
                    return (
                      <tr key={p.userId} className="hover:bg-white/2 transition">
                        <td className="px-4 py-3">
                          <Link href={`/profile/${p.userId}`} className="text-zinc-200 hover:text-sage-400 transition font-medium">
                            {p.user.displayName ?? p.user.email.split("@")[0]}
                          </Link>
                          <p className="text-xs text-zinc-600">{p.user.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-400">
                          {p.module.path.title} → {p.module.title}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold ${days >= 14 ? "text-red-400" : "text-amber-400"}`}>
                            {days}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quiz scores by module */}
        {moduleQuizStats.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Average Quiz Scores by Module</h2>
            <div className="rounded-xl border border-white/8 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 bg-white/2">
                    <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Module</th>
                    <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Avg Score</th>
                    <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/4">
                  {moduleQuizStats.map(({ quiz, avg, attempts }) => (
                    <tr key={quiz!.id} className="hover:bg-white/2 transition">
                      <td className="px-4 py-3">
                        <p className="text-zinc-200 text-sm">{quiz!.module.title}</p>
                        <p className="text-xs text-zinc-600">{quiz!.module.path.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-1.5 w-20 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${avg >= 70 ? "bg-sage-500" : avg >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-9 text-right ${avg >= 70 ? "text-sage-400" : avg >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            {avg}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-500">{attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
