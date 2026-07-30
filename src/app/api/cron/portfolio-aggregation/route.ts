import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { runPortfolioAggregationBatch } from "@/lib/portfolio-aggregation";

/**
 * Cron job for portfolio aggregation
 * Triggered by external cron service (e.g., EasyCron, cron-job.org)
 * with Authorization header containing the cron secret
 *
 * Usage: POST /api/cron/portfolio-aggregation
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  try {
    const startTime = Date.now();
    const results = await runPortfolioAggregationBatch();
    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: results.processed,
      errors: results.errors,
      durationMs: duration,
      errorDetails: results.errorDetails,
    });
  } catch (error) {
    console.error("Portfolio aggregation failed:", error);
    return NextResponse.json(
      {
        error: "aggregation_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Vercel Cron invokes schedules with GET; keep POST for manual/external triggers.
export const GET = POST;
