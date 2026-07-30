import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkCronAuth } from "@/lib/cron-auth";
import { getActiveSeason, recomputeSeasonRanks, concludeSeason } from "@/lib/seasons";

/**
 * Nightly season maintenance.
 *
 * Recomputes denormalised ladder ranks, and closes the season once it is past
 * its end date. Concluding freezes final placements before the season is
 * marked inactive, so the archived ladder is the one players finished on.
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const startTime = Date.now();

  try {
    const season = await getActiveSeason();

    if (!season) {
      // No live season: close any that ran out while unattended.
      const stale = await db.season.findMany({
        where: { active: true, endsAt: { lt: new Date() }, concludedAt: null },
      });
      for (const s of stale) await concludeSeason(s.id);

      return NextResponse.json({
        success: true,
        ranked: 0,
        concluded: stale.length,
        durationMs: Date.now() - startTime,
      });
    }

    const ranked = await recomputeSeasonRanks(season.id);

    let concluded = false;
    if (season.endsAt <= new Date()) {
      await concludeSeason(season.id);
      concluded = true;
    }

    return NextResponse.json({
      success: true,
      seasonId: season.id,
      ranked,
      concluded,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("Season rank job failed:", error);
    return NextResponse.json(
      {
        error: "season_job_failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Vercel Cron invokes schedules with GET; keep POST for manual triggers.
export const GET = POST;
