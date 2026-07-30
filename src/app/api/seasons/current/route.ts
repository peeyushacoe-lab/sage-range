import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getActiveSeason, getPlayerStanding } from "@/lib/seasons";

/**
 * The running season plus, when signed in, the caller's standing in it.
 * Returns 204 when no season is active so the UI can show an off-season state
 * rather than treating it as an error.
 */
export async function GET() {
  const season = await getActiveSeason();
  if (!season) return new NextResponse(null, { status: 204 });

  const user = await getOrCreateAppUser();
  const standing = user ? await getPlayerStanding(season.id, user.id) : null;

  return NextResponse.json({
    season: {
      id: season.id,
      slug: season.slug,
      name: season.name,
      startsAt: season.startsAt,
      endsAt: season.endsAt,
    },
    standing,
  });
}
