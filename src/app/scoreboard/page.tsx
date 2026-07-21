import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getRankInfo } from "@/lib/cyber-identity";
import { Navbar } from "@/components/navbar";
import { LiveBoard } from "./_components/live-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live Scoreboard · Sage Vault" };

export default async function ScoreboardPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  // Initial SSR fetch — same shape as /api/scoreboard
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const oneDayAgo     = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [topUsers, recentSolves, recentSims, activeCount] = await Promise.all([
    db.user.findMany({
      where:   { role: "STUDENT", skillScore: { gt: 0 }, organizationMemberships: { none: { isLead: true } } },
      select:  { id: true, displayName: true, skillScore: true },
      orderBy: { skillScore: "desc" },
      take:    50,
    }),
    db.attempt.findMany({
      where:   { status: "SOLVED", solvedAt: { gte: thirtyMinsAgo } },
      select:  {
        id: true, solvedAt: true,
        user: { select: { id: true, displayName: true } },
        lab:  { select: { title: true, difficulty: true, type: true } },
      },
      orderBy: { solvedAt: "desc" },
      take: 12,
    }),
    db.simulationSession.findMany({
      where:   { status: { in: ["CONTAINED", "BREACHED"] }, endedAt: { gte: thirtyMinsAgo } },
      select:  {
        id: true, endedAt: true, status: true, score: true,
        user:     { select: { id: true, displayName: true } },
        template: { select: { name: true } },
      },
      orderBy: { endedAt: "desc" },
      take: 8,
    }),
    db.user.count({
      where: {
        role: "STUDENT",
        OR: [
          { attempts:    { some: { startedAt: { gte: oneDayAgo } } } },
          { simSessions: { some: { startedAt: { gte: oneDayAgo } } } },
        ],
      },
    }),
  ]);

  const users = topUsers.map((u, i) => ({
    rank:       i + 1,
    id:         u.id,
    name:       u.displayName ?? "Anonymous",
    skillScore: u.skillScore,
    rankInfo:   getRankInfo(u.skillScore),
  }));

  const activity = [
    ...recentSolves.map(a => ({
      id:     a.id,
      kind:   "LAB" as const,
      user:   a.user.displayName ?? "Anonymous",
      userId: a.user.id,
      title:  a.lab.title,
      detail: `${a.lab.difficulty} ${a.lab.type.replace("_", " ")}`,
      ts:     a.solvedAt?.getTime() ?? 0,
    })),
    ...recentSims.map(s => ({
      id:     s.id,
      kind:   "SIM" as const,
      user:   s.user.displayName ?? "Anonymous",
      userId: s.user.id,
      title:  s.template.name,
      detail: s.status === "CONTAINED" ? "contained" : `breached · ${s.score} pts`,
      ts:     s.endedAt?.getTime() ?? 0,
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 15);

  const initialData = { users, activity, activeCount, ts: Date.now() };

  // My position (might not be in top 50 if score is 0)
  const meEntry = users.find(u => u.id === me.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Live Scoreboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              Updated every 6 seconds · Top {users.length} players globally
            </p>
          </div>
          <a href="/leaderboard"
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition">
            Category Leaderboard →
          </a>
          {!meEntry && me.skillScore === 0 && (
            <p className="text-xs text-zinc-600 border border-white/8 rounded-lg px-3 py-2">
              Solve a lab to appear on the scoreboard
            </p>
          )}
        </div>

        <LiveBoard initialData={initialData} currentUserId={me.id} />
      </main>
    </div>
  );
}
