import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { aggregateWeeklyTicketLeaderboardJob } from "@/lib/tickets";

/**
 * Rebuild the WEEKLY-scope ticket queue leaderboard.
 * Scheduled for Sunday 23:59 UTC, closing the seven-day window.
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const startTime = Date.now();

  try {
    await aggregateWeeklyTicketLeaderboardJob();
    return NextResponse.json({ success: true, durationMs: Date.now() - startTime });
  } catch (error) {
    console.error("Weekly ticket leaderboard aggregation failed:", error);
    return NextResponse.json(
      {
        error: "aggregation_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes schedules with GET; keep POST for manual/external triggers.
export const GET = POST;
