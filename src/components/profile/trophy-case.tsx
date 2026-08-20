import Link from "next/link";
import type { Trophy } from "@/lib/trophy-case";

/**
 * Competition badges on a profile.
 *
 * Preview samples are rendered dimmed, dashed and labelled, and never carry a
 * certificate code — a badge that was not won must not be able to pass for one
 * that was, even in a screenshot of the organiser's own profile.
 */
export function TrophyCase({ trophies }: { trophies: Trophy[] }) {
  if (trophies.length === 0) return null;

  const earned = trophies.filter((t) => !t.preview);
  const preview = trophies.filter((t) => t.preview);

  return (
    <div>
      <h2 className="mb-4 text-xs uppercase tracking-widest text-zinc-500">
        Competition badges
        {earned.length > 0 && <span className="ml-2 text-zinc-600">{earned.length}</span>}
      </h2>

      {earned.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {earned.map((t) => (
            <TrophyTile key={t.key} trophy={t} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-white/8 bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500">
          No competition badges yet. Operations and monthly championships both award them.
        </p>
      )}

      {preview.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest text-purple-400/80">
              Design preview
            </p>
            <span className="rounded-full border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
              only you can see this
            </span>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
            Every badge the platform can issue, rendered from the live components so you can review
            them. None of these were earned, none carry a certificate code, and nobody visiting your
            profile sees them.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {preview.map((t) => (
              <TrophyTile key={t.key} trophy={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TrophyTile({ trophy }: { trophy: Trophy }) {
  const body = (
    <div
      className={`flex h-full items-start gap-3 rounded-xl border p-3 transition-colors ${
        trophy.preview ? "border-dashed opacity-60" : "hover:bg-white/[0.03]"
      }`}
      style={{
        borderColor: `${trophy.color}${trophy.preview ? "40" : "55"}`,
        backgroundColor: `${trophy.color}0f`,
      }}
    >
      <ShieldMark color={trophy.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: trophy.color }}>
          {trophy.label}
        </p>
        <p className="truncate text-[11px] text-zinc-400">{trophy.event}</p>
        {trophy.detail && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-zinc-500">
            {trophy.detail}
          </p>
        )}
        {trophy.certCode ? (
          <p className="mt-1 font-mono text-[10px] text-zinc-600">{trophy.certCode}</p>
        ) : trophy.preview ? (
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400/70">
            Sample — not earned
          </p>
        ) : null}
      </div>
    </div>
  );

  // A preview sample links to the gallery, not to a certificate that does not exist.
  return trophy.href ? (
    <Link href={trophy.href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function ShieldMark({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
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
