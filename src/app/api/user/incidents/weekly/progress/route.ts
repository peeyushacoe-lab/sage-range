import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getUserWeeklyProgress, ensureWeeklyLeaderboardEntry } from "@/lib/weekly-incidents";

/**
 * GET /api/user/incidents/weekly/progress
 * Returns the authenticated user's progress on the current weekly incident case.
 * Automatically initializes a leaderboard entry if it doesn't exist.
 *
 * Query params:
 * - caseId?: string (defaults to current case)
 *
 * Response (200):
 * {
 *   "case": {
 *     "id": "string",
 *     "weekNumber": 1,
 *     "season": 2026,
 *     "incidentSlug": "incident-slug",
 *     "difficulty": "EASY",
 *     "releaseTime": "2026-01-05T00:00:00Z",
 *     "deadlineTime": "2026-01-12T23:59:00Z"
 *   },
 *   "progress": {
 *     "completed": false,
 *     "completedAt": null,
 *     "score": 0,
 *     "rank": null,
 *     "daysRemaining": 7,
 *     "evidenceBoardScore": null,
 *     "reportScore": null
 *   }
 * }
 *
 * Response (200): No active case
 * {
 *   "case": null,
 *   "progress": null
 * }
 *
 * Response (401): Not authenticated
 */
export async function GET(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const caseId = url.searchParams.get("caseId") || undefined;

  const progress = await getUserWeeklyProgress(user.id, caseId);

  if (!progress.case) {
    return NextResponse.json({
      case: null,
      progress: null,
    });
  }

  // Ensure the user has a leaderboard entry
  await ensureWeeklyLeaderboardEntry(user.id, progress.case.id);

  return NextResponse.json({
    case: {
      id: progress.case.id,
      weekNumber: progress.case.weekNumber,
      season: progress.case.season,
      incidentSlug: progress.case.incidentSlug,
      difficulty: progress.case.difficulty,
      releaseTime: progress.case.releaseTime.toISOString(),
      deadlineTime: progress.case.deadlineTime.toISOString(),
    },
    progress: {
      completed: !!progress.completedAt,
      completedAt: progress.completedAt?.toISOString() || null,
      score: progress.score,
      rank: progress.rank,
      daysRemaining: progress.daysRemaining,
      evidenceBoardScore: progress.leaderboardEntry?.evidenceBoardScore || null,
      reportScore: progress.leaderboardEntry?.reportScore || null,
    },
  });
}
