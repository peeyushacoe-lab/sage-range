import { NextResponse } from "next/server";
import { getActiveSeason, getSeasonLeaderboard } from "@/lib/seasons";
import { getSquadSeasonLeaderboard } from "@/lib/squads";

/**
 * Season ladder. `?scope=squad` returns the squad table instead of the solo
 * one; `?seasonId=` targets a past season.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "solo";
  const limitParam = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(limitParam) ? limitParam : 100;

  let seasonId = url.searchParams.get("seasonId");
  if (!seasonId) {
    const active = await getActiveSeason();
    if (!active) return new NextResponse(null, { status: 204 });
    seasonId = active.id;
  }

  if (scope === "squad") {
    const squads = await getSquadSeasonLeaderboard(seasonId, limit);
    return NextResponse.json({ seasonId, scope, entries: squads });
  }

  const players = await getSeasonLeaderboard(seasonId, limit);
  return NextResponse.json({ seasonId, scope: "solo", entries: players });
}
