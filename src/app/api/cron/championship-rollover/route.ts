import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { rolloverChampionships, getActiveChampionship, syncAllScores } from "@/lib/championships";

/**
 * Monthly championship rollover.
 *
 * Concludes any championship whose month has ended — freezing ranks and
 * issuing certificates — then opens the current month and prepares the next.
 *
 * Runs daily rather than only on the first of the month: a single monthly
 * firing that fails leaves the platform with no live championship for four
 * weeks. Every step is idempotent (one championship per year/month, one award
 * per entrant), so a daily run is a no-op once the month is already open.
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const startTime = Date.now();

  try {
    const result = await rolloverChampionships();

    // Keep the live board honest between page visits, which only refresh the
    // viewer's own score.
    const active = await getActiveChampionship();
    const synced = active ? await syncAllScores(active.id) : 0;

    return NextResponse.json({
      success: true,
      concluded: result.concluded,
      opened: result.opened,
      current: result.current ?? null,
      entriesSynced: synced,
      error: result.error,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Championship rollover failed:", error);
    return NextResponse.json(
      {
        error: "rollover_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes schedules with GET; keep POST for manual triggers.
export const GET = POST;
