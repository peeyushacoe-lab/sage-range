import { db } from "@/lib/db";
import { getRankInfo } from "@/lib/cyber-identity";

export const dynamic = "force-dynamic";

export async function GET() {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const oneDayAgo     = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [topUsers, recentSolves, recentSims, activeCount] = await Promise.all([
    db.user.findMany({
      where:   { role: "STUDENT", skillScore: { gt: 0 }, organizationMemberships: { none: { isLead: true } } },
      select:  { id: true, displayName: true, skillScore: true, avatarUrl: true },
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
          { attempts:    { some: { startedAt:  { gte: oneDayAgo } } } },
          { simSessions: { some: { startedAt:  { gte: oneDayAgo } } } },
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

  // Merge and sort activity feed
  const activity = [
    ...recentSolves.map(a => ({
      id:        a.id,
      kind:      "LAB" as const,
      user:      a.user.displayName ?? "Anonymous",
      userId:    a.user.id,
      title:     a.lab.title,
      detail:    `${a.lab.difficulty} ${a.lab.type.replace("_", " ")}`,
      ts:        a.solvedAt?.getTime() ?? 0,
    })),
    ...recentSims.map(s => ({
      id:        s.id,
      kind:      "SIM" as const,
      user:      s.user.displayName ?? "Anonymous",
      userId:    s.user.id,
      title:     s.template.name,
      detail:    s.status === "CONTAINED" ? "contained" : `breached · ${s.score} pts`,
      ts:        s.endedAt?.getTime() ?? 0,
    })),
  ].sort((a, b) => b.ts - a.ts).slice(0, 15);

  return Response.json(
    { users, activity, activeCount, ts: Date.now() },
    { headers: { "Cache-Control": "s-maxage=5, stale-while-revalidate=10" } }
  );
}
