import { db } from "@/lib/db";
import {
  BASE_RATING,
  applyMatchResult,
  assignRanks,
  seasonCarryOver,
  tierForRating,
  type RatingOutcome,
} from "@/lib/ranking";

/** The season currently accepting results, if any. */
export async function getActiveSeason() {
  const now = new Date();
  return db.season.findFirst({
    where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
  });
}

/**
 * Fetch a player's rating row, creating it at BASE_RATING on first sight so
 * callers never have to special-case an unrated player.
 */
export async function ensureRating(seasonId: string, userId: string) {
  return db.seasonRating.upsert({
    where: { seasonId_userId: { seasonId, userId } },
    create: { seasonId, userId, rating: BASE_RATING, peakRating: BASE_RATING },
    update: {},
  });
}

/**
 * Record a head-to-head result and move both players' ratings.
 *
 * Both sides are read before either is written so the pair is rated against
 * each other's pre-match values rather than one seeing the other's update.
 */
export async function recordMatchResult(params: {
  seasonId: string;
  winnerId: string;
  loserId: string;
  draw?: boolean;
}) {
  const { seasonId, winnerId, loserId } = params;
  if (winnerId === loserId) throw new Error("A player cannot face themselves");

  const [winner, loser] = await Promise.all([
    ensureRating(seasonId, winnerId),
    ensureRating(seasonId, loserId),
  ]);

  const winnerOutcome: RatingOutcome = params.draw ? "DRAW" : "WIN";
  const loserOutcome: RatingOutcome = params.draw ? "DRAW" : "LOSS";

  const winnerNext = applyMatchResult({
    rating: winner.rating,
    opponentRating: loser.rating,
    outcome: winnerOutcome,
    eventsPlayed: winner.eventsPlayed,
    peakRating: winner.peakRating,
  });

  const loserNext = applyMatchResult({
    rating: loser.rating,
    opponentRating: winner.rating,
    outcome: loserOutcome,
    eventsPlayed: loser.eventsPlayed,
    peakRating: loser.peakRating,
  });

  await db.$transaction([
    db.seasonRating.update({
      where: { seasonId_userId: { seasonId, userId: winnerId } },
      data: {
        rating: winnerNext.rating,
        tier: winnerNext.tier,
        peakRating: winnerNext.peakRating,
        eventsPlayed: { increment: 1 },
        ...(params.draw ? {} : { wins: { increment: 1 } }),
      },
    }),
    db.seasonRating.update({
      where: { seasonId_userId: { seasonId, userId: loserId } },
      data: {
        rating: loserNext.rating,
        tier: loserNext.tier,
        peakRating: loserNext.peakRating,
        eventsPlayed: { increment: 1 },
        ...(params.draw ? {} : { losses: { increment: 1 } }),
      },
    }),
  ]);

  return { winner: winnerNext, loser: loserNext };
}

/**
 * Recompute and store dense ranks for a season.
 *
 * Ranks are denormalised so the ladder page is a single indexed read instead
 * of an ordering pass over every rated player.
 */
export async function recomputeSeasonRanks(seasonId: string): Promise<number> {
  const players = await db.seasonRating.findMany({
    where: { seasonId },
    select: { id: true, rating: true },
  });
  if (players.length === 0) return 0;

  const ranked = assignRanks(players);
  const now = new Date();

  await db.$transaction(
    ranked.map((p) =>
      db.seasonRating.update({
        where: { id: p.id },
        data: { rank: p.rank, rankUpdatedAt: now },
      }),
    ),
  );

  return ranked.length;
}

/** Top of the ladder, ordered by stored rank. */
export async function getSeasonLeaderboard(seasonId: string, limit = 100) {
  const rows = await db.seasonRating.findMany({
    where: { seasonId },
    include: { user: { select: { id: true, displayName: true, email: true, avatarUrl: true } } },
    orderBy: [{ rating: "desc" }, { wins: "desc" }],
    take: Math.min(limit, 500),
  });

  return rows.map((row, index) => ({
    userId: row.userId,
    displayName: row.user.displayName || row.user.email,
    avatarUrl: row.user.avatarUrl,
    rating: row.rating,
    tier: row.tier,
    wins: row.wins,
    losses: row.losses,
    eventsPlayed: row.eventsPlayed,
    rank: row.rank ?? index + 1,
  }));
}

/** A single player's standing, including how far they are from the next tier. */
export async function getPlayerStanding(seasonId: string, userId: string) {
  const rating = await db.seasonRating.findUnique({
    where: { seasonId_userId: { seasonId, userId } },
  });
  if (!rating) return null;

  const totalPlayers = await db.seasonRating.count({ where: { seasonId } });

  return {
    rating: rating.rating,
    tier: rating.tier,
    peakRating: rating.peakRating,
    wins: rating.wins,
    losses: rating.losses,
    eventsPlayed: rating.eventsPlayed,
    rank: rating.rank,
    totalPlayers,
  };
}

/**
 * Close a season: freeze final ranks, then open the next one seeded with
 * carried-over ratings so returning players keep some of their standing.
 */
export async function concludeSeason(seasonId: string, nextSeasonId?: string) {
  await recomputeSeasonRanks(seasonId);

  await db.season.update({
    where: { id: seasonId },
    data: { active: false, concludedAt: new Date() },
  });

  if (!nextSeasonId) return { carriedOver: 0 };

  const finals = await db.seasonRating.findMany({
    where: { seasonId },
    select: { userId: true, rating: true },
  });

  for (const final of finals) {
    const carried = seasonCarryOver(final.rating);
    await db.seasonRating.upsert({
      where: { seasonId_userId: { seasonId: nextSeasonId, userId: final.userId } },
      create: {
        seasonId: nextSeasonId,
        userId: final.userId,
        rating: carried,
        peakRating: carried,
        tier: tierForRating(carried),
      },
      update: {},
    });
  }

  return { carriedOver: finals.length };
}
