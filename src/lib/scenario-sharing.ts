/**
 * Visibility, rating and cloning rules for community scenarios.
 *
 * Pure decision functions first, thin database helpers after — the same shape
 * as src/lib/competition-access.ts. Author-generated content is the one place
 * where a permissive default is genuinely dangerous: a scenario briefing can
 * contain anything its author typed, so "who can see this" fails closed.
 */

import { db } from "@/lib/db";

export type ScenarioVisibility = "PRIVATE" | "UNLISTED" | "COMMUNITY";

export type ScenarioAcl = {
  createdById: string;
  visibility: ScenarioVisibility;
  /** Legacy flag retained from before visibility existed. */
  published: boolean;
  /** Set when a moderator has removed this from circulation. */
  takenDownAt?: Date | null;
};

export const REPORT_REASONS = [
  "INAPPROPRIATE",
  "PLAGIARISM",
  "MISLEADING",
  "SPAM",
  "OTHER",
] as const;

export type ScenarioReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_REASON_LABEL: Record<ScenarioReportReason, string> = {
  INAPPROPRIATE: "Inappropriate or harmful content",
  PLAGIARISM: "Copied from someone else's work",
  MISLEADING: "Technically wrong or misleading",
  SPAM: "Spam or advertising",
  OTHER: "Something else",
};

export function isTakenDown(scenario: ScenarioAcl): boolean {
  return scenario.takenDownAt != null;
}

export type ScenarioViewer = {
  userId: string;
  /** Admins moderate, so they can see everything. */
  isAdmin: boolean;
};

/**
 * Whether the viewer may open this scenario.
 *
 * UNLISTED is readable by anyone holding the link: it is "share privately"
 * in the sense of not being listed, not in the sense of being secret. The
 * distinction is deliberate and is why UNLISTED never appears in the gallery.
 */
export function canViewScenario(scenario: ScenarioAcl, viewer: ScenarioViewer): boolean {
  if (viewer.isAdmin) return true;
  // The author keeps access to their own taken-down work, so they can see what
  // was removed and edit it; everyone else loses it immediately.
  if (scenario.createdById === viewer.userId) return true;
  if (isTakenDown(scenario)) return false;

  switch (scenario.visibility) {
    case "COMMUNITY":
    case "UNLISTED":
      return true;
    case "PRIVATE":
      return false;
    default:
      // Unknown visibility — deny rather than assume it is shareable.
      return false;
  }
}

/** Only the author or an admin may edit. */
export function canEditScenario(scenario: ScenarioAcl, viewer: ScenarioViewer): boolean {
  return viewer.isAdmin || scenario.createdById === viewer.userId;
}

/**
 * Whether the viewer may clone this into a draft of their own.
 *
 * Cloning your own scenario is allowed — it is how you branch a variant — but
 * you cannot clone something you could not open in the first place.
 */
export function canCloneScenario(scenario: ScenarioAcl, viewer: ScenarioViewer): boolean {
  // Removed content must not be reintroduced through a fork — not even by its
  // author, and not by an admin who can still read it.
  if (isTakenDown(scenario)) return false;
  return canViewScenario(scenario, viewer);
}

/**
 * Whether the viewer may rate this scenario.
 *
 * Authors cannot rate their own work, and a private scenario has no audience
 * to rate it. Without the first rule the gallery ranking is trivially gamed.
 */
export function canRateScenario(scenario: ScenarioAcl, viewer: ScenarioViewer): boolean {
  if (scenario.createdById === viewer.userId) return false;
  if (isTakenDown(scenario)) return false;
  if (scenario.visibility === "PRIVATE") return false;
  return canViewScenario(scenario, viewer);
}

/** Whether this scenario belongs in the public gallery. */
export function appearsInGallery(scenario: ScenarioAcl): boolean {
  if (isTakenDown(scenario)) return false;
  return scenario.visibility === "COMMUNITY";
}

/**
 * Whether the viewer may set this scenario to a given visibility.
 *
 * The point of the takedown flag: without this, a moderator setting a scenario
 * to PRIVATE achieves nothing, because its author can flip it straight back to
 * COMMUNITY. Only an admin can restore a taken-down scenario, and clearing the
 * flag is a separate deliberate act.
 */
export function canSetVisibility(
  scenario: ScenarioAcl,
  viewer: ScenarioViewer,
  target: ScenarioVisibility,
): boolean {
  if (!canEditScenario(scenario, viewer)) return false;
  if (isTakenDown(scenario) && target === "COMMUNITY" && !viewer.isAdmin) return false;
  return true;
}

/**
 * Whether the viewer may report this scenario.
 *
 * You cannot report your own work, and there is nothing to report on something
 * that is not in circulation. Admins act through the review queue rather than
 * by filing reports against themselves.
 */
export function canReportScenario(scenario: ScenarioAcl, viewer: ScenarioViewer): boolean {
  if (scenario.createdById === viewer.userId) return false;
  if (isTakenDown(scenario)) return false;
  if (scenario.visibility === "PRIVATE") return false;
  return canViewScenario(scenario, viewer);
}

export type ReportStatus = "OPEN" | "UPHELD" | "DISMISSED";

/**
 * Whether a scenario warrants a moderator's attention ahead of others.
 *
 * Reports from distinct users matter more than repeated reasons: three people
 * independently flagging something is a stronger signal than one person
 * picking three categories.
 */
export function reportPriority(openReports: readonly { reporterId: string }[]): number {
  return new Set(openReports.map((r) => r.reporterId)).size;
}

export const MIN_STARS = 1;
export const MAX_STARS = 5;

export function isValidStars(stars: number): boolean {
  return Number.isInteger(stars) && stars >= MIN_STARS && stars <= MAX_STARS;
}

export type RatingSummary = { average: number; count: number };

/**
 * Average rating to one decimal place.
 *
 * An unrated scenario reports zero with a count of zero rather than being
 * treated as badly rated — the gallery uses the count to distinguish "no
 * ratings yet" from "rated poorly".
 */
export function summariseRatings(stars: readonly number[]): RatingSummary {
  const valid = stars.filter(isValidStars);
  if (valid.length === 0) return { average: 0, count: 0 };
  const mean = valid.reduce((sum, s) => sum + s, 0) / valid.length;
  return { average: Math.round(mean * 10) / 10, count: valid.length };
}

/**
 * Ranking score for the gallery.
 *
 * A bare average lets a single five-star rating outrank a scenario with fifty
 * ratings averaging 4.6, so this pulls low-count scores toward the mean until
 * enough ratings accumulate (a Bayesian prior, as used for film rankings).
 */
export const RATING_PRIOR_WEIGHT = 5;
export const RATING_PRIOR_MEAN = 3.5;

export function rankingScore(summary: RatingSummary): number {
  const { average, count } = summary;
  const weighted =
    (RATING_PRIOR_WEIGHT * RATING_PRIOR_MEAN + average * count) /
    (RATING_PRIOR_WEIGHT + count);
  return Math.round(weighted * 100) / 100;
}

/** Title for a clone, avoiding "Copy of Copy of ..." pile-ups. */
export function cloneTitle(original: string): string {
  const trimmed = original.trim();
  const existing = trimmed.match(/^(.*?)\s*\(copy(?: (\d+))?\)$/i);
  if (existing) {
    const base = existing[1];
    const n = existing[2] ? Number(existing[2]) + 1 : 2;
    return `${base} (copy ${n})`;
  }
  return `${trimmed} (copy)`;
}

// ── Database helpers ───────────────────────────────────────────────────────

/** Prisma filter for the community gallery. Mirrors appearsInGallery. */
export function galleryFilter() {
  return { visibility: "COMMUNITY" as const, takenDownAt: null };
}

/**
 * Rating summaries for many scenarios in one query.
 *
 * Written as a single groupBy rather than a per-card lookup: a gallery page
 * renders dozens of scenarios and a query each would be an N+1.
 */
export async function ratingSummariesFor(
  scenarioIds: readonly string[],
): Promise<Map<string, RatingSummary>> {
  const out = new Map<string, RatingSummary>();
  if (scenarioIds.length === 0) return out;

  const grouped = await db.scenarioRating.groupBy({
    by: ["scenarioId"],
    where: { scenarioId: { in: [...scenarioIds] } },
    _avg: { stars: true },
    _count: { stars: true },
  });

  for (const row of grouped) {
    out.set(row.scenarioId, {
      average: Math.round((row._avg.stars ?? 0) * 10) / 10,
      count: row._count.stars,
    });
  }

  // Scenarios with no ratings are absent from the groupBy; report them as
  // unrated rather than leaving the caller to guess.
  for (const id of scenarioIds) {
    if (!out.has(id)) out.set(id, { average: 0, count: 0 });
  }

  return out;
}

/**
 * Creator ids the user follows.
 *
 * Reuses the existing Follow graph rather than introducing a creator-specific
 * one: two follow tables would drift, and following an author here should mean
 * the same thing as following them anywhere else on the platform.
 */
export async function followedCreatorIds(userId: string): Promise<string[]> {
  const rows = await db.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return rows.map((r) => r.followingId);
}

/** Whether the viewer already follows this creator. */
export async function isFollowing(followerId: string, creatorId: string): Promise<boolean> {
  const row = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId: creatorId } },
    select: { id: true },
  });
  return row != null;
}
