import { getJudgingReport, type JudgingRow } from "@/lib/ozh";
import { OZH_CLOSES_AT } from "@/lib/ozh-engine";
import { formatIST } from "@/lib/ozh-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zero Hour — Judging · Admin" };

const PHASE_LABELS = ["Triage", "Investigation", "Hunt", "Reconstruction", "Response", "Report"];
const MEDAL = ["🥇", "🥈", "🥉"];

function fmtTime(s: number): string {
  const m = Math.round(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}m` : `${m}m`;
}

/** Performance tier for a phase cell, by fraction of the phase maximum. */
function tier(pct: number): { text: string; bg: string } {
  if (pct >= 0.9) return { text: "text-emerald-300", bg: "bg-emerald-500/15" };
  if (pct >= 0.75) return { text: "text-lime-300", bg: "bg-lime-500/12" };
  if (pct >= 0.6) return { text: "text-amber-300", bg: "bg-amber-500/12" };
  return { text: "text-red-300", bg: "bg-red-500/12" };
}

export default async function ZeroHourJudgingPage() {
  const rows = await getJudgingReport();
  const podium = rows.slice(0, 3);

  // Best score in each phase, for the "best in phase" strip.
  const phaseLeaders = PHASE_LABELS.map((label, i) => {
    const best = Math.max(0, ...rows.map((r) => r.phases[i].points));
    const winners = rows.filter((r) => r.phases[i].points === best);
    const max = rows[0]?.phases[i].maxPoints ?? 0;
    return { label, max, best, winners };
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* Header */}
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-500">
          Operation Zero Hour
        </p>
        <h1 className="text-3xl font-black tracking-tight">Judging</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
          Every analyst&apos;s run, phase by phase. Auto-ranked by score, then decision accuracy, then
          time — the call is yours. The heatmap shows where each one actually earned it.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs text-zinc-500">
          <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1"><b className="text-zinc-200">{rows.length}</b> analysts · solo, one attempt</span>
          <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1"><b className="text-zinc-200">1,000</b> points · 6 phases</span>
          <span className="rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-zinc-600">Closed · {formatIST(OZH_CLOSES_AT)} IST</span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-16 text-center text-sm text-zinc-500">No submitted runs yet.</p>
        ) : (
          <>
            {/* Provisional banner */}
            <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90">
              Ranks are <b>provisional</b> — the competition has not been formally concluded, so no
              official ranks are frozen and no award certificates have been issued.
            </div>

            {/* Podium */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {podium.map((r, i) => (
                <div
                  key={r.userId}
                  className={`rounded-2xl border p-5 ${
                    i === 0
                      ? "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.10] to-transparent"
                      : "border-white/10 bg-zinc-900/50"
                  }`}
                >
                  <div className="text-2xl leading-none">{MEDAL[i]}</div>
                  <p className="mt-3 text-xl font-bold">{r.name}</p>
                  <p className="min-h-[1.2em] text-xs text-zinc-600">{r.university ?? "—"}</p>
                  <p className={`mt-3 font-mono text-3xl font-bold tabular-nums ${i === 0 ? "text-amber-400" : "text-zinc-100"}`}>
                    {r.score}<span className="text-base text-zinc-600"> / 1000</span>
                  </p>
                  <div className="mt-2 flex gap-4 font-mono text-xs text-zinc-500">
                    <span><b className="text-zinc-300">{r.accuracy}%</b> acc</span>
                    <span><b className="text-zinc-300">{fmtTime(r.elapsedSeconds)}</b></span>
                    <span><b className="text-zinc-300">{r.evidenceViews}</b> evidence</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Heatmap */}
            <p className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
              Performance heatmap — who earned what, where
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/40">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-600">
                    <th className="border-b border-white/10 px-4 py-3 text-left">Analyst</th>
                    {PHASE_LABELS.map((l, i) => (
                      <th key={l} className="border-b border-white/10 px-2 py-3 text-center">
                        {l}<br /><span className="text-zinc-700">/{rows[0].phases[i].maxPoints}</span>
                      </th>
                    ))}
                    <th className="border-b border-white/10 px-3 py-3 text-center">Total</th>
                    <th className="border-b border-white/10 px-2 py-3 text-center">Acc</th>
                    <th className="border-b border-white/10 px-2 py-3 text-center">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.userId} className="hover:bg-white/[0.02]">
                      <td className="border-b border-white/8 px-4 py-2.5 text-left">
                        <span className="mr-2.5 font-mono text-xs text-zinc-600">{r.rank}</span>
                        <span className="font-semibold text-zinc-100">{r.name}</span>
                      </td>
                      {r.phases.map((p, i) => {
                        const pct = p.maxPoints > 0 ? p.points / p.maxPoints : 0;
                        const t = tier(pct);
                        const perfect = p.points === p.maxPoints;
                        return (
                          <td key={i} className="border-b border-white/8 px-2 py-2 text-center">
                            <div
                              className={`mx-auto min-w-[52px] rounded-lg px-1 py-1.5 ${t.bg} ${perfect ? "outline outline-1 outline-emerald-500/60" : ""}`}
                              title={`${p.correct}/${p.total} decisions`}
                            >
                              <div className={`font-mono text-[13px] font-semibold ${t.text}`}>{p.points}</div>
                              <div className="font-mono text-[9.5px] text-zinc-600">{Math.round(pct * 100)}%</div>
                            </div>
                          </td>
                        );
                      })}
                      <td className={`border-b border-white/8 px-3 py-2.5 text-center font-mono font-bold ${r.rank === 1 ? "text-amber-400" : "text-zinc-100"}`}>{r.score}</td>
                      <td className="border-b border-white/8 px-2 py-2.5 text-center font-mono text-xs text-zinc-500">{r.accuracy}%</td>
                      <td className="border-b border-white/8 px-2 py-2.5 text-center font-mono text-xs text-zinc-500">{fmtTime(r.elapsedSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[11px] text-zinc-500">
              <Legend cls="bg-emerald-500" label="≥90% of phase" />
              <Legend cls="bg-lime-500" label="75–89%" />
              <Legend cls="bg-amber-500" label="60–74%" />
              <Legend cls="bg-red-500" label="below 60%" />
              <span className="text-zinc-600">outlined = perfect phase · hover a cell for decisions</span>
            </div>

            {/* Best in phase */}
            <p className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
              Best in each phase
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {phaseLeaders.map((pl) => (
                <div key={pl.label} className="rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-600">{pl.label} · /{pl.max}</p>
                  <p className="mt-1.5 font-bold">
                    {pl.winners[0]?.name ?? "—"}
                    {pl.winners.length > 1 && <span className="text-zinc-500"> +{pl.winners.length - 1} tied</span>}
                  </p>
                  <p className="font-mono text-xs text-emerald-400">{pl.best} pts{pl.best === pl.max ? " · perfect" : ""}</p>
                </div>
              ))}
            </div>

            {/* Detail */}
            <p className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
              Full breakdown
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {rows.map((r) => (
                <DetailCard key={r.userId} r={r} />
              ))}
            </div>

            <p className="mt-12 border-t border-white/8 pt-4 font-mono text-[11px] leading-relaxed text-zinc-600">
              Ranking rule: score, then decision accuracy, then elapsed time. Decisions shown as
              correct/total per phase. Preview and unfinished runs are excluded. A run that opened
              zero evidence records is flagged — verify before awarding anything speed-based.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}

function DetailCard({ r }: { r: JudgingRow }) {
  const flag = r.evidenceViews === 0;
  return (
    <div className={`rounded-2xl border p-5 ${flag ? "border-amber-500/40" : "border-white/10"} bg-zinc-900/40`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold">
          <span className="mr-1.5 font-mono text-xs text-zinc-600">#{r.rank}</span>
          {r.name}
        </p>
        <p className={`font-mono text-xl font-bold ${r.rank === 1 ? "text-amber-400" : "text-zinc-100"}`}>{r.score}</p>
      </div>
      <div className="mt-2 mb-3.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs text-zinc-500 tabular-nums">
        <span><b className="text-zinc-200">{r.accuracy}%</b> accuracy</span>
        <span><b className="text-zinc-200">{fmtTime(r.elapsedSeconds)}</b> elapsed</span>
        <span className={flag ? "text-amber-300" : ""}><b className={flag ? "text-amber-300" : "text-zinc-200"}>{r.evidenceViews}</b> evidence opened{flag ? " ⚠" : ""}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {r.phases.map((p, i) => {
          const pct = p.maxPoints > 0 ? p.points / p.maxPoints : 0;
          const t = tier(pct);
          return (
            <div key={i} className="grid grid-cols-[96px_1fr_86px] items-center gap-2.5 font-mono text-[11.5px]">
              <span className="tracking-wide text-zinc-500">{PHASE_LABELS[i]}</span>
              <span className="h-[7px] overflow-hidden rounded bg-white/[0.06]">
                <span className={`block h-full rounded ${t.text.replace("text-", "bg-").replace("-300", "-500")}`} style={{ width: `${Math.round(pct * 100)}%` }} />
              </span>
              <span className="text-right text-zinc-500 tabular-nums">
                <b className="text-zinc-200">{p.points}</b>/{p.maxPoints} · {p.correct}/{p.total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
