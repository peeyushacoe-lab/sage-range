import { NextResponse } from "next/server";
import { getTournamentBySlug } from "@/lib/tournaments";

/** Tournament detail including the full bracket, grouped by round. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tournament = await getTournamentBySlug(slug);

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const nameFor = (entrantId: string | null) => {
    if (!entrantId) return null;
    const entrant = tournament.entrants.find((e) => e.id === entrantId);
    if (!entrant) return null;
    return entrant.squad
      ? `[${entrant.squad.tag}] ${entrant.squad.name}`
      : (entrant.user?.displayName ?? entrant.user?.email ?? "Unknown");
  };

  const rounds = new Map<number, Array<Record<string, unknown>>>();
  for (const m of tournament.matches) {
    const list = rounds.get(m.round) ?? [];
    list.push({
      id: m.id,
      position: m.position,
      status: m.status,
      entrantAId: m.entrantAId,
      entrantBId: m.entrantBId,
      entrantAName: nameFor(m.entrantAId),
      entrantBName: nameFor(m.entrantBId),
      winnerId: m.winnerId,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    });
    rounds.set(m.round, list);
  }

  return NextResponse.json({
    id: tournament.id,
    slug: tournament.slug,
    name: tournament.name,
    description: tournament.description,
    format: tournament.format,
    entrantType: tournament.entrantType,
    status: tournament.status,
    maxEntrants: tournament.maxEntrants,
    registrationOpensAt: tournament.registrationOpensAt,
    registrationClosesAt: tournament.registrationClosesAt,
    startsAt: tournament.startsAt,
    completedAt: tournament.completedAt,
    season: tournament.season,
    entrants: tournament.entrants.map((e) => ({
      id: e.id,
      seed: e.seed,
      name: nameFor(e.id),
      eliminatedAt: e.eliminatedAt,
      finalRank: e.finalRank,
    })),
    bracket: [...rounds.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, matches]) => ({ round, matches })),
  });
}
