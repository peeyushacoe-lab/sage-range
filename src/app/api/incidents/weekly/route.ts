import { NextResponse } from "next/server";
import { getCurrentWeeklyCase } from "@/lib/weekly-incidents";

/**
 * GET /api/incidents/weekly
 * Returns the current active weekly incident case.
 * A case is active if it's published, released, and not archived.
 *
 * Response (200):
 * {
 *   "case": {
 *     "id": "string",
 *     "weekStartUTC": "2026-01-05T00:00:00Z",
 *     "weekNumber": 1,
 *     "season": 2026,
 *     "incidentSlug": "incident-slug",
 *     "difficulty": "EASY" | "MEDIUM" | "HARD" | "INSANE",
 *     "points": 1000,
 *     "releaseTime": "2026-01-05T00:00:00Z",
 *     "deadlineTime": "2026-01-12T23:59:00Z",
 *     "published": true
 *   }
 * }
 *
 * Response (204): No active case
 */
export async function GET(req: Request) {
  const case_ = await getCurrentWeeklyCase();

  if (!case_) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({
    case: {
      id: case_.id,
      weekStartUTC: case_.weekStartUTC.toISOString(),
      weekNumber: case_.weekNumber,
      season: case_.season,
      incidentSlug: case_.incidentSlug,
      difficulty: case_.difficulty,
      points: case_.points,
      releaseTime: case_.releaseTime.toISOString(),
      deadlineTime: case_.deadlineTime.toISOString(),
      published: case_.published,
    },
  });
}
