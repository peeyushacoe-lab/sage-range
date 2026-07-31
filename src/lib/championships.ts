/**
 * Monthly Championship service.
 *
 * Scoring rules live in src/lib/championship-scoring.ts; this file only reads
 * and writes. The split matters because concluding a championship issues
 * certificates, and those rules need to be testable without a database.
 */

import { db } from "@/lib/db";
import {
  monthWindowUTC,
  monthOf,
  nextMonth,
  championshipSlug,
  championshipTitle,
  rankEntries,
  tierEarnsCertificate,
  championshipCertCode,
  type ChampionshipTier,
} from "@/lib/championship-scoring";

export type ChampionshipResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): ChampionshipResult<never> => ({
  success: false,
  error,
  statusCode,
});

/** How many challenges a generated championship draws. */
export const CHALLENGE_COUNT = 20;

export async function getActiveChampionship() {
  const now = new Date();
  return db.championship.findFirst({
    where: { published: true, status: "ACTIVE", startsAt: { lte: now }, endsAt: { gte: now } },
    orderBy: { startsAt: "desc" },
  });
}

export async function getChampionshipBySlug(slug: string) {
  return db.championship.findUnique({ where: { slug } });
}

export async function listChampionships(limit = 12) {
  return db.championship.findMany({
    where: { published: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: limit,
    include: { _count: { select: { entries: true } } },
  });
}

/**
 * Create the championship for a given month if it does not exist.
 *
 * Idempotent on (year, month), which is what lets the rollover cron be retried
 * or run twice in a month without producing a duplicate event.
 */
export async function openChampionship(
  year: number,
  month: number,
): Promise<ChampionshipResult<{ id: string; slug: string; created: boolean }>> {
  const slug = championshipSlug(year, month);

  const existing = await db.championship.findUnique({ where: { year_month: { year, month } } });
  if (existing) {
    return { success: true, data: { id: existing.id, slug: existing.slug, created: false } };
  }

  // Draw the challenge set from published labs. Ordering by id keeps the
  // selection deterministic for a given catalogue rather than reshuffling on
  // every retry.
  const labs = await db.lab.findMany({
    where: { published: true },
    select: { slug: true },
    orderBy: { id: "asc" },
  });

  if (labs.length === 0) {
    return fail("No published labs to build a championship from", 409);
  }

  // Rotate the window through the catalogue so consecutive months differ even
  // when the catalogue is smaller than the challenge count.
  const offset = ((year * 12 + month) * CHALLENGE_COUNT) % labs.length;
  const labSlugs: string[] = [];
  for (let i = 0; i < Math.min(CHALLENGE_COUNT, labs.length); i++) {
    labSlugs.push(labs[(offset + i) % labs.length].slug);
  }

  const { startsAt, endsAt } = monthWindowUTC(year, month);
  const now = new Date();

  const created = await db.championship.create({
    data: {
      slug,
      title: championshipTitle(year, month),
      description:
        `${labSlugs.length} challenges, one month, one leaderboard. ` +
        "Solve as many as you can before the month closes — the podium and the " +
        "top finalists earn a verifiable certificate.",
      year,
      month,
      startsAt,
      endsAt,
      labSlugs,
      status: now >= startsAt && now <= endsAt ? "ACTIVE" : "SCHEDULED",
      published: true,
    },
    select: { id: true, slug: true },
  });

  return { success: true, data: { ...created, created: true } };
}

/** Enter the current user. Entering a concluded championship is refused. */
export async function joinChampionship(
  userId: string,
  slug: string,
): Promise<ChampionshipResult<{ entryId: string }>> {
  const championship = await db.championship.findUnique({ where: { slug } });
  if (!championship || !championship.published) return fail("Championship not found", 404);
  if (championship.status === "CONCLUDED") return fail("This championship has closed", 409);
  if (new Date() > championship.endsAt) return fail("This championship has closed", 409);

  const entry = await db.championshipEntry.upsert({
    where: { championshipId_userId: { championshipId: championship.id, userId } },
    create: { championshipId: championship.id, userId },
    update: {},
    select: { id: true },
  });

  return { success: true, data: { entryId: entry.id } };
}

/**
 * Recompute one entrant's score from their solved labs.
 *
 * Only solves inside the championship window count. Reading the window from
 * the championship rather than "the last 30 days" is what stops a solve from
 * scoring in two consecutive months.
 */
export async function syncEntryScore(
  championshipId: string,
  userId: string,
): Promise<ChampionshipResult<{ score: number; solved: number }>> {
  const championship = await db.championship.findUnique({ where: { id: championshipId } });
  if (!championship) return fail("Championship not found", 404);

  const labSlugs = (championship.labSlugs ?? []) as string[];
  if (labSlugs.length === 0) return { success: true, data: { score: 0, solved: 0 } };

  const attempts = await db.attempt.findMany({
    where: {
      userId,
      status: "SOLVED",
      solvedAt: { gte: championship.startsAt, lte: championship.endsAt },
      lab: { slug: { in: labSlugs } },
    },
    select: { score: true, solvedAt: true, labId: true },
    distinct: ["labId"],
  });

  const score = attempts.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const lastSolvedAt = attempts.reduce<Date | null>(
    (latest, a) => (a.solvedAt && (!latest || a.solvedAt > latest) ? a.solvedAt : latest),
    null,
  );

  await db.championshipEntry.updateMany({
    where: { championshipId, userId },
    data: { score, solved: attempts.length, lastSolvedAt },
  });

  return { success: true, data: { score, solved: attempts.length } };
}

/** Refresh every entrant's score. Used by the live leaderboard and the cron. */
export async function syncAllScores(championshipId: string): Promise<number> {
  const entries = await db.championshipEntry.findMany({
    where: { championshipId },
    select: { userId: true },
  });

  for (const entry of entries) {
    await syncEntryScore(championshipId, entry.userId);
  }
  return entries.length;
}

export async function getLeaderboard(championshipId: string, limit = 100) {
  const entries = await db.championshipEntry.findMany({
    where: { championshipId, user: { hidden: false } },
    include: {
      user: { select: { id: true, displayName: true, email: true, university: true } },
    },
  });

  const ranked = rankEntries(
    entries.map((e) => ({
      userId: e.userId,
      score: e.score,
      lastSolvedAt: e.lastSolvedAt,
    })),
  );

  const byUser = new Map(entries.map((e) => [e.userId, e]));
  return ranked.slice(0, limit).map((r) => ({
    ...r,
    entry: byUser.get(r.userId)!,
  }));
}

/**
 * Close a championship: freeze ranks and issue awards.
 *
 * Safe to run twice. Awards are unique per (championship, user), and the
 * status check short-circuits a second run, so a retried cron cannot mint a
 * second certificate for the same person.
 */
export async function concludeChampionship(
  championshipId: string,
): Promise<ChampionshipResult<{ ranked: number; awarded: number; alreadyConcluded: boolean }>> {
  const championship = await db.championship.findUnique({ where: { id: championshipId } });
  if (!championship) return fail("Championship not found", 404);

  if (championship.status === "CONCLUDED") {
    return { success: true, data: { ranked: 0, awarded: 0, alreadyConcluded: true } };
  }

  // Bring scores up to date before freezing them, so a solve in the final
  // minutes is not lost.
  await syncAllScores(championshipId);

  const entries = await db.championshipEntry.findMany({
    where: { championshipId, user: { hidden: false } },
    select: { userId: true, score: true, lastSolvedAt: true },
  });

  const ranked = rankEntries(entries);

  for (const row of ranked) {
    await db.championshipEntry.updateMany({
      where: { championshipId, userId: row.userId },
      data: { rank: row.rank },
    });
  }

  // Only entrants who actually scored can place: a certificate for solving
  // nothing would devalue every other one.
  const awardable = ranked.filter((r) => tierEarnsCertificate(r.tier) && r.score > 0);

  let awarded = 0;
  for (const row of awardable) {
    const existing = await db.championshipAward.findUnique({
      where: { championshipId_userId: { championshipId, userId: row.userId } },
      select: { id: true },
    });
    if (existing) continue;

    await db.championshipAward.create({
      data: {
        championshipId,
        userId: row.userId,
        rank: row.rank,
        tier: row.tier as ChampionshipTier,
        certCode: championshipCertCode(championship.year, championship.month, row.rank),
      },
    });
    awarded++;
  }

  await db.championship.update({
    where: { id: championshipId },
    data: { status: "CONCLUDED", concludedAt: new Date() },
  });

  return { success: true, data: { ranked: ranked.length, awarded, alreadyConcluded: false } };
}

/**
 * Monthly rollover: conclude anything whose month has ended, then open the
 * championship for the current month and activate it.
 */
export async function rolloverChampionships(now: Date = new Date()) {
  const concluded: string[] = [];

  const expired = await db.championship.findMany({
    where: { status: { in: ["SCHEDULED", "ACTIVE"] }, endsAt: { lt: now } },
    select: { id: true, slug: true },
  });
  for (const c of expired) {
    const result = await concludeChampionship(c.id);
    if (result.success && !result.data.alreadyConcluded) concluded.push(c.slug);
  }

  const { year, month } = monthOf(now);
  const opened = await openChampionship(year, month);
  if (!opened.success) {
    return { concluded, opened: null, error: opened.error };
  }

  // A championship created ahead of its month starts SCHEDULED; flip it once
  // the month arrives.
  await db.championship.updateMany({
    where: { id: opened.data.id, status: "SCHEDULED", startsAt: { lte: now }, endsAt: { gte: now } },
    data: { status: "ACTIVE" },
  });

  // Prepare next month too, so the event is visible before it opens.
  const upcoming = nextMonth(year, month);
  await openChampionship(upcoming.year, upcoming.month);

  return {
    concluded,
    opened: opened.data.created ? opened.data.slug : null,
    current: opened.data.slug,
    error: null,
  };
}

/** Public award lookup for the certificate page. */
export async function verifyChampionshipAward(certCode: string) {
  const award = await db.championshipAward.findUnique({
    where: { certCode },
    include: {
      user: { select: { displayName: true, email: true } },
      championship: { select: { title: true, slug: true, year: true, month: true } },
    },
  });
  if (!award) return null;

  return {
    certCode: award.certCode,
    // Never publish a full email address on an unauthenticated page.
    holder: award.user.displayName || award.user.email.split("@")[0],
    championship: award.championship.title,
    championshipSlug: award.championship.slug,
    rank: award.rank,
    tier: award.tier,
    issuedAt: award.issuedAt,
  };
}
