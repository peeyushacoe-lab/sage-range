import type { OrgReadiness } from "@/lib/org-readiness";

/**
 * Team-level readiness card for an org lead — the same evidence-derived
 * arithmetic as an individual's Skill Profile (src/components/insights/
 * skill-profile.tsx), averaged across the roster instead of one learner.
 */

function barColour(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  if (score > 0) return "bg-orange-500";
  return "bg-zinc-700";
}

function scoreColour(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 40) return "text-amber-400";
  return "text-red-400";
}

export function OrgReadinessSection({ readiness }: { readiness: OrgReadiness }) {
  const { readinessScore, matrix, weakestTactics, memberCount, activeMemberCount } = readiness;

  if (memberCount === 0) return null;

  return (
    <section className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-500 mb-1">Team Readiness</p>
          <h2 className="text-lg font-bold">Cyber Skills Readiness</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Derived from the same evidence spine each member&apos;s own Skill Profile draws from —
            averaged across {memberCount} member{memberCount !== 1 ? "s" : ""}
            {activeMemberCount < memberCount ? `, ${memberCount - activeMemberCount} with no graded activity yet` : ""}.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-4xl font-black tabular-nums ${scoreColour(readinessScore)}`}>{readinessScore}</p>
          <p className="text-xs text-zinc-500">/ 100</p>
        </div>
      </div>

      {/* Tactic matrix */}
      <div className="space-y-2.5">
        {matrix.map((m) => (
          <div key={m.tactic} className="flex items-center gap-3">
            <span className="w-40 shrink-0 truncate text-xs text-zinc-400">{m.tactic}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${barColour(m.avgScore)}`}
                style={{ width: `${m.avgScore}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-500">{m.avgScore}</span>
            <span className="hidden w-20 shrink-0 text-right text-[10px] tabular-nums text-zinc-600 sm:inline">
              {m.membersCovering}/{memberCount} covering
            </span>
          </div>
        ))}
      </div>

      {/* Weakest ground */}
      {weakestTactics.length > 0 && weakestTactics[0].avgScore < 70 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <p className="text-xs uppercase tracking-widest text-amber-400 mb-2">Top team gaps</p>
          <div className="flex flex-wrap gap-2">
            {weakestTactics
              .filter((w) => w.avgScore < 70)
              .map((w) => (
                <span
                  key={w.tactic}
                  className="text-xs border border-amber-500/25 bg-amber-500/8 text-amber-300 rounded-full px-3 py-1"
                >
                  {w.tactic} · {w.avgScore}
                </span>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
