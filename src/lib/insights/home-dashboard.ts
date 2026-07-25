import { db } from "@/lib/db";
import { getRankInfo } from "@/lib/cyber-identity";
import { getActivityStreak } from "./streak";
import { computeAchievements, type Achievement } from "./achievements";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import type { AppUser } from "@/lib/current-user";

export type ContinueLearning =
  | { kind: "simulation"; href: string; title: string; sub: string }
  | { kind: "incident"; href: string; title: string; sub: string }
  | { kind: "lab"; href: string; title: string; sub: string; progressPct: number }
  | { kind: "path"; href: string; title: string; sub: string }
  | null;

export type JourneyStep = { title: string; status: "done" | "current" | "locked"; href: string | null };

export type ActiveLab = { title: string; slug: string; progressPct: number; status: "IN_PROGRESS" | "NOT_STARTED" };

export type LeaderboardRow = { rank: number; id: string; name: string; skillScore: number; isMe: boolean };

export type HomeDashboard = {
  greeting: "morning" | "afternoon" | "evening";
  displayName: string;
  rankLabel: string;
  rankColor: string;
  rankPct: number;
  rankNextLabel: string | null;
  globalRank: number | null;
  xp: number;
  skillScore: number;
  streak: number;
  continueLearning: ContinueLearning;
  todaysMission: { title: string; slug: string; difficulty: string; points: number; solved: boolean } | null;
  journey: JourneyStep[];
  activeLabs: ActiveLab[];
  achievementsPreview: Achievement[];
  achievementsEarnedCount: number;
  achievementsTotalCount: number;
  leaderboardPreview: LeaderboardRow[];
  announcements: { id: string; title: string; body: string; href: string | null; createdAt: Date }[];
};

function labProgressPct(labSlug: string, doneStages: Set<string> | undefined): number {
  const stages = TASK_STAGES[labSlug] ?? [];
  if (stages.length === 0) return 0;
  const done = stages.filter((s) => doneStages?.has(s)).length;
  return Math.round((done / stages.length) * 100);
}

export async function buildHomeDashboard(user: AppUser): Promise<HomeDashboard> {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const [
    activeSimulation,
    inProgressAttempts,
    activeIncidentProgress,
    labs,
    labResponses,
    paths,
    higherRankedCount,
    top5,
    announcements,
    achievementsResult,
  ] = await Promise.all([
    db.simulationSession.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: { template: true },
      orderBy: { startedAt: "desc" },
    }),
    db.attempt.findMany({
      where: { userId: user.id, status: "IN_PROGRESS" },
      include: { lab: { select: { title: true, slug: true } } },
      orderBy: { startedAt: "desc" },
      take: 6,
    }),
    db.incidentSimProgress.findMany({
      where: { userId: user.id },
      orderBy: { completedAt: "desc" },
      take: 1,
      include: { simulation: { select: { slug: true, title: true } } },
    }),
    db.lab.findMany({ where: { published: true }, orderBy: { createdAt: "asc" }, select: { id: true, slug: true, title: true, difficulty: true, points: true } }),
    db.labResponse.findMany({ where: { userId: user.id }, select: { labId: true, stage: true } }),
    db.learningPath.findMany({
      where: { published: true },
      orderBy: { order: "asc" },
      include: { progress: { where: { userId: user.id } } },
      take: 8,
    }),
    db.user.count({ where: { role: "STUDENT", hidden: false, skillScore: { gt: user.skillScore } } }),
    db.user.findMany({
      where: { role: "STUDENT", hidden: false, skillScore: { gt: 0 } },
      select: { id: true, displayName: true, email: true, skillScore: true },
      orderBy: { skillScore: "desc" },
      take: 5,
    }),
    // Announcement is a newly added model — guard against querying before the
    // user has run `prisma migrate dev`, so the dashboard doesn't 500.
    db.announcement.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3 }).catch(() => []),
    computeAchievements(user.id),
  ]);

  const rank = getRankInfo(user.skillScore);

  // ── Continue Learning — priority: live sim > incident sim mid-way > in-progress lab ──
  let continueLearning: ContinueLearning = null;
  if (activeSimulation) {
    continueLearning = {
      kind: "simulation",
      href: `/simulation/${activeSimulation.id}`,
      title: activeSimulation.template.name,
      sub: `Stage: ${activeSimulation.currentStage.replace(/_/g, " ")}`,
    };
  } else if (activeIncidentProgress[0]) {
    continueLearning = {
      kind: "incident",
      href: `/incidents/${activeIncidentProgress[0].simulation.slug}`,
      title: activeIncidentProgress[0].simulation.title,
      sub: "Boss Fight in progress",
    };
  } else if (inProgressAttempts[0]) {
    const done = new Set(labResponses.filter((r) => r.labId === inProgressAttempts[0].labId).map((r) => r.stage));
    continueLearning = {
      kind: "lab",
      href: `/labs/${inProgressAttempts[0].lab.slug}`,
      title: inProgressAttempts[0].lab.title,
      sub: "Resume where you left off",
      progressPct: labProgressPct(inProgressAttempts[0].lab.slug, done),
    };
  } else {
    const nextPath = paths.find((p) => !p.progress[0]?.completedAt);
    if (nextPath) {
      continueLearning = {
        kind: "path",
        href: `/paths`,
        title: nextPath.title,
        sub: nextPath.progress[0] ? "Continue this path" : "Start this path",
      };
    }
  }

  // ── Today's Mission — same deterministic pick as /daily ──
  let todaysMission: HomeDashboard["todaysMission"] = null;
  if (labs.length > 0) {
    const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const todayLab = labs[dayIndex % labs.length];
    const solved = await db.attempt.findFirst({ where: { userId: user.id, labId: todayLab.id, status: "SOLVED" }, select: { id: true } });
    todaysMission = { title: todayLab.title, slug: todayLab.slug, difficulty: todayLab.difficulty, points: todayLab.points, solved: !!solved };
  }

  // ── Learning Journey — path list with done/current/locked ──
  const journey: JourneyStep[] = paths.map((p, i) => {
    const done = !!p.progress[0]?.completedAt;
    const prevDone = i === 0 || !!paths[i - 1].progress[0]?.completedAt;
    const status: JourneyStep["status"] = done ? "done" : prevDone ? "current" : "locked";
    return { title: p.title, status, href: status === "locked" ? null : "/paths" };
  });

  // ── Active labs — in-progress attempts with real completion % ──
  const activeLabs: ActiveLab[] = inProgressAttempts.map((a) => {
    const done = new Set(labResponses.filter((r) => r.labId === a.labId).map((r) => r.stage));
    return { title: a.lab.title, slug: a.lab.slug, progressPct: labProgressPct(a.lab.slug, done), status: "IN_PROGRESS" };
  });

  // ── Leaderboard preview ──
  const leaderboardPreview: LeaderboardRow[] = top5.map((u, i) => ({
    rank: i + 1,
    id: u.id,
    name: u.displayName ?? u.email.split("@")[0],
    skillScore: u.skillScore,
    isMe: u.id === user.id,
  }));
  if (!leaderboardPreview.some((r) => r.isMe) && user.skillScore > 0) {
    leaderboardPreview.push({
      rank: higherRankedCount + 1,
      id: user.id,
      name: user.displayName ?? user.email.split("@")[0],
      skillScore: user.skillScore,
      isMe: true,
    });
  }

  const earnedSorted = [...achievementsResult.earned].sort((a, b) => (b.earnedAt?.getTime() ?? 0) - (a.earnedAt?.getTime() ?? 0));
  const achievementsPreview = earnedSorted.length >= 4 ? earnedSorted.slice(0, 4) : [...earnedSorted, ...achievementsResult.locked.slice(0, 4 - earnedSorted.length)];

  return {
    greeting,
    displayName: user.displayName ?? user.email.split("@")[0],
    rankLabel: rank.label,
    rankColor: rank.color,
    rankPct: rank.pct,
    rankNextLabel: rank.nextLabel,
    globalRank: user.skillScore > 0 ? higherRankedCount + 1 : null,
    xp: user.xp,
    skillScore: user.skillScore,
    streak: await getActivityStreak(user.id),
    continueLearning,
    todaysMission,
    journey,
    activeLabs,
    achievementsPreview,
    achievementsEarnedCount: achievementsResult.earned.length,
    achievementsTotalCount: achievementsResult.achievements.length,
    leaderboardPreview,
    announcements,
  };
}
