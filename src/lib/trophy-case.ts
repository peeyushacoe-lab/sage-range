import { db } from "@/lib/db";
import { isPreviewer } from "@/lib/ozh-preview";
import {
  AWARD_LABEL,
  KNIGHT_TIER_LABEL,
  KNIGHT_TIER_COLOR,
  KNIGHT_TIER_BLURB,
  type OzhAwardKind,
  type OzhKnightTier,
} from "@/lib/ozh-engine";

/**
 * Every competition badge a person holds, in one shape.
 *
 * Badges were being minted into three different tables and displayed on none
 * of them — OzhAward showed only on the Zero Hour result card, ChampionshipAward
 * only on the championship hub, and the profile, which is the page a recruiter
 * actually opens, showed neither. This gathers them so the profile has one
 * trophy case rather than three places a badge might be hiding.
 */

export type Trophy = {
  key: string;
  /** The badge itself: "Gold Knight", "Top Threat Hunter", "Champion". */
  label: string;
  /** Where it was won: "Operation Zero Hour", "August 2026 Championship". */
  event: string;
  detail: string | null;
  color: string;
  certCode: string | null;
  href: string | null;
  earnedAt: Date | null;
  /**
   * A sample badge shown to an organiser reviewing the designs. Never earned,
   * never verifiable, and never rendered to anyone but the account itself.
   */
  preview: boolean;
};

const AWARD_COLOR = "#f59e0b";
const CHAMPIONSHIP_COLOR: Record<string, string> = {
  CHAMPION: "#f59e0b",
  MEDALLIST: "#a78bfa",
  FINALIST: "#38bdf8",
  COMPETITOR: "#71717a",
};

const CHAMPIONSHIP_LABEL: Record<string, string> = {
  CHAMPION: "Champion",
  MEDALLIST: "Medallist",
  FINALIST: "Finalist",
  COMPETITOR: "Competitor",
};

/**
 * The badges a user has actually won.
 *
 * `viewerIsOwner` gates nothing here — everything this returns was earned, and
 * a profile is meant to show it. Preview samples are added separately, by
 * previewTrophies, precisely so they can be gated.
 */
export async function getEarnedTrophies(userId: string): Promise<Trophy[]> {
  const [ozhAwards, championshipAwards] = await Promise.all([
    db.ozhAward.findMany({
      where: { userId, run: { preview: false } },
      include: { run: { select: { rank: true, score: true } } },
      orderBy: { issuedAt: "desc" },
    }),
    db.championshipAward.findMany({
      where: { userId },
      include: { championship: { select: { title: true, slug: true } } },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  const trophies: Trophy[] = [];

  for (const a of ozhAwards) {
    const isKnight = a.kind === "KNIGHT";
    const tier = a.tier as OzhKnightTier | null;
    trophies.push({
      key: `ozh:${a.id}`,
      label: isKnight && tier ? KNIGHT_TIER_LABEL[tier] : AWARD_LABEL[a.kind as OzhAwardKind],
      event: "Operation Zero Hour",
      detail:
        isKnight && tier
          ? KNIGHT_TIER_BLURB[tier]
          : a.run.rank
            ? `Placed #${a.run.rank}`
            : null,
      color: isKnight && tier ? KNIGHT_TIER_COLOR[tier] : AWARD_COLOR,
      certCode: a.certCode,
      href: "/operations/zero-hour/result",
      earnedAt: a.issuedAt,
      preview: false,
    });
  }

  for (const a of championshipAwards) {
    trophies.push({
      key: `championship:${a.id}`,
      label: CHAMPIONSHIP_LABEL[a.tier] ?? a.tier,
      event: a.championship.title,
      detail: `Placed #${a.rank}`,
      color: CHAMPIONSHIP_COLOR[a.tier] ?? "#71717a",
      certCode: a.certCode,
      href: `/championship/certificate/${a.certCode}`,
      earnedAt: a.issuedAt,
      preview: false,
    });
  }

  return trophies.sort((a, b) => (b.earnedAt?.getTime() ?? 0) - (a.earnedAt?.getTime() ?? 0));
}

/**
 * The full badge set, as samples, for an organiser reviewing the designs.
 *
 * Written rather than minted. OzhAward.certCode resolves publicly through
 * verifyOzhAward, so granting a reviewer the real rows would create genuinely
 * verifiable credentials claiming they won Champion — these carry no code and
 * touch no table. The caller must only render them to the account itself.
 */
export function previewTrophies(): Trophy[] {
  const knightTiers: OzhKnightTier[] = ["GOLD", "SILVER", "BRONZE", "IRON"];
  const awardKinds: OzhAwardKind[] = [
    "CHAMPION",
    "TOP_THREAT_HUNTER",
    "BEST_INCIDENT_RESPONDER",
    "BEST_INVESTIGATOR",
    "BEST_TECHNICAL_REPORT",
    "FASTEST_ANALYST",
    "MOST_ACCURATE_ANALYST",
  ];

  return [
    ...knightTiers.map((tier) => ({
      key: `preview:knight:${tier}`,
      label: KNIGHT_TIER_LABEL[tier],
      event: "Operation Zero Hour",
      detail: KNIGHT_TIER_BLURB[tier],
      color: KNIGHT_TIER_COLOR[tier],
      certCode: null,
      href: "/operations/zero-hour/badges",
      earnedAt: null,
      preview: true,
    })),
    ...awardKinds.map((kind) => ({
      key: `preview:award:${kind}`,
      label: AWARD_LABEL[kind],
      event: "Operation Zero Hour",
      detail: "One winner per operation",
      color: AWARD_COLOR,
      certCode: null,
      href: "/operations/zero-hour/badges",
      earnedAt: null,
      preview: true,
    })),
    ...(["CHAMPION", "MEDALLIST"] as const).map((tier) => ({
      key: `preview:championship:${tier}`,
      label: CHAMPIONSHIP_LABEL[tier],
      event: "Monthly Championship",
      detail: tier === "CHAMPION" ? "First place" : "Second and third place",
      color: CHAMPIONSHIP_COLOR[tier],
      certCode: null,
      href: "/championship",
      earnedAt: null,
      preview: true,
    })),
  ];
}

/**
 * Whether preview samples belong on this profile view.
 *
 * Pure and exported because it is the whole security boundary: an allowlisted
 * account must not become a way to display awards you did not win to everyone
 * who opens your profile. Both conditions are required — the account is on the
 * allowlist AND it is the account itself doing the looking.
 */
export function shouldShowPreviews(
  profile: { userId: string; email: string },
  viewerId: string | null,
  allowlist: string | undefined = process.env.OZH_PREVIEW_EMAILS,
): boolean {
  if (!viewerId || viewerId !== profile.userId) return false;
  return isPreviewer(profile.email, allowlist);
}

/**
 * What to show on a profile: everything earned, plus design samples when
 * shouldShowPreviews allows it.
 */
export async function getTrophyCase(
  profile: { userId: string; email: string },
  viewerId: string | null,
): Promise<Trophy[]> {
  const earned = await getEarnedTrophies(profile.userId);
  if (!shouldShowPreviews(profile, viewerId)) return earned;

  // Do not show a sample of a badge the organiser has actually won — the real
  // one, with its certificate code, is the better of the two.
  const held = new Set(earned.map((t) => `${t.event}::${t.label}`));
  return [...earned, ...previewTrophies().filter((t) => !held.has(`${t.event}::${t.label}`))];
}
