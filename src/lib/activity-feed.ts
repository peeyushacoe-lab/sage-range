import { db } from "./db";

export type FeedEntry =
  | {
      type: "lab_solved";
      id: string;
      userId: string;
      displayName: string | null;
      email: string;
      labTitle: string;
      labType: string;
      labDifficulty: string;
      score: number;
      solvedAt: Date;
    }
  | {
      type: "sim_completed";
      id: string;
      userId: string;
      displayName: string | null;
      email: string;
      scenarioName: string;
      simScore: number;
      status: string;
      completedAt: Date;
    };

export async function getActivityFeed(opts: {
  limit?: number;
  userId?: string;
  since?: Date;
}): Promise<FeedEntry[]> {
  const { limit = 50, userId, since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } = opts;

  const whereUser = userId ? { userId } : {};

  const [solves, sims] = await Promise.all([
    db.attempt.findMany({
      where: { status: "SOLVED", ...whereUser, solvedAt: { gte: since } },
      include: {
        lab:  { select: { title: true, type: true, difficulty: true } },
        user: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { solvedAt: "desc" },
      take: limit,
    }),
    db.simulationSession.findMany({
      where: { status: { in: ["CONTAINED", "BREACHED"] }, ...whereUser, startedAt: { gte: since } },
      include: {
        template: { select: { name: true } },
        user:     { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    }),
  ]);

  const labEntries: FeedEntry[] = solves
    .filter((a) => a.solvedAt != null)
    .map((a) => ({
      type: "lab_solved" as const,
      id: `lab_${a.id}`,
      userId: a.user.id,
      displayName: a.user.displayName,
      email: a.user.email,
      labTitle: a.lab.title,
      labType: a.lab.type,
      labDifficulty: a.lab.difficulty,
      score: a.score ?? 0,
      solvedAt: a.solvedAt as Date,
    }));

  const simEntries: FeedEntry[] = sims
    .filter((s) => s.score != null)
    .map((s) => ({
      type: "sim_completed" as const,
      id: `sim_${s.id}`,
      userId: s.user.id,
      displayName: s.user.displayName,
      email: s.user.email,
      scenarioName: s.template.name,
      simScore: s.score as number,
      status: s.status,
      completedAt: s.startedAt,
    }));

  return [...labEntries, ...simEntries]
    .sort((a, b) => {
      const aDate = a.type === "lab_solved" ? a.solvedAt : a.completedAt;
      const bDate = b.type === "lab_solved" ? b.solvedAt : b.completedAt;
      return bDate.getTime() - aDate.getTime();
    })
    .slice(0, limit);
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toISOString().slice(0, 10);
}
