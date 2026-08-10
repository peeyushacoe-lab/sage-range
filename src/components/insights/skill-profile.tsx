import Link from "next/link";
import type { SkillProfile } from "@/lib/evidence";

/**
 * The evidence-derived skill profile: the MITRE tactic matrix, coverage and
 * accuracy, and — the point of the whole spine — what to do next.
 *
 * A server component fed the single derived profile, so everything on screen
 * traces to the same evidence. Purely presentational; the numbers are decided
 * in src/lib/skill-engine.ts.
 */

const DIFF_STYLE: Record<string, string> = {
  EASY: "text-emerald-400 border-emerald-500/30",
  MEDIUM: "text-amber-400 border-amber-500/30",
  HARD: "text-red-400 border-red-500/30",
  INSANE: "text-purple-400 border-purple-500/30",
};

function barColour(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  if (score > 0) return "bg-orange-500";
  return "bg-zinc-700";
}

export function SkillProfileSection({ profile }: { profile: SkillProfile }) {
  const { matrix, coverage, accuracy, weakest, recommendations, overall } = profile;
  const hasEvidence = accuracy.total > 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-500 mb-1">
            Skill Profile
          </p>
          <h2 className="text-xl font-bold">What the evidence says</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Derived from every graded activity — labs, incidents, detection, purple team, SOC
            shifts and competitions — mapped to MITRE ATT&amp;CK.
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums text-emerald-400">{overall.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">evidence skill points</p>
        </div>
      </div>

      {!hasEvidence ? (
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">
            No graded activity yet. Solve a lab or work an incident and your profile builds itself.
          </p>
          <Link
            href="/labs"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Browse labs
          </Link>
        </div>
      ) : (
        <>
          {/* Coverage + accuracy summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ATT&CK coverage" value={`${coverage.coveragePct}%`} sub={`${coverage.tacticsCovered}/${coverage.tacticsTotal} tactics`} />
            <Stat label="Techniques" value={coverage.techniquesDemonstrated} sub="demonstrated" />
            <Stat label="Accuracy" value={`${accuracy.accuracyPct}%`} sub={`${accuracy.solved} solved`} />
            <Stat label="Activities" value={accuracy.total} sub="graded" />
          </div>

          {/* Tactic matrix */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
            <p className="mb-4 text-xs uppercase tracking-widest text-zinc-500">
              Tactic matrix
            </p>
            <div className="space-y-2.5">
              {matrix.map((m) => (
                <div key={m.tactic} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-xs text-zinc-400">{m.tactic}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${barColour(m.score)}`}
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                    {m.score}
                  </span>
                  <span className="hidden w-16 shrink-0 text-right text-[10px] tabular-nums text-zinc-600 sm:inline">
                    {m.activities > 0 ? `${m.activities} act` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The adaptive loop: weakest gaps → recommended next */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <p className="mb-1 text-xs uppercase tracking-widest text-emerald-400">
              Recommended next
            </p>
            <p className="mb-4 text-xs text-zinc-500">
              {weakest.length > 0
                ? `Your weakest ground: ${weakest.slice(0, 3).map((w) => w.tactic).join(", ")}. These train it.`
                : "You have no open gaps — every tactic is at or above threshold."}
            </p>

            {recommendations.length === 0 ? (
              <p className="text-sm text-zinc-400">
                {weakest.length > 0
                  ? "No unsolved activities are tagged to those gaps yet. More content is being mapped to ATT&CK."
                  : "Nothing to recommend — keep your profile fresh by revisiting harder material."}
              </p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec) => (
                  <Link
                    key={rec.activity.slug}
                    href={rec.activity.href}
                    className="group flex items-center gap-3 rounded-lg border border-white/8 bg-zinc-900/60 p-3 transition hover:border-emerald-500/40 hover:bg-emerald-500/5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-emerald-400">
                        {rec.activity.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        trains {rec.addresses.join(", ")}
                      </p>
                    </div>
                    {rec.activity.difficulty && (
                      <span
                        className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                          DIFF_STYLE[rec.activity.difficulty] ?? "text-zinc-400 border-white/10"
                        }`}
                      >
                        {rec.activity.difficulty}
                      </span>
                    )}
                    <span className="shrink-0 text-zinc-600 transition group-hover:text-emerald-500">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-zinc-600">{sub}</p>
    </div>
  );
}
