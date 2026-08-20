/**
 * Month arithmetic, ranking and award tiers for the Monthly Championship.
 *
 * Pure functions with no database imports, for the same reason as
 * src/lib/ranking.ts: these decide who is named champion and who receives a
 * certificate, so the rules are tested directly rather than inferred from the
 * behaviour of a cron job.
 */

export type ChampionshipTier = "CHAMPION" | "MEDALLIST" | "FINALIST" | "COMPETITOR";

export type RankableEntry = {
  userId: string;
  score: number;
  /** When the entrant last scored. Used to break ties. */
  lastSolvedAt: Date | null;
};

export type RankedEntry = RankableEntry & { rank: number; tier: ChampionshipTier };

/** Podium is fixed; the finalist band scales with turnout. */
export const FINALIST_FRACTION = 0.1;
/** Below this many entrants, a percentage band is meaningless. */
export const MIN_ENTRANTS_FOR_FINALISTS = 10;

/**
 * UTC window for a calendar month.
 *
 * `month` is 1-12. The end is the last instant of the month rather than the
 * first instant of the next, so a comparison against `endsAt` cannot admit a
 * submission that belongs to the following championship.
 */
export function monthWindowUTC(year: number, month: number): { startsAt: Date; endsAt: Date } {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be 1-12, received ${month}`);
  }
  const startsAt = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Date.UTC normalises month 12 (index 12) into January of the next year, so
  // December needs no special case.
  const endsAt = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - 1);
  return { startsAt, endsAt };
}

/** The month following the one given, rolling the year over at December. */
export function nextMonth(year: number, month: number): { year: number; month: number } {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be 1-12, received ${month}`);
  }
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** The month containing an instant, in UTC. */
export function monthOf(date: Date): { year: number; month: number } {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Stable slug, zero-padded so slugs sort lexicographically by date. */
export function championshipSlug(year: number, month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be 1-12, received ${month}`);
  }
  return `championship-${year}-${String(month).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function championshipTitle(year: number, month: number): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be 1-12, received ${month}`);
  }
  return `${MONTH_NAMES[month - 1]} ${year} Championship`;
}

/**
 * Rank entrants highest score first, breaking ties in favour of whoever
 * reached that score earliest.
 *
 * Without the tie-break, two entrants on the same score would be ordered
 * arbitrarily by the database, and the podium would shift between page loads.
 * Ranking is competition-style (1, 2, 2, 4) so joint second is reported
 * honestly rather than one of them being pushed to third.
 */
export function rankEntries(entries: readonly RankableEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const at = a.lastSolvedAt?.getTime() ?? Infinity;
    const bt = b.lastSolvedAt?.getTime() ?? Infinity;
    if (at !== bt) return at - bt;
    // Final tie-break on id keeps the order stable across runs.
    return a.userId.localeCompare(b.userId);
  });

  const total = sorted.length;
  const ranked: RankedEntry[] = [];

  let previous: RankableEntry | null = null;
  let previousRank = 0;

  sorted.forEach((entry, index) => {
    // Only an identical score *and* timestamp is a genuine tie; sharing a
    // score but finishing later is a lower placing.
    const tied =
      previous !== null &&
      previous.score === entry.score &&
      (previous.lastSolvedAt?.getTime() ?? Infinity) ===
        (entry.lastSolvedAt?.getTime() ?? Infinity);

    const rank = tied ? previousRank : index + 1;
    ranked.push({ ...entry, rank, tier: tierForRank(rank, total) });
    previous = entry;
    previousRank = rank;
  });

  return ranked;
}

/**
 * Award tier for a placing.
 *
 * Entrants who scored nothing are still COMPETITOR — participation is not an
 * award in itself, and the caller decides whether to issue anything for it.
 */
export function tierForRank(rank: number, totalEntrants: number): ChampionshipTier {
  if (rank <= 0) throw new RangeError(`rank must be positive, received ${rank}`);
  if (rank === 1) return "CHAMPION";
  if (rank <= 3) return "MEDALLIST";

  // The finalist band only applies once the field is big enough for a
  // percentage to mean anything; in a field of six, "top 10%" is just the
  // winner, who already has a better tier.
  if (totalEntrants >= MIN_ENTRANTS_FOR_FINALISTS) {
    const cutoff = Math.max(3, Math.floor(totalEntrants * FINALIST_FRACTION));
    if (rank <= cutoff) return "FINALIST";
  }
  return "COMPETITOR";
}

/**
 * Whether a tier earns a certificate.
 *
 * The podium only. FINALIST used to qualify too, which in a field of forty
 * minted four extra certificates a month for placings nobody announces — a
 * credential handed to the top 10% is a credential worth less to the top 3.
 * The tier itself is still computed and still shown on the board; it simply
 * does not come with a certificate.
 */
export function tierEarnsCertificate(tier: ChampionshipTier): boolean {
  return tier === "CHAMPION" || tier === "MEDALLIST";
}

/**
 * Certificate code, e.g. MCH-2026-08-1-K7QR4M.
 *
 * Excludes I, O, 0 and 1 so a code read aloud or copied off a screenshot is
 * unambiguous — the same alphabet as the credential codes.
 */
export function championshipCertCode(
  year: number,
  month: number,
  rank: number,
  random: () => number = Math.random,
): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(random() * alphabet.length)];
  }
  return `MCH-${year}-${String(month).padStart(2, "0")}-${rank}-${suffix}`;
}
