import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import {
  recomputeAllHintQualityScores,
  cleanupExpiredHintSequences,
} from "@/lib/ai-mentor";

/**
 * Daily mentor maintenance: refresh aggregate hint quality from the latest
 * ratings, then drop MentorHintSequence rows past their 90-day expiry so
 * those hints become replay-eligible again.
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const startTime = Date.now();

  try {
    const recomputed = await recomputeAllHintQualityScores();
    const cleaned = await cleanupExpiredHintSequences();

    return NextResponse.json({
      success: true,
      recomputed,
      cleaned,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Mentor hint quality job failed:", error);
    return NextResponse.json(
      {
        error: "mentor_job_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes schedules with GET; keep POST for manual/external triggers.
export const GET = POST;
