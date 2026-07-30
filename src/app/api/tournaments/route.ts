import { NextResponse } from "next/server";
import { listTournaments } from "@/lib/tournaments";

/** Tournaments open for entry, running, or recently finished. */
export async function GET() {
  const tournaments = await listTournaments();

  return NextResponse.json({
    tournaments: tournaments.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      format: t.format,
      entrantType: t.entrantType,
      status: t.status,
      entrantCount: t._count.entrants,
      maxEntrants: t.maxEntrants,
      registrationOpensAt: t.registrationOpensAt,
      registrationClosesAt: t.registrationClosesAt,
      startsAt: t.startsAt,
      completedAt: t.completedAt,
    })),
  });
}
