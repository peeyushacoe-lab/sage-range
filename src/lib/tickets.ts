import { db } from "@/lib/db";
import type { ShiftTicket, ShiftTicketTriage, TicketQueueLeaderboard } from "@prisma/client";

/**
 * Ticket Queue Simulator Library
 *
 * Core functions for SOC shift ticket management, triage decisions, and leaderboard scoring.
 * Implements SLA enforcement, accuracy-based scoring, and speed-based tiebreakers.
 */

// SLA minutes by severity level
const SLA_MINUTES: Record<string, number> = {
  CRITICAL: 60,
  HIGH: 240,
  MEDIUM: 480,
  LOW: 1440,
};

export interface TicketQueueResponse {
  id: string;
  queuePosition: number;
  severity: string;
  category: string;
  title: string;
  rawAlert: Record<string, unknown>;
  slaDeadlineMinutes: number;
  createdAt: Date;
}

export interface TriageDecisionResponse {
  ticketId: string;
  userAction: string;
  confidence: number;
  scoreAwarded: number;
  pending: boolean;
  message: string;
}

export interface QueueProgressResponse {
  completedTickets: number;
  totalTickets: number;
  accuracy: number;
  timeSoFar: number;
  deadline: Date;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  accuracy: number;
  speed: number;
  slaViolations: number;
  falsePositives: number;
  missedCritical: number;
  score: number;
  rank: number | null;
  completedAt?: Date | null;
}

// ── Ticket Queue Operations ──────────────────────────────────────────────────

/**
 * Fetch active ticket queue for a shift, ordered by position.
 * Includes SLA countdown calculated from createdAt + slaMinutes.
 */
export async function getTicketQueue(shiftId: string): Promise<TicketQueueResponse[]> {
  const shift = await db.socShift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Shift not found");

  const tickets = await db.shiftTicket.findMany({
    where: { shiftId, resolvedAt: null, archivedAt: null },
    orderBy: { queuePosition: "asc" },
  });

  return tickets.map((ticket) => {
    const slaDuration = SLA_MINUTES[ticket.severity] || 480;
    const deadline = new Date(ticket.createdAt.getTime() + slaDuration * 60 * 1000);
    const now = new Date();
    const minutesRemaining = Math.ceil((deadline.getTime() - now.getTime()) / 1000 / 60);

    return {
      id: ticket.id,
      queuePosition: ticket.queuePosition,
      severity: ticket.severity,
      category: ticket.category,
      title: ticket.title,
      rawAlert: (ticket.rawAlert as Record<string, unknown>) || {},
      slaDeadlineMinutes: minutesRemaining,
      createdAt: ticket.createdAt,
    };
  });
}

/**
 * Submit a triage decision for a ticket.
 * Creates ShiftTicketTriage entry and marks ticket as resolved.
 * Returns pending scoring (admin review required for final points).
 */
export async function submitTriagDecision(
  ticketId: string,
  shiftId: string,
  attemptId: string,
  userAction: string,
  confidence: number,
  resolution?: string,
): Promise<TriageDecisionResponse> {
  // Validate inputs
  if (!["CLOSED", "ESCALATED", "RESOLVED", "IGNORED", "MONITOR"].includes(userAction)) {
    throw new Error("Invalid user action");
  }
  if (confidence < 0 || confidence > 100) {
    throw new Error("Confidence must be 0-100");
  }

  // Verify ticket and attempt
  const ticket = await db.shiftTicket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.shiftId !== shiftId) {
    throw new Error("Ticket not found");
  }

  const attempt = await db.socShiftAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.shiftId !== shiftId) {
    throw new Error("Attempt not found");
  }

  // Check if shift is still active
  const shift = await db.socShift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Shift not found");

  const deadline = new Date(attempt.startedAt.getTime() + shift.timeLimitSec * 1000);
  if (new Date() > deadline) {
    throw new Error("Shift time expired");
  }

  // Calculate triage time (seconds from shift start to decision)
  const triageTime = Math.round((new Date().getTime() - attempt.startedAt.getTime()) / 1000);

  // Create triage entry
  const triage = await db.shiftTicketTriage.create({
    data: {
      ticketId,
      attemptId,
      userAction,
      confidence,
      resolution: resolution || null,
      triageTime,
      isCorrect: null, // Pending admin review
      pointsAward: 0, // Pending grading
    },
  });

  // Mark ticket as resolved
  await db.shiftTicket.update({
    where: { id: ticketId },
    data: { resolvedAt: new Date(), firstViewedAt: ticket.firstViewedAt || new Date() },
  });

  // Calculate provisional score (baseline only, pending admin grading)
  const slaDuration = SLA_MINUTES[ticket.severity] || 480;
  const deadline_ms = ticket.createdAt.getTime() + slaDuration * 60 * 1000;
  const slaViolated = new Date().getTime() > deadline_ms;
  let scoreAwarded = 100; // Baseline
  if (slaViolated) scoreAwarded -= 100; // SLA violation penalty
  else scoreAwarded += 50; // Speed bonus

  return {
    ticketId,
    userAction,
    confidence,
    scoreAwarded,
    pending: true,
    message: "Decision recorded. Awaiting admin grading for final score.",
  };
}

/**
 * Get real-time progress on an active shift attempt.
 * Calculates completed tickets, accuracy so far, and time remaining.
 */
export async function getTicketQueueProgress(
  shiftId: string,
  attemptId: string,
): Promise<QueueProgressResponse> {
  const attempt = await db.socShiftAttempt.findUnique({
    where: { id: attemptId },
    include: { shift: true },
  });

  if (!attempt) throw new Error("Attempt not found");

  const totalTickets = await db.shiftTicket.count({
    where: { shiftId, archivedAt: null },
  });

  const completedTickets = await db.shiftTicketTriage.count({
    where: { attemptId },
  });

  // Calculate accuracy from triages with isCorrect grading
  const triages = await db.shiftTicketTriage.findMany({
    where: { attemptId },
  });

  const correctCount = triages.filter((t) => t.isCorrect === true).length;
  const accuracy = triages.length > 0 ? (correctCount / triages.length) * 100 : 0;

  // Time elapsed
  const timeSoFar = Math.round(
    (new Date().getTime() - attempt.startedAt.getTime()) / 1000,
  );
  const deadline = new Date(
    attempt.startedAt.getTime() + attempt.shift.timeLimitSec * 1000,
  );

  return {
    completedTickets,
    totalTickets,
    accuracy: Math.round(accuracy),
    timeSoFar,
    deadline,
  };
}

// ── Leaderboard Operations ───────────────────────────────────────────────────

/**
 * Get leaderboard for a specific shift.
 * Sorted by score DESC, then speed ASC for tiebreaker.
 * Top 100 entries only.
 */
export async function getTicketLeaderboard(
  shiftId: string,
  limit = 100,
): Promise<LeaderboardEntry[]> {
  const leaderboard = await db.ticketQueueLeaderboard.findMany({
    where: { shiftId, scope: "ALL_TIME" },
    include: { user: true },
    orderBy: [{ score: "desc" }, { speed: "asc" }],
    take: limit,
  });

  return leaderboard.map((entry, index) => ({
    userId: entry.userId,
    displayName: entry.user.displayName || entry.user.email,
    accuracy: entry.accuracy,
    speed: entry.speed,
    slaViolations: entry.slaViolations,
    falsePositives: entry.falsePositives,
    missedCritical: entry.missedCritical,
    score: entry.score,
    rank: entry.rank || (index + 1),
    completedAt: entry.completedAt,
  }));
}

/**
 * Get weekly leaderboard aggregating across all shifts in past 7 days.
 */
export async function getWeeklyTicketLeaderboard(): Promise<LeaderboardEntry[]> {
  const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);

  const leaderboard = await db.ticketQueueLeaderboard.findMany({
    where: {
      scope: "WEEKLY",
      createdAt: { gte: sevenDaysAgo },
    },
    include: { user: true },
    orderBy: [{ score: "desc" }, { speed: "asc" }],
    take: 100,
  });

  return leaderboard.map((entry, index) => ({
    userId: entry.userId,
    displayName: entry.user.displayName || entry.user.email,
    accuracy: entry.accuracy,
    speed: entry.speed,
    slaViolations: entry.slaViolations,
    falsePositives: entry.falsePositives,
    missedCritical: entry.missedCritical,
    score: entry.score,
    rank: entry.rank || (index + 1),
    completedAt: entry.completedAt,
  }));
}

// ── User History ─────────────────────────────────────────────────────────────

/**
 * Get user's ticket submission history with pagination.
 * Includes grading status (isCorrect from admin review).
 */
export async function getUserTicketHistory(
  userId: string,
  limit = 20,
  offset = 0,
): Promise<Array<{
  ticketId: string;
  shiftId: string;
  shiftTitle: string;
  userAction: string;
  confidence: number;
  triageTime: number;
  isCorrect?: boolean | null;
  pointsAward: number;
  createdAt: Date;
}>> {
  const triages = await db.shiftTicketTriage.findMany({
    where: {
      attempt: { userId },
    },
    include: {
      ticket: {
        include: {
          shift: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return triages.map((triage) => ({
    ticketId: triage.ticketId,
    shiftId: triage.ticket.shiftId,
    shiftTitle: triage.ticket.shift.title,
    userAction: triage.userAction,
    confidence: triage.confidence,
    triageTime: triage.triageTime,
    isCorrect: triage.isCorrect,
    pointsAward: triage.pointsAward,
    createdAt: triage.createdAt,
  }));
}

// ── Admin Grading ────────────────────────────────────────────────────────────

/**
 * Grade a ticket triage decision and update score.
 * Admin-only: sets isCorrect, pointsAward, and triggers leaderboard recalculation.
 */
export async function gradeTicketTriage(
  ticketId: string,
  isCorrect: boolean,
  pointsAward: number,
): Promise<void> {
  const triage = await db.shiftTicketTriage.findUnique({
    where: { ticketId },
    include: { ticket: { include: { shift: true } }, attempt: true },
  });

  if (!triage) throw new Error("Triage record not found");

  // Update triage with grading
  await db.shiftTicketTriage.update({
    where: { id: triage.id },
    data: {
      isCorrect,
      pointsAward,
    },
  });

  // Recalculate leaderboard score for this user/shift
  await recalculateLeaderboardScore(triage.attempt.userId, triage.ticket.shiftId);
}

/**
 * Recalculate a user's leaderboard score for a specific shift.
 * Called after grading changes; recomputes accuracy, penalties, and final score.
 */
async function recalculateLeaderboardScore(userId: string, shiftId: string): Promise<void> {
  // Fetch all triages for this user's attempt on this shift
  const attempt = await db.socShiftAttempt.findFirst({
    where: { userId, shiftId },
    orderBy: { startedAt: "desc" },
  });

  if (!attempt) return;

  const triages = await db.shiftTicketTriage.findMany({
    where: { attemptId: attempt.id },
    include: { ticket: true },
  });

  if (triages.length === 0) return;

  // Calculate metrics
  let correctCount = 0;
  let slaViolations = 0;
  let falsePositives = 0;
  let missedCritical = 0;
  let totalTime = 0;

  triages.forEach((triage) => {
    // Accuracy
    if (triage.isCorrect === true) correctCount++;

    // SLA violations
    const slaDuration = SLA_MINUTES[triage.ticket.severity] || 480;
    const deadline = new Date(triage.ticket.createdAt.getTime() + slaDuration * 60 * 1000);
    if (triage.ticket.resolvedAt && triage.ticket.resolvedAt > deadline) {
      slaViolations++;
    }

    // False positives & missed critical (derived from grading)
    if (triage.isCorrect === false) {
      if (triage.userAction === "ESCALATED") falsePositives++;
      else if (triage.userAction === "IGNORED" || triage.userAction === "CLOSED") {
        missedCritical++;
      }
    }

    totalTime += triage.triageTime;
  });

  const accuracy = (correctCount / triages.length) * 100;
  const speed = triages.length > 0 ? totalTime / triages.length : 0;

  // Calculate final score per specification
  const baseScore = correctCount * 100; // 100 pts per correct decision
  const speedBonus = correctCount > 0 ? 50 : 0;
  const slaViolationPenalty = slaViolations * 50;
  const falsePositivePenalty = falsePositives * 75;
  const missedCriticalPenalty = missedCritical * 150;

  const finalScore = Math.max(
    0,
    baseScore +
      speedBonus -
      slaViolationPenalty -
      falsePositivePenalty -
      missedCriticalPenalty,
  );

  // Update or create leaderboard entry
  const completedAt = attempt.completedAt || new Date();
  await db.ticketQueueLeaderboard.upsert({
    where: {
      shiftId_userId_scope: { shiftId, userId, scope: "ALL_TIME" },
    },
    create: {
      shiftId,
      userId,
      scope: "ALL_TIME",
      accuracy,
      speed,
      slaViolations,
      falsePositives,
      missedCritical,
      score: finalScore,
      completedAt,
    },
    update: {
      accuracy,
      speed,
      slaViolations,
      falsePositives,
      missedCritical,
      score: finalScore,
      completedAt,
    },
  });
}

// ── Leaderboard Ranking ──────────────────────────────────────────────────────

/**
 * Compute and denormalize leaderboard ranks for a shift after deadline.
 * Should be called once per shift after time expires.
 */
export async function computeTicketLeaderboardRanks(shiftId: string): Promise<void> {
  // Fetch all leaderboard entries sorted by score DESC, speed ASC
  const entries = await db.ticketQueueLeaderboard.findMany({
    where: { shiftId, scope: "ALL_TIME" },
    orderBy: [{ score: "desc" }, { speed: "asc" }],
  });

  // Update each entry with its rank
  for (let i = 0; i < entries.length; i++) {
    await db.ticketQueueLeaderboard.update({
      where: { id: entries[i].id },
      data: { rank: i + 1, rankUpdatedAt: new Date() },
    });
  }
}

/**
 * Aggregate weekly leaderboard scores across all shifts completed in the past 7 days.
 * Should be called once per week (e.g., Sunday 23:59 UTC).
 */
export async function aggregateWeeklyTicketLeaderboardJob(): Promise<void> {
  const sevenDaysAgo = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all unique users with completed shifts in the past 7 days
  const userIds = await db.ticketQueueLeaderboard.findMany({
    where: {
      scope: "ALL_TIME",
      completedAt: { gte: sevenDaysAgo },
    },
    distinct: ["userId"],
    select: { userId: true },
  });

  // For each user, sum up scores and metrics across all shifts
  for (const { userId } of userIds) {
    const shifts = await db.ticketQueueLeaderboard.findMany({
      where: {
        userId,
        scope: "ALL_TIME",
        completedAt: { gte: sevenDaysAgo },
      },
    });

    if (shifts.length === 0) continue;

    // Aggregate metrics
    const totalScore = shifts.reduce((sum, s) => sum + s.score, 0);
    const avgAccuracy = shifts.reduce((sum, s) => sum + s.accuracy, 0) / shifts.length;
    const avgSpeed = shifts.reduce((sum, s) => sum + s.speed, 0) / shifts.length;
    const totalSlaViolations = shifts.reduce((sum, s) => sum + s.slaViolations, 0);
    const totalFalsePositives = shifts.reduce((sum, s) => sum + s.falsePositives, 0);
    const totalMissedCritical = shifts.reduce((sum, s) => sum + s.missedCritical, 0);

    // Create or update weekly leaderboard
    // Use first shift's shiftId as representative (weekly is cross-shift)
    if (shifts.length > 0) {
      const firstShiftId = shifts[0].shiftId;
      await db.ticketQueueLeaderboard.upsert({
        where: {
          shiftId_userId_scope: { shiftId: firstShiftId, userId, scope: "WEEKLY" },
        },
        create: {
          shiftId: firstShiftId,
          userId,
          scope: "WEEKLY",
          accuracy: avgAccuracy,
          speed: avgSpeed,
          slaViolations: totalSlaViolations,
          falsePositives: totalFalsePositives,
          missedCritical: totalMissedCritical,
          score: totalScore,
          completedAt: new Date(),
        },
        update: {
          accuracy: avgAccuracy,
          speed: avgSpeed,
          slaViolations: totalSlaViolations,
          falsePositives: totalFalsePositives,
          missedCritical: totalMissedCritical,
          score: totalScore,
          completedAt: new Date(),
        },
      });
    }
  }
}
