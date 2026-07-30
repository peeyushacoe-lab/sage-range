import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import {
  releaseWeeklyIncident,
  computeWeeklyLeaderboardRanksJob,
  issueWeeklyCertificatesJob,
} from "@/lib/weekly-incidents";

/**
 * Weekly incident rollover — run once at Monday 00:00 UTC.
 *
 * Closes out the week that just ended (ranks, then certificates for the
 * ranked cohort) before publishing the new week's case, so a late Sunday
 * finisher is never ranked against a case that has already rotated.
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const startTime = Date.now();

  try {
    const ranks = await computeWeeklyLeaderboardRanksJob();
    const certificates = await issueWeeklyCertificatesJob();
    const released = await releaseWeeklyIncident();

    return NextResponse.json({
      success: true,
      ranked: ranks.processed,
      rankedCaseId: ranks.caseId,
      certificatesIssued: certificates.issued,
      released: released.released,
      releasedCaseId: released.caseId,
      releaseError: released.error,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Weekly incident rollover failed:", error);
    return NextResponse.json(
      {
        error: "rollover_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes schedules with GET; keep POST for manual/external triggers.
export const GET = POST;
