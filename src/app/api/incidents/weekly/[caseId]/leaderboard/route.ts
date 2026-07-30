import { NextResponse } from "next/server";
import { getWeeklyLeaderboard, getWeeklyCaseById } from "@/lib/weekly-incidents";

/**
 * GET /api/incidents/weekly/[caseId]/leaderboard
 * Returns the top 100 ranked participants for a weekly case.
 * Only includes users who completed the case by the deadline.
 *
 * Query params:
 * - limit?: number (default: 100, max: 100)
 *
 * Response (200):
 * {
 *   "case": { ... },
 *   "leaderboard": [
 *     {
 *       "rank": 1,
 *       "userId": "string",
 *       "displayName": "string | null",
 *       "email": "string",
 *       "score": 950,
 *       "timeTakenMin": 45,
 *       "completedAt": "2026-01-10T14:30:00Z",
 *       "evidenceBoardScore": 85,
 *       "reportScore": 90
 *     },
 *     ...
 *   ]
 * }
 *
 * Response (404): Case not found
 */
export async function GET(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;

  // Validate case exists
  const case_ = await getWeeklyCaseById(caseId);
  if (!case_) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }

  // Get limit from query params (max 100)
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "100"), 1), 100);

  const entries = await getWeeklyLeaderboard(caseId, limit);

  return NextResponse.json({
    case: {
      id: case_.id,
      weekNumber: case_.weekNumber,
      season: case_.season,
      difficulty: case_.difficulty,
      deadlineTime: case_.deadlineTime.toISOString(),
    },
    leaderboard: entries.map((entry, index) => ({
      rank: entry.rank || index + 1,
      userId: entry.userId,
      displayName: entry.user.displayName,
      email: entry.user.email,
      score: entry.score,
      timeTakenMin: entry.timeTakenMin,
      completedAt: entry.completedAt?.toISOString() || null,
      evidenceBoardScore: entry.evidenceBoardScore,
      reportScore: entry.reportScore,
    })),
  });
}
