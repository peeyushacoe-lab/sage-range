import Link from "next/link";
import type { SkillProfile } from "@/lib/evidence";
import { ALL_TACTICS } from "@/lib/insights/mitre";
import { Card, StatCard, Badge } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";

/**
 * The evidence-derived skill profile — the MITRE tactic matrix, coverage and
 * accuracy, and the recommendation that closes the loop.
 *
 * A server component fed the single derived profile, so everything on screen
 * traces to the same evidence. Presentational only; the numbers are decided in
 * src/lib/skill-engine.ts.
 */

// Per-tactic accent, reused from the ATT&CK coverage page so a tactic is the
// same colour everywhere it appears.
const TACTIC_DOT = new Map(ALL_TACTICS.map((t) => [t.name, t.color.bar]));

type Tier = { label: string; tone: "emerald" | "amber" | "red" | "slate"; bar: string };

function tierOf(score: number, demonstrated: boolean): Tier {
  if (!demonstrated) return { label: "Untouched", tone: "slate", bar: "bg-zinc-700" };
  if (score >= 70) return { label: "Mastered", tone: "emerald", bar: "bg-emerald-500" };
  if (score >= 40) return { label: "Developing", tone: "amber", bar: "bg-amber-500" };
  return { label: "Gap", tone: "red", bar: "bg-orange-500" };
}

const ACTIVITY_META: Record<string, { label: string; icon: IconName }> = {
  LAB: { label: "Labs", icon: "labs" },
  INCIDENT: { label: "Incidents", icon: "alert" },
  SIMULATION: { label: "Simulations", icon: "simulations" },
  SOC_SHIFT: { label: "SOC Shift", icon: "soc" },
  DETECTION: { label: "Detection", icon: "investigate" },
  PURPLE_TEAM: { label: "Purple Team", icon: "bossFight" },
  COMPETITION: { label: "Competitions", icon: "trophy" },
  ASSESSMENT: { label: "Assessment", icon: "clipboard" },
  HUNT: { label: "Threat Hunts", icon: "search" },
};

export function SkillProfileSection({ profile }: { profile: SkillProfile }) {
  const { matrix, coverage, accuracy, weakest, recommendations, overall, mix } = profile;
  const hasEvidence = accuracy.total > 0;

  const demonstrated = matrix.filter((m) => m.demonstrated);
  const strongest = [...demonstrated].sort((a, b) => b.score - a.score)[0];
  const focus = weakest[0];

  return (
    <section className="space-y-6">
      {/* Hero */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="mb-1 text-xs uppercase tracking-widest text-emerald-500">Skill Profile</p>
          <h2 className="text-2xl font-bold">What the evidence says</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Built from every graded activity — labs, incidents, detection, purple team, SOC
            shifts and competitions — mapped to MITRE ATT&amp;CK.
          </p>
        </div>
        {hasEvidence && <CoverageRing pct={coverage.coveragePct} overall={overall} />}
      </div>

      {!hasEvidence ? (
        <Card className="p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
            <Icon name="labs" size={22} className="text-emerald-400" />
          </div>
          <p className="text-sm text-zinc-400">
            No graded activity yet. Solve a lab or work an incident and your profile builds itself.
          </p>
          <Link
            href="/labs"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Browse labs
          </Link>
        </Card>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="ATT&CK coverage" value={`${coverage.coveragePct}%`} sub={`${coverage.tacticsCovered} of ${coverage.tacticsTotal} tactics`} />
            <StatCard label="Techniques" value={coverage.techniquesDemonstrated} sub="demonstrated" />
            <StatCard label="Accuracy" value={`${accuracy.accuracyPct}%`} sub={`${accuracy.solved} solved · ${accuracy.failed} failed`} />
            <StatCard label="Activities" value={accuracy.total} sub="graded, all types" />
          </div>

          {/* Strongest / Focus readout */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {strongest && (
              <Readout
                icon="verified"
                eyebrow="Strongest"
                title={strongest.tactic}
                detail={`${strongest.score}/100 · ${strongest.techniques} technique${strongest.techniques === 1 ? "" : "s"} across ${strongest.activities} activit${strongest.activities === 1 ? "y" : "ies"}`}
                accent="emerald"
              />
            )}
            {focus && (
              <Readout
                icon="target"
                eyebrow="Focus area"
                title={focus.tactic}
                detail={focus.untouched ? "No evidence yet — untouched ground" : `${focus.score}/100 · your weakest demonstrated tactic`}
                accent="amber"
              />
            )}
          </div>

          {/* Tactic matrix — two columns on desktop, in kill-chain order */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Tactic matrix</p>
              <p className="text-[10px] text-zinc-600">MITRE ATT&amp;CK · kill-chain order</p>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {matrix.map((m) => {
                const tier = tierOf(m.score, m.demonstrated);
                return (
                  <div key={m.tactic} className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TACTIC_DOT.get(m.tactic) ?? "bg-zinc-600"}`} />
                    <span className="w-36 shrink-0 truncate text-xs text-zinc-300">{m.tactic}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div className={`h-full rounded-full ${tier.bar}`} style={{ width: `${Math.max(m.score, m.demonstrated ? 4 : 0)}%` }} />
                    </div>
                    <span className="w-7 shrink-0 text-right text-xs tabular-nums text-zinc-400">{m.score}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/6 pt-3 text-[10px] text-zinc-600">
              <LegendDot className="bg-emerald-500" label="Mastered 70+" />
              <LegendDot className="bg-amber-500" label="Developing 40–69" />
              <LegendDot className="bg-orange-500" label="Gap <40" />
              <LegendDot className="bg-zinc-700" label="Untouched" />
            </div>
          </Card>

          {/* Where the evidence comes from */}
          <Card className="p-5">
            <p className="mb-3 text-xs uppercase tracking-widest text-zinc-500">Where your evidence comes from</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(mix)
                .filter(([, n]) => n > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([activity, n]) => {
                  const meta = ACTIVITY_META[activity];
                  return (
                    <span key={activity} className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-zinc-900/60 px-2.5 py-1.5 text-xs text-zinc-300">
                      <Icon name={meta?.icon ?? "layers"} size={13} className="text-zinc-500" />
                      {meta?.label ?? activity}
                      <span className="tabular-nums text-zinc-500">{n}</span>
                    </span>
                  );
                })}
            </div>
          </Card>

          {/* The adaptive loop: gaps → recommended next */}
          <Card className="border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div className="mb-1 flex items-center gap-2">
              <Icon name="compass" size={15} className="text-emerald-400" />
              <p className="text-xs uppercase tracking-widest text-emerald-400">Recommended next</p>
            </div>
            <p className="mb-4 text-xs text-zinc-500">
              {weakest.length > 0
                ? `Weakest ground: ${weakest.slice(0, 3).map((w) => w.tactic).join(", ")}. These close it.`
                : "No open gaps — every tactic is at or above threshold."}
            </p>

            {recommendations.length === 0 ? (
              <p className="text-sm text-zinc-400">
                {weakest.length > 0
                  ? "No unsolved activities are mapped to those gaps yet — more content is being tagged to ATT&CK."
                  : "Nothing to recommend right now. Revisit harder material to keep your profile sharp."}
              </p>
            ) : (
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <Link
                    key={rec.activity.slug}
                    href={rec.activity.href}
                    className="group flex items-center gap-3 rounded-lg border border-white/8 bg-zinc-900/60 p-3 transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold tabular-nums text-emerald-400">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200 group-hover:text-emerald-400">
                        {rec.activity.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {rec.addresses.slice(0, 3).map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">
                            <span className={`h-1.5 w-1.5 rounded-full ${TACTIC_DOT.get(t) ?? "bg-zinc-600"}`} />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    {rec.activity.difficulty && (
                      <Badge tone={DIFF_TONE[rec.activity.difficulty] ?? "slate"} className="shrink-0">
                        {rec.activity.difficulty}
                      </Badge>
                    )}
                    <span className="shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-500">→</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </section>
  );
}

const DIFF_TONE: Record<string, "emerald" | "amber" | "red" | "purple"> = {
  EASY: "emerald",
  MEDIUM: "amber",
  HARD: "red",
  INSANE: "purple",
};

/** A circular coverage gauge with the overall points at its centre. */
function CoverageRing({ pct, overall }: { pct: number; overall: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, pct)) / 100) * c;

  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/8" />
        <circle
          cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          className="text-emerald-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-black leading-none tabular-nums text-emerald-400">{overall.toLocaleString()}</span>
        <span className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">points</span>
      </div>
    </div>
  );
}

function Readout({
  icon, eyebrow, title, detail, accent,
}: {
  icon: IconName; eyebrow: string; title: string; detail: string; accent: "emerald" | "amber";
}) {
  const ring = accent === "emerald" ? "border-emerald-500/25 bg-emerald-500/[0.05]" : "border-amber-500/25 bg-amber-500/[0.05]";
  const tint = accent === "emerald" ? "text-emerald-400" : "text-amber-400";
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${ring}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/20 ${tint}`}>
        <Icon name={icon} size={17} />
      </div>
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wider ${tint}`}>{eyebrow}</p>
        <p className="truncate text-sm font-semibold text-zinc-100">{title}</p>
        <p className="truncate text-[11px] text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
