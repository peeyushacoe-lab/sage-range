import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { canViewOrgMember } from "@/lib/org-access";
import { db } from "@/lib/db";
import { getRankInfo, RANK_BADGE_CLASS } from "@/lib/cyber-identity";
import { RankLegend } from "@/components/insights/rank-legend";
import { computeSkillRadar } from "@/lib/insights/skills";
import { computeMitreCoverage } from "@/lib/insights/mitre";
import { computeAchievements } from "@/lib/insights/achievements";
import { getUserAcademyProgress } from "@/lib/insights/academy";
import { SkillRadarChart, SkillBreakdownCards } from "@/components/insights/skill-radar-chart";
import { MitreTacticGrid, MitreCoverageHeader } from "@/components/insights/mitre-tactic-grid";
import { AchievementsGrid } from "@/components/insights/achievements-grid";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member Insights · Sage Vault" };

function calcStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export default async function OrgMemberPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const allowed = await canViewOrgMember(me.id, userId);
  if (!allowed) redirect("/organization");

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, email: true, role: true, skillScore: true },
  });
  if (!target) notFound();

  const [attempts, simSessions, skillRadar, coverage, achievementsResult, academyProgress] = await Promise.all([
    db.attempt.findMany({ where: { userId }, select: { status: true, startedAt: true } }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      select: { status: true, score: true, startedAt: true, endedAt: true },
    }),
    computeSkillRadar(userId),
    computeMitreCoverage(userId),
    computeAchievements(userId),
    getUserAcademyProgress(userId),
  ]);

  const solved = attempts.filter((a) => a.status === "SOLVED");
  const activityDates = [...attempts.map((a) => a.startedAt), ...simSessions.map((s) => s.startedAt)];
  const streak = calcStreak(activityDates);
  const avgSimScore = simSessions.length
    ? Math.round(simSessions.reduce((s, x) => s + (x.score ?? 0), 0) / simSessions.length)
    : null;
  const rank = getRankInfo(target.skillScore);

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/organization" className="text-xs text-ink-3 hover:text-ok transition-colors">
              ← Back to Organization
            </Link>
            <h1 className="text-2xl font-bold mt-2">{target.displayName ?? target.email}</h1>
            <p className="text-sm text-ink-3 mt-1">{target.email} · {target.role}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${RANK_BADGE_CLASS[rank.tier]}`}>
              {rank.label}
            </span>
            <p className="text-3xl font-black tabular-nums mt-1">{target.skillScore}</p>
            <p className="text-xs text-ink-3">skill score</p>
          </div>
        </div>

        <RankLegend />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Labs Solved", value: solved.length, sub: `of ${attempts.length} attempted` },
            { label: "Simulations", value: simSessions.length, sub: "completed" },
            { label: "Avg Sim Score", value: avgSimScore ?? "—", sub: "out of 100" },
            { label: "Activity Streak", value: `${streak}d`, sub: streak > 0 ? "current streak" : "no active streak" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-edge bg-surface-1 p-4">
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-2">{c.label}</p>
              <p className="text-3xl font-black tabular-nums text-ink">{c.value}</p>
              <p className="text-xs text-ink-3 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Skill radar */}
        <section>
          <h2 className="text-lg font-bold mb-4">Skill Radar</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            <div className="md:col-span-3 rounded-xl border border-edge bg-surface-1 p-4 flex justify-center">
              <SkillRadarChart skills={skillRadar.skills} />
            </div>
            <div className="md:col-span-2">
              <SkillBreakdownCards skills={skillRadar.skills} />
            </div>
          </div>
        </section>

        {/* MITRE coverage */}
        <section>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <h2 className="text-lg font-bold">MITRE ATT&CK Coverage</h2>
            <MitreCoverageHeader coverage={coverage} />
          </div>
          <MitreTacticGrid coverage={coverage} />
        </section>

        {/* Achievements */}
        <section>
          <h2 className="text-lg font-bold mb-4">
            Achievements <span className="text-sm font-normal text-ink-3">({achievementsResult.earned.length}/{achievementsResult.achievements.length})</span>
          </h2>
          <div className="space-y-8">
            <AchievementsGrid achievements={achievementsResult.achievements} />
          </div>
        </section>

        {/* Academy progress */}
        <section>
          <h2 className="text-lg font-bold mb-4">Academy Progress</h2>
          <div className="rounded-xl border border-edge bg-surface-1 overflow-hidden">
            {academyProgress.length === 0 ? (
              <p className="px-5 py-8 text-xs text-ink-3 text-center">Not enrolled in any Academy courses.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-edge text-ink-3 text-[10px] uppercase tracking-wider">
                    <th className="text-left px-4 py-2.5">Course</th>
                    <th className="text-right px-4 py-2.5">Lessons</th>
                    <th className="text-right px-4 py-2.5">Quizzes Passed</th>
                    <th className="text-right px-4 py-2.5">Enrolled</th>
                    <th className="text-right px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {academyProgress.map((c) => (
                    <tr key={c.courseId} className="hover:bg-surface-2">
                      <td className="px-4 py-2.5 text-ink font-medium">{c.courseTitle}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">
                        {c.completedLessons}/{c.totalLessons} ({c.lessonProgressPct}%)
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-ink-2">
                        {c.quizzesPassed}/{c.totalQuizzes}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-ink-3">
                        {c.enrolledAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {c.certificateIssued ? (
                          <span className="text-[10px] font-bold text-ok bg-ok-wash rounded px-2 py-0.5">Certified</span>
                        ) : c.completedAt ? (
                          <span className="text-[10px] font-bold text-info bg-info-wash rounded px-2 py-0.5">Completed</span>
                        ) : (
                          <span className="text-[10px] font-bold text-ink-3 bg-surface-2 rounded px-2 py-0.5">In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
