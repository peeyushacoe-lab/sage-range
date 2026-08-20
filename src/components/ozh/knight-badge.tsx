import {
  KNIGHT_TIER_LABEL,
  KNIGHT_TIER_COLOR,
  KNIGHT_TIER_BLURB,
  AWARD_LABEL,
  type OzhKnightTier,
  type OzhAwardKind,
} from "@/lib/ozh-engine";

/**
 * Zero Hour badge rendering.
 *
 * One module so the result card, the leaderboard, the email preview and the
 * organisers' gallery cannot drift apart — the colours and copy live in
 * ozh-engine.ts and every surface reads them from here.
 *
 * Server components throughout: nothing here is interactive, and keeping it off
 * the client bundle means the tier thresholds never ship to the browser.
 */

/** The compact chip, for table rows and inline mentions. */
export function KnightChip({ tier, className = "" }: { tier: OzhKnightTier; className?: string }) {
  const color = KNIGHT_TIER_COLOR[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${className}`}
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
      title={KNIGHT_TIER_BLURB[tier]}
    >
      <ShieldMark color={color} size={10} />
      {tier.toLowerCase()}
    </span>
  );
}

/** The full badge, for the result card and the gallery. */
export function KnightBadge({
  tier,
  certCode,
  className = "",
}: {
  tier: OzhKnightTier;
  certCode?: string;
  className?: string;
}) {
  const color = KNIGHT_TIER_COLOR[tier];
  return (
    <div
      className={`flex items-center gap-4 rounded-2xl border p-5 ${className}`}
      style={{ borderColor: `${color}44`, backgroundColor: `${color}0f` }}
    >
      <ShieldMark color={color} size={44} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Badge earned</p>
        <p className="text-lg font-bold leading-tight" style={{ color }}>
          {KNIGHT_TIER_LABEL[tier]}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{KNIGHT_TIER_BLURB[tier]}</p>
        {certCode && (
          <p className="mt-1.5 font-mono text-[10px] text-zinc-600">{certCode}</p>
        )}
      </div>
    </div>
  );
}

/** A competitive award — one of the seven. */
export function AwardRow({ kind, certCode }: { kind: OzhAwardKind; certCode?: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-semibold text-amber-200">{AWARD_LABEL[kind]}</span>
      {certCode && <span className="font-mono text-[11px] text-zinc-500">{certCode}</span>}
    </div>
  );
}

/**
 * The shield mark.
 *
 * Inline SVG rather than an image so it renders at any size, inherits the tier
 * colour, and costs no network request on a page that may show a hundred of them.
 */
function ShieldMark({ color, size }: { color: string; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M12 2 4 5.2v6.4c0 4.6 3.2 8.8 8 10.4 4.8-1.6 8-5.8 8-10.4V5.2L12 2Z"
        fill={`${color}22`}
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m8.6 12.1 2.3 2.3 4.5-4.5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
