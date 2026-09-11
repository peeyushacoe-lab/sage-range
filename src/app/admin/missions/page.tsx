import { getAdminReport, getAdminRanking, type AdminSessionRow } from "@/lib/missions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mission Analyst — Judging · Admin" };

const MEDAL = ["🥇", "🥈", "🥉"];

export default async function AdminMissionsPage() {
  const [ranking, sessions] = await Promise.all([getAdminRanking(), getAdminReport()]);

  const byCase = new Map<string, { caseTitle: string; rows: AdminSessionRow[] }>();
  for (const s of sessions) {
    if (!byCase.has(s.caseSlug)) byCase.set(s.caseSlug, { caseTitle: s.caseTitle, rows: [] });
    byCase.get(s.caseSlug)!.rows.push(s);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-500">Mission Analyst</p>
        <h1 className="text-3xl font-black tracking-tight">Judging</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-zinc-500">
          Every submission next to the hidden answer key — for ranking, not for showing a player.
        </p>

        {/* Ranking */}
        <p className="mb-3 mt-10 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">Ranking</p>
        {ranking.length === 0 ? (
          <p className="text-sm text-zinc-600">No one has started a mission yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/40">
            <table className="w-full min-w-[600px] border-collapse text-sm">
              <thead>
                <tr className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-600">
                  <th className="border-b border-white/10 px-4 py-3 text-left">Analyst</th>
                  <th className="border-b border-white/10 px-3 py-3 text-center">Cases completed</th>
                  <th className="border-b border-white/10 px-3 py-3 text-center">Cases started</th>
                  <th className="border-b border-white/10 px-3 py-3 text-center">Avg score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.userId} className="hover:bg-white/[0.02]">
                    <td className="border-b border-white/8 px-4 py-2.5 text-left">
                      <span className="mr-2 font-mono text-xs text-zinc-600">{i < 3 ? MEDAL[i] : i + 1}</span>
                      <span className="font-semibold text-zinc-100">{r.userName}</span>
                      <span className="ml-2 text-xs text-zinc-600">{r.userEmail}</span>
                    </td>
                    <td className="border-b border-white/8 px-3 py-2.5 text-center font-mono tabular-nums text-zinc-200">{r.casesCompleted}</td>
                    <td className="border-b border-white/8 px-3 py-2.5 text-center font-mono tabular-nums text-zinc-500">{r.casesStarted}</td>
                    <td className={`border-b border-white/8 px-3 py-2.5 text-center font-mono font-bold tabular-nums ${i === 0 && r.averageScore !== null ? "text-amber-400" : "text-zinc-100"}`}>
                      {r.averageScore ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Per-case detail */}
        {[...byCase.entries()].map(([caseSlug, { caseTitle, rows }]) => (
          <div key={caseSlug} className="mt-10">
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">{caseTitle}</p>
            <div className="space-y-3">
              {rows.map((s) => (
                <SessionCard key={s.sessionId} s={s} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionCard({ s }: { s: AdminSessionRow }) {
  const correct = s.submitted
    ? {
        suspect: s.submitted.suspectName === s.answer.suspectName,
        classification: s.submitted.classification === s.answer.classification,
        severity: s.submitted.severity === s.answer.severity,
      }
    : null;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-semibold text-zinc-100">{s.userName}</span>
          <span className="ml-2 text-xs text-zinc-600">{s.userEmail}</span>
          <span className="ml-3 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
            Phase {s.phaseNumber} — {s.phaseLabel}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">
            {s.evidenceFoundCount}/{s.evidenceTotalCount} evidence found
          </span>
          {s.status === "SUBMITTED" ? (
            <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">{s.score}/100</span>
          ) : (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber-300">
              In progress
            </span>
          )}
        </div>
      </div>

      {s.submitted ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Responsible party" got={s.submitted.suspectName} want={s.answer.suspectName} ok={correct!.suspect} />
            <Field label="Classification" got={s.submitted.classification} want={s.answer.classification} ok={correct!.classification} />
            <Field label="Severity" got={s.submitted.severity} want={s.answer.severity} ok={correct!.severity} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="mb-1 text-[9px] uppercase tracking-widest text-zinc-600">Evidence cited</p>
              {s.submitted.evidenceCited.length === 0 ? (
                <p className="text-xs text-zinc-600">None</p>
              ) : (
                <ul className="space-y-0.5 text-xs text-zinc-300">
                  {s.submitted.evidenceCited.map((e) => (
                    <li key={e}>· {e}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.03] p-3">
              <p className="mb-1 text-[9px] uppercase tracking-widest text-emerald-500/70">Critical evidence (answer key)</p>
              <ul className="space-y-0.5 text-xs text-zinc-300">
                {s.answer.criticalEvidence.map((e) => (
                  <li key={e}>· {e}</li>
                ))}
              </ul>
            </div>
          </div>
          {s.submitted.summary && (
            <div className="mt-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="mb-1 text-[9px] uppercase tracking-widest text-zinc-600">Executive summary</p>
              <p className="text-xs leading-relaxed text-zinc-400">{s.submitted.summary}</p>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-600">Not submitted yet.</p>
      )}
    </div>
  );
}

function Field({ label, got, want, ok }: { label: string; got: string | null; want: string; ok: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-red-500/30 bg-red-500/[0.06]"}`}>
      <p className="mb-1 text-[9px] uppercase tracking-widest text-zinc-600">{label}</p>
      <p className={`text-sm font-semibold ${ok ? "text-emerald-300" : "text-red-300"}`}>{got ?? "—"}</p>
      {!ok && <p className="mt-1 text-[11px] text-zinc-500">Answer: {want}</p>}
    </div>
  );
}
