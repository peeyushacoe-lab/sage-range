/**
 * Visibility rules for competitions.
 *
 * Split into pure decision functions and thin database helpers so the rules
 * can be unit-tested without a database — the same shape as
 * src/lib/detection-rules.ts, and for the same reason: an access-control bug
 * here exposes a private university event to the whole platform.
 *
 * Everything fails closed. A competition whose configuration does not make
 * sense (ORGANIZATION with no organization, INVITE_ONLY with no code) is
 * treated as inaccessible rather than falling back to public.
 */

import { db } from "@/lib/db";

export type CompetitionVisibility =
  | "PUBLIC"
  | "ORGANIZATION"
  | "COHORT"
  | "INVITE_ONLY";

/** The access-relevant fields of a competition. */
export type CompetitionAcl = {
  visibility: CompetitionVisibility;
  organizationId: string | null;
  cohortId: string | null;
  inviteCode: string | null;
};

/** Everything about the viewer that can grant access. */
export type ViewerContext = {
  organizationIds: string[];
  cohortIds: string[];
  /** True when the user already has an entry, which keeps prior access. */
  hasEntry: boolean;
};

/** Invite codes are compared case-insensitively and whitespace-trimmed. */
function normaliseCode(code: string | null | undefined): string {
  return (code ?? "").trim().toUpperCase();
}

export function inviteCodeMatches(
  expected: string | null,
  provided: string | null | undefined,
): boolean {
  const a = normaliseCode(expected);
  const b = normaliseCode(provided);
  // An empty expected code must never match, or a misconfigured INVITE_ONLY
  // competition would admit anyone who sent no code at all.
  return a.length > 0 && a === b;
}

/**
 * Whether the viewer may see and enter this competition.
 *
 * `providedInviteCode` is only consulted for INVITE_ONLY events; supplying a
 * code never widens access to an organization or cohort event.
 */
export function canAccessCompetition(
  competition: CompetitionAcl,
  viewer: ViewerContext,
  providedInviteCode?: string | null,
): boolean {
  // Already entered: keep access even if the event was later narrowed, so a
  // participant is never locked out of something they are part way through.
  if (viewer.hasEntry) return true;

  switch (competition.visibility) {
    case "PUBLIC":
      return true;

    case "ORGANIZATION":
      return (
        competition.organizationId !== null &&
        viewer.organizationIds.includes(competition.organizationId)
      );

    case "COHORT":
      return (
        competition.cohortId !== null &&
        viewer.cohortIds.includes(competition.cohortId)
      );

    case "INVITE_ONLY":
      return inviteCodeMatches(competition.inviteCode, providedInviteCode);

    default:
      // Unknown visibility — a value added to the enum but not handled here.
      return false;
  }
}

/** Human-readable label for the visibility badge. */
export function visibilityLabel(visibility: CompetitionVisibility): string {
  switch (visibility) {
    case "PUBLIC":
      return "Open";
    case "ORGANIZATION":
      return "Organization";
    case "COHORT":
      return "Classroom";
    case "INVITE_ONLY":
      return "Invite only";
    default:
      return "Restricted";
  }
}

// ── Database helpers ───────────────────────────────────────────────────────

/** Load the org and cohort memberships that can grant access. */
export async function loadViewerContext(
  userId: string,
): Promise<Omit<ViewerContext, "hasEntry">> {
  const [orgs, cohorts] = await Promise.all([
    db.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    }),
    db.cohortMember.findMany({
      where: { userId },
      select: { cohortId: true },
    }),
  ]);

  return {
    organizationIds: orgs.map((o) => o.organizationId),
    cohortIds: cohorts.map((c) => c.cohortId),
  };
}

/**
 * Prisma filter listing every competition the user may see.
 *
 * Deliberately mirrors canAccessCompetition. INVITE_ONLY events appear only
 * once entered — a code grants entry through the join flow, not visibility in
 * a browse list, otherwise the listing would leak the existence of every
 * private event.
 */
export function visibleCompetitionFilter(
  userId: string,
  viewer: Omit<ViewerContext, "hasEntry">,
) {
  return {
    published: true,
    OR: [
      { visibility: "PUBLIC" as const },
      viewer.organizationIds.length > 0
        ? {
            visibility: "ORGANIZATION" as const,
            organizationId: { in: viewer.organizationIds },
          }
        : null,
      viewer.cohortIds.length > 0
        ? { visibility: "COHORT" as const, cohortId: { in: viewer.cohortIds } }
        : null,
      { entries: { some: { userId } } },
    ].filter((clause): clause is NonNullable<typeof clause> => clause !== null),
  };
}
