import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_COLOR: Record<string, string> = {
  EXCEPTIONAL: "text-ok bg-ok-wash border-ok-edge",
  STRONG:      "text-info bg-info-wash border-info-edge",
  ADEQUATE:    "text-warn bg-warn-wash border-warn-edge",
  DEVELOPING:  "text-sev-high bg-sev-high-wash border-sev-high-edge",
};

export default async function RecruiterAnalyticsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "RECRUITER" && user.role !== "ADMIN") redirect("/dashboard");

  // All students with at least one completed simulation
  const completedSessions = await db.simulationSession.findMany({
    where: { status: { in: ["CONTAINED", "BREACHED"] }, user: { hidden: false } },
    include: {
      user: {
        select: {
          id: true, displayName: true, email: true, skillScore: true,
          university: true, skills: true,
        },
      },
      template: { select: { name: true, industry: true } },
    },
    orderBy: { endedAt: "desc" },
  });

  // Best session per student
  const bestByStudent = new Map<string, {
    user: (typeof completedSessions)[0]["user"];
    score: number;
    scenario: string;
    industry: string;
    status: string;
    sessionId: string;
  }>();

  for (const s of completedSessions) {
    const existing = bestByStudent.get(s.userId);
    if (!existing || s.score > existing.score) {
      bestByStudent.set(s.userId, {
        user: s.user,
        score: s.score,
        scenario: s.template.name,
        industry: s.template.industry,
        status: s.status,
        sessionId: s.id,
      });
    }
  }

  const candidates = [...bestByStudent.values()].sort((a, b) => b.score - a.score);
  const scores = candidates.map((c) => c.score);
  const totalAssessed = scores.length;
  const avgScore = totalAssessed > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalAssessed) : null;
  const top10Pct = totalAssessed > 0 ? scores[Math.floor(totalAssessed * 0.1)] ?? scores[0] : null;

  const dist = { EXCEPTIONAL: 0, STRONG: 0, ADEQUATE: 0, DEVELOPING: 0 };
  for (const s of scores) dist[toRating(s) as keyof typeof dist]++;

  const containmentRate = totalAssessed > 0
    ? Math.round((candidates.filter((c) => c.status === "CONTAINED").length / totalAssessed) * 100)
    : null;

  // Check bookmarks for this recruiter
  const bookmarks = await db.candidateBookmark.findMany({
    where: { recruiterId: user.id },
    select: { candidateId: true },
  });
  const bookmarkedIds = new Set(bookmarks.map((b) => b.candidateId));

  // Industry breakdown
  const byIndustry = new Map<string, number>();
  for (const s of completedSessions) {
    byIndustry.set(s.template.industry, (byIndustry.get(s.template.industry) ?? 0) + 1);
  }
  const industries = [...byIndustry.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Scenario popularity
  const byScenario = new Map<string, { name: string; count: number; avgScore: number; total: number }>();
  for (const s of completedSessions) {
    const entry = byScenario.get(s.template.name) ?? { name: s.template.name, count: 0, avgScore: 0, total: 0 };
    entry.count++;
    entry.total += s.score;
    entry.avgScore = Math.round(entry.total / entry.count);
    byScenario.set(s.template.name, entry);
  }
  const scenarios = [...byScenario.values()].sort((a, b) => b.count - a.count);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-0 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-1">Talent Intelligence</p>
              <h1 className="text-3xl font-bold">Candidate Analytics</h1>
              <p className="text-ink-2 text-sm mt-1">
                {totalAssessed} simulation-verified candidate{totalAssessed !== 1 ? "s" : ""} in the platform
              </p>
            </div>
            <Link
              href="/recruiter"
              className="text-xs text-ink-3 hover:text-ink-2 border border-edge rounded-lg px-3 py-2 transition shrink-0"
            >
              Talent Marketplace →
            </Link>
          </div>

          {/* Top-line stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Assessed",    value: totalAssessed,                          color: "text-ink" },
              { label: "Platform Avg Score", value: avgScore !== null ? avgScore : "—",     color: "text-warn" },
              { label: "Top 10% Threshold", value: top10Pct !== null ? `${top10Pct}+` : "—", color: "text-ok" },
              { label: "Containment Rate",  value: containmentRate !== null ? `${containmentRate}%` : "—", color: containmentRate !== null && containmentRate >= 50 ? "text-ok" : "text-warn" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-edge bg-surface-1 p-5">
                <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Score distribution */}
          {totalAssessed > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Score Distribution</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["EXCEPTIONAL", "STRONG", "ADEQUATE", "DEVELOPING"] as const).map((r) => {
                  const pct = totalAssessed > 0 ? Math.round((dist[r] / totalAssessed) * 100) : 0;
                  const rStyle = RATING_COLOR[r];
                  return (
                    <div key={r} className={`rounded-xl border p-4 ${rStyle}`}>
                      <p className="text-xs font-bold uppercase tracking-wider mb-2">{r}</p>
                      <p className="text-3xl font-bold text-white">{dist[r]}</p>
                      <p className="text-xs opacity-60 mt-1">{pct}% of pool</p>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-2">
                        <div className="h-full rounded-full bg-current opacity-70" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Top candidates leaderboard */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm uppercase tracking-widest text-ink-3">Leadership Rankings</h2>
              <p className="text-xs text-ink-3">Ranked by best simulation score</p>
            </div>
            {candidates.length === 0 ? (
              <p className="text-ink-3 text-sm italic">No assessed candidates yet.</p>
            ) : (
              <div className="rounded-xl border border-edge overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-edge text-[10px] uppercase tracking-wider text-ink-3 bg-surface-1">
                      <th className="text-left p-3 pl-4">#</th>
                      <th className="text-left p-3">Candidate</th>
                      <th className="text-left p-3">Best Scenario</th>
                      <th className="text-center p-3">Assessment</th>
                      <th className="text-center p-3">Outcome</th>
                      <th className="text-right p-3 pr-4">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-edge-subtle">
                    {candidates.slice(0, 25).map((c, i) => {
                      const r = toRating(c.score);
                      const rStyle = RATING_COLOR[r];
                      const isBookmarked = bookmarkedIds.has(c.user.id);
                      return (
                        <tr key={c.user.id} className="hover:bg-surface-2 transition">
                          <td className="p-3 pl-4 text-ink-3 text-xs font-mono">
                            {i < 3 ? <Icon name="medal" size={15} tone={(["gold","slate","amber"] as const)[i]} /> : i + 1}
                          </td>
                          <td className="p-3">
                            <Link href={`/profile/${c.user.id}`} className="hover:text-warn transition">
                              <p className="font-medium">{c.user.displayName ?? c.user.email?.split("@")[0]}</p>
                              {c.user.university && <p className="text-xs text-ink-3">{c.user.university}</p>}
                            </Link>
                          </td>
                          <td className="p-3">
                            <p className="text-xs text-ink-2 truncate max-w-[160px]">{c.scenario}</p>
                            <p className="text-[10px] text-ink-3">{c.industry}</p>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${rStyle}`}>
                              {r}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-[10px] font-bold ${c.status === "CONTAINED" ? "text-ok" : "text-danger"}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-3 pr-4 text-right">
                            <span className="font-bold text-white">{c.score}</span>
                            {isBookmarked && <span className="ml-1.5 text-[10px] text-warn"><Icon name="star" size={14} className="inline-block shrink-0" /></span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Scenario and industry breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section>
              <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Scenarios Run</h2>
              <div className="space-y-2">
                {scenarios.map((s) => (
                  <div key={s.name} className="flex items-center gap-3 rounded-lg border border-edge bg-surface-1 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-ink-3">Avg score: <span className="text-ink-2">{s.avgScore}</span></p>
                    </div>
                    <span className="text-xs text-ink-2 shrink-0">{s.count} attempt{s.count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Industry Exposure</h2>
              <div className="space-y-2">
                {industries.map(([industry, count]) => {
                  const pct = Math.round((count / completedSessions.length) * 100);
                  return (
                    <div key={industry} className="rounded-lg border border-edge bg-surface-1 px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-medium">{industry}</p>
                        <span className="text-xs text-ink-3">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full bg-warn-wash" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

        </div>
      </main>
    </>
  );
}
