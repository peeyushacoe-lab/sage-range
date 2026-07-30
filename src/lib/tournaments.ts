import { db } from "@/lib/db";
import {
  buildSingleEliminationBracket,
  nextSlot,
  roundCount,
  type Seeded,
} from "@/lib/bracket";

export type TournamentResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): TournamentResult<never> => ({
  success: false,
  error,
  statusCode,
});

/** Tournaments open for registration or already under way. */
export async function listTournaments(limit = 50) {
  return db.tournament.findMany({
    where: { status: { in: ["REGISTRATION", "IN_PROGRESS", "COMPLETED"] } },
    include: { _count: { select: { entrants: true } } },
    orderBy: [{ startsAt: "desc" }],
    take: limit,
  });
}

export async function getTournamentBySlug(slug: string) {
  return db.tournament.findUnique({
    where: { slug },
    include: {
      entrants: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          squad: { select: { id: true, name: true, tag: true, slug: true } },
        },
        orderBy: { seed: "asc" },
      },
      matches: { orderBy: [{ round: "asc" }, { position: "asc" }] },
      season: { select: { id: true, name: true, slug: true } },
    },
  });
}

/**
 * Register an entrant. Solo tournaments take a userId, squad tournaments take
 * a squadId; supplying the wrong one for the format is rejected.
 */
export async function registerEntrant(params: {
  tournamentId: string;
  userId?: string;
  squadId?: string;
}): Promise<TournamentResult<{ entrantId: string }>> {
  const tournament = await db.tournament.findUnique({
    where: { id: params.tournamentId },
    include: { _count: { select: { entrants: true } } },
  });

  if (!tournament) return fail("Tournament not found", 404);
  if (tournament.status !== "REGISTRATION") {
    return fail("Registration is not open", 409);
  }

  const now = new Date();
  if (now < tournament.registrationOpensAt) return fail("Registration has not opened", 409);
  if (now > tournament.registrationClosesAt) return fail("Registration has closed", 409);
  if (tournament._count.entrants >= tournament.maxEntrants) {
    return fail("Tournament is full", 409);
  }

  if (tournament.entrantType === "SOLO") {
    if (!params.userId) return fail("This tournament is for solo entrants", 400);
    if (params.squadId) return fail("This tournament does not accept squads", 400);
  } else {
    if (!params.squadId) return fail("This tournament is for squads", 400);
    if (params.userId) return fail("This tournament does not accept solo entrants", 400);
  }

  const duplicate = await db.tournamentEntrant.findFirst({
    where: {
      tournamentId: params.tournamentId,
      ...(params.userId ? { userId: params.userId } : { squadId: params.squadId }),
    },
  });
  if (duplicate) return fail("Already registered", 409);

  const entrant = await db.tournamentEntrant.create({
    data: {
      tournamentId: params.tournamentId,
      userId: params.userId ?? null,
      squadId: params.squadId ?? null,
    },
  });

  return { success: true, data: { entrantId: entrant.id } };
}

/**
 * Close registration and generate the bracket.
 *
 * Entrants are seeded by their current season rating where available, so the
 * strongest entrant receives seed 1 and meets the weakest first. Solo-only;
 * squad seeding falls back to registration order.
 */
export async function startTournament(
  tournamentId: string,
): Promise<TournamentResult<{ matches: number; rounds: number }>> {
  const tournament = await db.tournament.findUnique({
    where: { id: tournamentId },
    include: { entrants: true },
  });

  if (!tournament) return fail("Tournament not found", 404);
  if (tournament.status !== "REGISTRATION") {
    return fail("Tournament is not awaiting start", 409);
  }
  if (tournament.entrants.length < 2) {
    return fail("At least two entrants are required", 409);
  }

  const seeded = await seedEntrants(tournament.id, tournament.seasonId, tournament.entrants);
  const bracket = buildSingleEliminationBracket(seeded);

  await db.$transaction([
    ...seeded.map((s, i) =>
      db.tournamentEntrant.update({
        where: { id: s.entrantId },
        data: { seed: i + 1 },
      }),
    ),
    db.tournamentMatch.createMany({
      data: bracket.map((m) => ({
        tournamentId,
        round: m.round,
        position: m.position,
        entrantAId: m.entrantAId,
        entrantBId: m.entrantBId,
        winnerId: m.winnerId,
        // A bye is already decided; a real pairing is ready to play.
        status: m.winnerId
          ? ("WALKOVER" as const)
          : m.entrantAId && m.entrantBId
            ? ("READY" as const)
            : ("PENDING" as const),
        completedAt: m.winnerId ? new Date() : null,
      })),
    }),
    db.tournament.update({
      where: { id: tournamentId },
      data: { status: "IN_PROGRESS" },
    }),
  ]);

  // Byes must be walked forward so round 2 shows its known entrants.
  await advanceResolvedMatches(tournamentId);

  return {
    success: true,
    data: { matches: bracket.length, rounds: roundCount(seeded.length) },
  };
}

/** Order entrants strongest-first, using season rating when there is one. */
async function seedEntrants(
  tournamentId: string,
  seasonId: string | null,
  entrants: Array<{ id: string; userId: string | null; createdAt: Date }>,
): Promise<Seeded[]> {
  if (!seasonId) {
    return entrants.map((e, i) => ({ entrantId: e.id, seed: i + 1 }));
  }

  const userIds = entrants.map((e) => e.userId).filter((id): id is string => !!id);
  const ratings = await db.seasonRating.findMany({
    where: { seasonId, userId: { in: userIds } },
    select: { userId: true, rating: true },
  });
  const ratingByUser = new Map(ratings.map((r) => [r.userId, r.rating]));

  return [...entrants]
    .sort((a, b) => {
      const ra = a.userId ? (ratingByUser.get(a.userId) ?? 0) : 0;
      const rb = b.userId ? (ratingByUser.get(b.userId) ?? 0) : 0;
      if (rb !== ra) return rb - ra;
      // Stable tiebreak so seeding is deterministic across runs.
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .map((e, i) => ({ entrantId: e.id, seed: i + 1 }));
}

/**
 * Report a match result and advance the winner.
 *
 * Rejects a winner who is not one of the two entrants, which is the failure
 * mode that would otherwise corrupt the rest of the bracket.
 */
export async function reportMatchResult(params: {
  matchId: string;
  winnerId: string;
  scoreA?: number;
  scoreB?: number;
}): Promise<TournamentResult<{ advancedTo: string | null }>> {
  const match = await db.tournamentMatch.findUnique({
    where: { id: params.matchId },
    include: { tournament: true },
  });

  if (!match) return fail("Match not found", 404);
  if (match.status === "COMPLETED") return fail("Match already reported", 409);
  if (!match.entrantAId || !match.entrantBId) {
    return fail("Match is waiting on entrants", 409);
  }
  if (params.winnerId !== match.entrantAId && params.winnerId !== match.entrantBId) {
    return fail("Winner must be one of the two entrants", 400);
  }

  const loserId =
    params.winnerId === match.entrantAId ? match.entrantBId : match.entrantAId;

  await db.$transaction([
    db.tournamentMatch.update({
      where: { id: match.id },
      data: {
        winnerId: params.winnerId,
        scoreA: params.scoreA ?? match.scoreA,
        scoreB: params.scoreB ?? match.scoreB,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    }),
    db.tournamentEntrant.update({
      where: { id: loserId },
      data: { eliminatedAt: new Date() },
    }),
  ]);

  const advancedTo = await advanceResolvedMatches(match.tournamentId);
  return { success: true, data: { advancedTo } };
}

/**
 * Push every decided match into the round above and close the tournament once
 * the final is settled. Idempotent, so it is safe to call after any report.
 */
async function advanceResolvedMatches(tournamentId: string): Promise<string | null> {
  const matches = await db.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
  if (matches.length === 0) return null;

  const totalRounds = matches.reduce((max, m) => Math.max(max, m.round), 0);
  const byKey = new Map(matches.map((m) => [`${m.round}:${m.position}`, m]));
  let lastTouched: string | null = null;

  for (const match of matches) {
    if (!match.winnerId) continue;

    const target = nextSlot(match.round, match.position, totalRounds);
    if (!target) continue;

    const next = byKey.get(`${target.round}:${target.position}`);
    if (!next) continue;

    const alreadyPlaced =
      target.slot === "A"
        ? next.entrantAId === match.winnerId
        : next.entrantBId === match.winnerId;
    if (alreadyPlaced) continue;

    const data =
      target.slot === "A"
        ? { entrantAId: match.winnerId }
        : { entrantBId: match.winnerId };

    const updated = await db.tournamentMatch.update({
      where: { id: next.id },
      data,
    });
    byKey.set(`${updated.round}:${updated.position}`, updated);
    lastTouched = updated.id;

    // Both sides present means the fixture can be played.
    if (updated.entrantAId && updated.entrantBId && updated.status === "PENDING") {
      const ready = await db.tournamentMatch.update({
        where: { id: updated.id },
        data: { status: "READY" },
      });
      byKey.set(`${ready.round}:${ready.position}`, ready);
    }
  }

  const final = byKey.get(`${totalRounds}:1`);
  if (final?.winnerId) {
    await db.$transaction([
      db.tournament.update({
        where: { id: tournamentId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
      db.tournamentEntrant.update({
        where: { id: final.winnerId },
        data: { finalRank: 1 },
      }),
    ]);
  }

  return lastTouched;
}
