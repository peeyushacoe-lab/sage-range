import { db } from "@/lib/db";

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

export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: "labs" | "simulations" | "streaks" | "rank" | "mastery";
  earnedAt: Date | null;
};

export const ACHIEVEMENT_CATEGORIES: { key: Achievement["category"]; label: string }[] = [
  { key: "labs",        label: "Labs" },
  { key: "simulations", label: "Simulations" },
  { key: "streaks",     label: "Streaks" },
  { key: "rank",        label: "Rank" },
  { key: "mastery",     label: "Mastery" },
];

export type AchievementsResult = {
  achievements: Achievement[];
  earned: Achievement[];
  locked: Achievement[];
  earnPct: number;
};

export async function computeAchievements(userId: string): Promise<AchievementsResult> {
  const me = await db.user.findUnique({ where: { id: userId }, select: { skillScore: true, updatedAt: true } });

  const [attempts, simSessions, hintsUsed] = await Promise.all([
    db.attempt.findMany({
      where: { userId },
      include: { lab: { select: { type: true, difficulty: true, category: true } } },
      orderBy: { startedAt: "asc" },
    }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      select: { status: true, score: true, endedAt: true, startedAt: true, templateId: true },
      orderBy: { startedAt: "asc" },
    }),
    db.usedHint.count({ where: { userId } }),
  ]);

  // Derived data
  const solved = attempts
    .filter((a) => a.status === "SOLVED" && a.solvedAt)
    .sort((a, b) => a.solvedAt!.getTime() - b.solvedAt!.getTime());

  const activityDates = [...attempts.map((a) => a.startedAt), ...simSessions.map((s) => s.startedAt)];
  const streak = calcStreak(activityDates);

  const ctfSolved     = solved.filter((a) => a.lab.type === "CTF");
  const blueSolved    = solved.filter((a) => a.lab.type === "BLUE_TEAM");
  const redSolved     = solved.filter((a) => a.lab.type === "RED_TEAM");
  const insaneSolved  = solved.filter((a) => a.lab.difficulty === "INSANE");
  const hardPlusSolved = solved.filter((a) => a.lab.difficulty === "HARD" || a.lab.difficulty === "INSANE");

  const speedRun = solved.find(
    (a) => a.lab.difficulty === "HARD" && a.timeTakenSec != null && a.timeTakenSec < 1800
  );

  const containedSims = simSessions.filter((s) => s.status === "CONTAINED");
  const highScoreSim  = simSessions.find((s) => (s.score ?? 0) >= 90);
  const perfectSim    = simSessions.find((s) => (s.score ?? 0) >= 100);
  const uniqueTemplates = new Set(simSessions.map((s) => s.templateId)).size;

  const uniqueCategories = new Set(solved.map((a) => a.lab.category.toLowerCase().trim()));

  // Helper: nth solved date (1-indexed)
  const nthSolvedDate = (n: number): Date | null => solved[n - 1]?.solvedAt ?? null;
  const nthSimDate    = (n: number): Date | null => simSessions[n - 1]?.endedAt ?? simSessions[n - 1]?.startedAt ?? null;

  // All rounder: solved at least one of each type
  const allRounderDate =
    ctfSolved.length > 0 && blueSolved.length > 0 && redSolved.length > 0
      ? new Date(Math.max(ctfSolved[0].solvedAt!.getTime(), blueSolved[0].solvedAt!.getTime(), redSolved[0].solvedAt!.getTime()))
      : null;

  // Rank dates — no history so use updatedAt as proxy
  const rankDate = (minScore: number): Date | null =>
    (me?.skillScore ?? 0) >= minScore ? (me?.updatedAt ?? null) : null;

  // Streak dates — just mark as now if currently qualifying
  const streakDate = (n: number): Date | null => (streak >= n ? new Date() : null);

  const achievements: Achievement[] = [
    // ── Labs ──
    {
      id: "first-blood",
      emoji: "🩸",
      name: "First Blood",
      description: "Solve your very first lab",
      category: "labs",
      earnedAt: nthSolvedDate(1),
    },
    {
      id: "flag-collector",
      emoji: "🚩",
      name: "Flag Collector",
      description: "Solve 10 labs",
      category: "labs",
      earnedAt: nthSolvedDate(10),
    },
    {
      id: "ctf-veteran",
      emoji: "⚔️",
      name: "CTF Veteran",
      description: "Solve 25 labs",
      category: "labs",
      earnedAt: nthSolvedDate(25),
    },
    {
      id: "century",
      emoji: "💯",
      name: "Century",
      description: "Solve 100 labs",
      category: "labs",
      earnedAt: nthSolvedDate(100),
    },
    {
      id: "insane-mode",
      emoji: "💀",
      name: "Insane Mode",
      description: "Solve an Insane difficulty lab",
      category: "labs",
      earnedAt: insaneSolved[0]?.solvedAt ?? null,
    },
    {
      id: "speed-runner",
      emoji: "⚡",
      name: "Speed Runner",
      description: "Solve a Hard lab in under 30 minutes",
      category: "labs",
      earnedAt: speedRun?.solvedAt ?? null,
    },
    {
      id: "all-rounder",
      emoji: "🔄",
      name: "All Rounder",
      description: "Solve at least one CTF, Blue Team, and Red Team lab",
      category: "labs",
      earnedAt: allRounderDate,
    },
    {
      id: "hint-free",
      emoji: "🎯",
      name: "Hint Free",
      description: "Solve 5+ labs without ever using a hint",
      category: "labs",
      earnedAt: hintsUsed === 0 && solved.length >= 5 ? nthSolvedDate(5) : null,
    },
    {
      id: "hard-hitter",
      emoji: "🔨",
      name: "Hard Hitter",
      description: "Solve 5 Hard or Insane difficulty labs",
      category: "labs",
      earnedAt: hardPlusSolved[4]?.solvedAt ?? null,
    },
    {
      id: "explorer",
      emoji: "🌐",
      name: "Explorer",
      description: "Complete labs from 5+ different skill categories",
      category: "labs",
      earnedAt: uniqueCategories.size >= 5 ? nthSolvedDate(solved.length) : null,
    },

    // ── Simulations ──
    {
      id: "first-responder",
      emoji: "🚨",
      name: "First Responder",
      description: "Complete your first simulation",
      category: "simulations",
      earnedAt: nthSimDate(1),
    },
    {
      id: "threat-contained",
      emoji: "🛡️",
      name: "Threat Contained",
      description: "Successfully CONTAIN a threat in a simulation",
      category: "simulations",
      earnedAt: containedSims[0]?.endedAt ?? null,
    },
    {
      id: "high-scorer",
      emoji: "⭐",
      name: "High Scorer",
      description: "Score 90 or above in any simulation",
      category: "simulations",
      earnedAt: highScoreSim?.endedAt ?? null,
    },
    {
      id: "perfect-score",
      emoji: "💎",
      name: "Perfect Score",
      description: "Achieve a score of 100 in any simulation",
      category: "simulations",
      earnedAt: perfectSim?.endedAt ?? null,
    },
    {
      id: "sim-veteran",
      emoji: "🎖️",
      name: "Sim Veteran",
      description: "Complete 5 simulations",
      category: "simulations",
      earnedAt: nthSimDate(5),
    },
    {
      id: "relentless",
      emoji: "🔥",
      name: "Relentless",
      description: "Complete 10 simulations",
      category: "simulations",
      earnedAt: nthSimDate(10),
    },

    // ── Streaks ──
    {
      id: "daily-grind",
      emoji: "📅",
      name: "Daily Grind",
      description: "Maintain a 3-day activity streak",
      category: "streaks",
      earnedAt: streakDate(3),
    },
    {
      id: "week-warrior",
      emoji: "🗓️",
      name: "Week Warrior",
      description: "Maintain a 7-day activity streak",
      category: "streaks",
      earnedAt: streakDate(7),
    },
    {
      id: "month-strong",
      emoji: "💪",
      name: "Month Strong",
      description: "Maintain a 14-day activity streak",
      category: "streaks",
      earnedAt: streakDate(14),
    },

    // ── Rank ──
    {
      id: "rising-star",
      emoji: "🌟",
      name: "Rising Star",
      description: "Reach Bronze rank (1,000+ skill score)",
      category: "rank",
      earnedAt: rankDate(100),
    },
    {
      id: "silver-bullet",
      emoji: "🥈",
      name: "Silver Bullet",
      description: "Reach Silver rank (600+ skill score)",
      category: "rank",
      earnedAt: rankDate(600),
    },
    {
      id: "gold-standard",
      emoji: "🥇",
      name: "Gold Standard",
      description: "Reach Gold rank (1,000+ skill score)",
      category: "rank",
      earnedAt: rankDate(1000),
    },
    {
      id: "elite-operator",
      emoji: "👁️",
      name: "Elite Operator",
      description: "Reach Elite rank (2,000+ skill score)",
      category: "rank",
      earnedAt: rankDate(2000),
    },

    // ── Mastery ──
    {
      id: "tactical-mind",
      emoji: "🗺️",
      name: "Tactical Mind",
      description: "Complete simulations across 3+ different scenarios",
      category: "mastery",
      earnedAt: uniqueTemplates >= 3 ? nthSimDate(simSessions.length) : null,
    },
    {
      id: "full-spectrum",
      emoji: "⛓️",
      name: "Full Spectrum",
      description: "Solve 5+ Hard labs AND complete 5+ simulations",
      category: "mastery",
      earnedAt: hardPlusSolved.length >= 5 && simSessions.length >= 5
        ? new Date(Math.max(hardPlusSolved[4].solvedAt!.getTime(), simSessions[4].endedAt?.getTime() ?? 0))
        : null,
    },
  ];

  const earned  = achievements.filter((a) => a.earnedAt !== null);
  const locked  = achievements.filter((a) => a.earnedAt === null);
  const earnPct = Math.round((earned.length / achievements.length) * 100);

  return { achievements, earned, locked, earnPct };
}
