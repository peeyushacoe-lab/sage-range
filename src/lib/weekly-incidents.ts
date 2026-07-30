import { db } from "@/lib/db";
import type { Difficulty, WeeklyIncidentCase, WeeklyIncidentLeaderboard } from "@prisma/client";
import { cache } from "react";

/**
 * Get the current active weekly incident case.
 * A case is active if:
 * 1. It's published
 * 2. Current time is between releaseTime and deadlineTime (or after but not archived)
 * 3. archivedAt is null
 */
export const getCurrentWeeklyCase = cache(async (): Promise<WeeklyIncidentCase | null> => {
  const now = new Date();
  const case_ = await db.weeklyIncidentCase.findFirst({
    where: {
      published: true,
      releaseTime: { lte: now },
      archivedAt: null,
    },
    orderBy: { weekStartUTC: "desc" },
  });
  return case_ ?? null;
});

/**
 * Get a weekly incident case by ID.
 */
export async function getWeeklyCaseById(caseId: string): Promise<WeeklyIncidentCase | null> {
  return db.weeklyIncidentCase.findUnique({
    where: { id: caseId },
  });
}

/**
 * Get the leaderboard for a weekly case (top 100).
 * Returns users sorted by rank (if computed) or by score/time if still during week.
 */
export async function getWeeklyLeaderboard(
  caseId: string,
  limit: number = 100
): Promise<(WeeklyIncidentLeaderboard & { user: { id: string; displayName: string | null; email: string } })[]> {
  const entries = await db.weeklyIncidentLeaderboard.findMany({
    where: {
      caseId,
      completedAt: { not: null }, // Only completed entries
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    orderBy: [
      { rank: { sort: "asc", nulls: "last" } }, // Computed ranks first
      { score: "desc" }, // Then by score
      { timeTakenMin: "asc" }, // Then by time
    ],
    take: limit,
  });
  return entries;
}

/**
 * Get a user's progress on the current or specific weekly case.
 */
export async function getUserWeeklyProgress(
  userId: string,
  caseId?: string
): Promise<{
  case: WeeklyIncidentCase | null;
  leaderboardEntry: WeeklyIncidentLeaderboard | null;
  rank: number | null;
  completedAt: Date | null;
  score: number;
  daysRemaining: number;
}> {
  const case_ = caseId ? await getWeeklyCaseById(caseId) : await getCurrentWeeklyCase();
  if (!case_) {
    return {
      case: null,
      leaderboardEntry: null,
      rank: null,
      completedAt: null,
      score: 0,
      daysRemaining: 0,
    };
  }

  const entry = await db.weeklyIncidentLeaderboard.findUnique({
    where: {
      caseId_userId: { caseId: case_.id, userId },
    },
  });

  const now = new Date();
  const daysRemaining = Math.ceil((case_.deadlineTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    case: case_,
    leaderboardEntry: entry,
    rank: entry?.rank ?? null,
    completedAt: entry?.completedAt ?? null,
    score: entry?.score ?? 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Get weekly certificate for a case, if the user earned it.
 * User earns a cert if they completed the case by the deadline.
 */
export async function getUserWeeklyCertificate(
  userId: string,
  caseId: string
): Promise<{
  earned: boolean;
  certificate: {
    id: string;
    certCode: string;
    season: number;
    weekNumber: number;
    issuedAt: Date;
  } | null;
}> {
  const leaderboardEntry = await db.weeklyIncidentLeaderboard.findUnique({
    where: {
      caseId_userId: { caseId, userId },
    },
    select: { completedAt: true },
  });

  if (!leaderboardEntry?.completedAt) {
    return { earned: false, certificate: null };
  }

  const case_ = await getWeeklyCaseById(caseId);
  if (!case_ || leaderboardEntry.completedAt > case_.deadlineTime) {
    return { earned: false, certificate: null };
  }

  const cert = await db.weeklyIncidentCertificate.findUnique({
    where: { caseId },
    select: {
      id: true,
      certCode: true,
      season: true,
      weekNumber: true,
      issuedAt: true,
    },
  });

  return {
    earned: !!cert,
    certificate: cert,
  };
}

/**
 * Compute leaderboard ranks for a completed weekly case.
 * Called after the deadline to rank all participants.
 * Ranks are computed as: position after sorting by (score DESC, timeTakenMin ASC).
 */
export async function computeWeeklyLeaderboardRanks(caseId: string): Promise<number> {
  const entries = await db.weeklyIncidentLeaderboard.findMany({
    where: {
      caseId,
      completedAt: { not: null },
    },
    orderBy: [{ score: "desc" }, { timeTakenMin: "asc" }],
  });

  let updated = 0;
  for (let i = 0; i < entries.length; i++) {
    const result = await db.weeklyIncidentLeaderboard.update({
      where: { id: entries[i].id },
      data: {
        rank: i + 1,
        rankUpdatedAt: new Date(),
      },
    });
    if (result) updated++;
  }

  return updated;
}

/**
 * Get or initialize a leaderboard entry for a user on a weekly case.
 * This is called when a user starts or progresses on a case.
 */
export async function ensureWeeklyLeaderboardEntry(userId: string, caseId: string): Promise<WeeklyIncidentLeaderboard> {
  return db.weeklyIncidentLeaderboard.upsert({
    where: {
      caseId_userId: { caseId, userId },
    },
    create: {
      userId,
      caseId,
      score: 0,
    },
    update: {},
  });
}

/**
 * Update a user's weekly leaderboard entry with completion and score info.
 * Called after a user submits their evidence board and/or report.
 */
export async function updateWeeklyLeaderboardEntry(
  userId: string,
  caseId: string,
  data: {
    completedAt?: Date;
    timeTakenMin?: number;
    evidenceBoardScore?: number;
    reportScore?: number;
    score?: number;
  }
): Promise<WeeklyIncidentLeaderboard> {
  const case_ = await getWeeklyCaseById(caseId);
  if (!case_) throw new Error("Case not found");

  const now = new Date();
  const wasCompleted = data.completedAt ? now <= case_.deadlineTime : null;

  return db.weeklyIncidentLeaderboard.upsert({
    where: {
      caseId_userId: { caseId, userId },
    },
    create: {
      userId,
      caseId,
      completedAt: data.completedAt && wasCompleted ? data.completedAt : null,
      timeTakenMin: data.timeTakenMin,
      evidenceBoardScore: data.evidenceBoardScore,
      reportScore: data.reportScore,
      score: data.score ?? 0,
    },
    update: {
      completedAt: data.completedAt && wasCompleted ? data.completedAt : undefined,
      timeTakenMin: data.timeTakenMin,
      evidenceBoardScore: data.evidenceBoardScore,
      reportScore: data.reportScore,
      score: data.score,
    },
  });
}

/**
 * Issue certificates for all users who completed a weekly case on time.
 * Called after the deadline.
 */
export async function issueWeeklyCertificates(caseId: string): Promise<number> {
  const case_ = await getWeeklyCaseById(caseId);
  if (!case_) throw new Error("Case not found");

  // Check if certificate already exists
  const existing = await db.weeklyIncidentCertificate.findUnique({
    where: { caseId },
  });
  if (existing) return 0;

  // Get all users who completed on time
  const completers = await db.weeklyIncidentLeaderboard.findMany({
    where: {
      caseId,
      completedAt: {
        not: null,
        lte: case_.deadlineTime,
      },
    },
    select: { userId: true },
  });

  if (completers.length === 0) {
    // No completers — still create a cert record for tracking, but it won't be issued
    return 0;
  }

  // Create one certificate record per case (certs are case-level, not per-user)
  // The cert code includes season and week info
  const certCode = `WIC-${case_.season}-W${String(case_.weekNumber).padStart(2, "0")}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const cert = await db.weeklyIncidentCertificate.create({
    data: {
      caseId,
      season: case_.season,
      weekNumber: case_.weekNumber,
      certCode,
    },
  });

  return completers.length;
}

/**
 * Background job: Release a new weekly incident case.
 * This is called every Monday at 00:00 UTC.
 * For now, we just define the function — scheduling happens via a separate job queue.
 */
export async function releaseWeeklyIncident(): Promise<{ released: boolean; caseId?: string; error?: string }> {
  // Find the next unpublished weekly case
  const nextCase = await db.weeklyIncidentCase.findFirst({
    where: {
      published: false,
      releaseTime: { lte: new Date() },
    },
    orderBy: { releaseTime: "asc" },
  });

  if (!nextCase) {
    return { released: false, error: "No unpublished cases to release" };
  }

  // Mark as published
  await db.weeklyIncidentCase.update({
    where: { id: nextCase.id },
    data: { published: true },
  });

  return { released: true, caseId: nextCase.id };
}

/**
 * Background job: Compute and denormalize leaderboard ranks.
 * This is called every Monday at 01:00 UTC (after release).
 */
export async function computeWeeklyLeaderboardRanksJob(): Promise<{ processed: number; caseId?: string }> {
  // Find the most recently released case
  const recentCase = await db.weeklyIncidentCase.findFirst({
    where: { published: true },
    orderBy: { releaseTime: "desc" },
  });

  if (!recentCase) {
    return { processed: 0 };
  }

  // Only compute ranks if we're past the deadline
  const now = new Date();
  if (now < recentCase.deadlineTime) {
    return { processed: 0 };
  }

  const count = await computeWeeklyLeaderboardRanks(recentCase.id);
  return { processed: count, caseId: recentCase.id };
}

/**
 * Background job: Issue certificates for all completers.
 * This is called every Monday at 02:00 UTC (after rank computation).
 */
export async function issueWeeklyCertificatesJob(): Promise<{ issued: number; caseId?: string }> {
  // Find the most recently released case that doesn't have a certificate yet
  const caseWithoutCert = await db.weeklyIncidentCase.findFirst({
    where: {
      published: true,
      certificate: null,
    },
    orderBy: { releaseTime: "desc" },
  });

  if (!caseWithoutCert) {
    return { issued: 0 };
  }

  try {
    const count = await issueWeeklyCertificates(caseWithoutCert.id);
    return { issued: count, caseId: caseWithoutCert.id };
  } catch (err) {
    console.error("[issueWeeklyCertificatesJob] Error:", err);
    return { issued: 0, caseId: caseWithoutCert.id };
  }
}
