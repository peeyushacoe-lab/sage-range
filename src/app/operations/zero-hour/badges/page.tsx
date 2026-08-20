import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { isPreviewer } from "@/lib/ozh-preview";
import {
  AWARD_LABEL,
  KNIGHT_TIER_MIN_FRACTION,
  MAX_SCORE,
  type OzhAwardKind,
  type OzhKnightTier,
} from "@/lib/ozh-engine";
import { Navbar } from "@/components/navbar";
import { Card, Badge, PageHeader, buttonVariants } from "@/components/ui";
import { KnightBadge, KnightChip, AwardRow } from "@/components/ozh/knight-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Badge gallery · Sage Vault" };

/**
 * Every Zero Hour badge, rendered for the organisers.
 *
 * Deliberately a gallery and not a shortcut that grants an account the full set.
 * OzhAward rows carry a public certCode that resolves at /verify, so minting
 * them for a reviewer would create genuinely verifiable credentials claiming
 * they won Champion. This page renders the same components against sample data
 * and writes nothing, so the designs can be reviewed without a single false
 * certificate existing.
 *
 * Gated on OZH_PREVIEW_EMAILS — the same allowlist that grants early console
 * access — and 404s for everyone else rather than redirecting, so its existence
 * is not advertised.
 */

const KNIGHT_TIERS: OzhKnightTier[] = ["GOLD", "SILVER", "BRONZE", "IRON"];

const AWARD_KINDS: OzhAwardKind[] = [
  "CHAMPION",
  "TOP_THREAT_HUNTER",
  "BEST_INCIDENT_RESPONDER",
  "BEST_INVESTIGATOR",
  "BEST_TECHNICAL_REPORT",
  "FASTEST_ANALYST",
  "MOST_ACCURATE_ANALYST",
];

const THRESHOLD: Record<OzhKnightTier, string> = {
  GOLD: `${Math.round(KNIGHT_TIER_MIN_FRACTION.GOLD * MAX_SCORE)}+ / ${MAX_SCORE}`,
  SILVER: `${Math.round(KNIGHT_TIER_MIN_FRACTION.SILVER * MAX_SCORE)}–${Math.round(KNIGHT_TIER_MIN_FRACTION.GOLD * MAX_SCORE) - 1}`,
  BRONZE: `${Math.round(KNIGHT_TIER_MIN_FRACTION.BRONZE * MAX_SCORE)}–${Math.round(KNIGHT_TIER_MIN_FRACTION.SILVER * MAX_SCORE) - 1}`,
  IRON: `1–${Math.round(KNIGHT_TIER_MIN_FRACTION.BRONZE * MAX_SCORE) - 1}`,
};

export default async function BadgeGalleryPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (!isPreviewer(user.email)) notFound();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <PageHeader
          className="mb-2"
          title="Zero Hour badge gallery"
          subtitle="Every badge the operation can issue, rendered from the live components."
        />

        <Card className="mb-8 border-purple-500/35 bg-purple-500/[0.06] p-5">
          <Badge tone="purple" className="mb-2">
            Organisers only
          </Badge>
          <p className="text-sm font-semibold text-purple-200">
            Nothing on this page is real.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-400">
            These are sample renders, not awards on your account — no rows were written and the
            certificate codes below resolve to nothing. Visible only to accounts in{" "}
            <span className="font-mono text-zinc-300">OZH_PREVIEW_EMAILS</span>; everyone else gets
            a 404.
          </p>
        </Card>

        <section className="mb-10">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">Knight badge</h2>
          <p className="mb-4 text-xs leading-relaxed text-zinc-500">
            Earned by every analyst who scored, and kept permanently. A run that submitted nothing
            earns none — a badge that cannot be failed tells a recruiter nothing.
          </p>
          <div className="space-y-3">
            {KNIGHT_TIERS.map((tier) => (
              <div key={tier}>
                <KnightBadge tier={tier} certCode={`OZH-2026-1-SAMPLE`} />
                <p className="mt-1.5 px-1 text-[11px] text-zinc-600">
                  Awarded for <span className="font-mono text-zinc-500">{THRESHOLD[tier]}</span>{" "}
                  points
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">Chips</h2>
          <p className="mb-4 text-xs leading-relaxed text-zinc-500">
            The compact form, used on the leaderboard and the podium.
          </p>
          <Card className="flex flex-wrap items-center gap-2 p-5">
            {KNIGHT_TIERS.map((tier) => (
              <KnightChip key={tier} tier={tier} />
            ))}
          </Card>
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-sm font-semibold text-zinc-200">Competitive awards</h2>
          <p className="mb-4 text-xs leading-relaxed text-zinc-500">
            One winner each, decided across the whole field. Fastest Analyst is restricted to runs
            scoring at least 70% of the maximum, so it cannot be won by submitting nothing quickly.
          </p>
          <Card className="space-y-2 border-amber-500/30 bg-amber-500/[0.04] p-5">
            {AWARD_KINDS.map((kind) => (
              <AwardRow key={kind} kind={kind} certCode="OZH-2026-1-SAMPLE" />
            ))}
          </Card>
          <p className="mt-2 px-1 text-[11px] text-zinc-600">
            {AWARD_KINDS.length} awards · labels from{" "}
            <span className="font-mono">AWARD_LABEL</span> ({Object.keys(AWARD_LABEL).length} kinds
            including Knight)
          </p>
        </section>

        <div className="flex justify-center gap-3">
          <Link
            href="/operations/zero-hour/leaderboard"
            className={buttonVariants({ variant: "secondary" })}
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
