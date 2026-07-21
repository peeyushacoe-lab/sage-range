import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { getRankInfo } from "@/lib/cyber-identity";
import { Navbar } from "@/components/navbar";
import { PrintButton } from "./_components/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cyber Resume · Sage Vault" };

function fmtTime(sec: number | null): string {
  if (!sec) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return m < 60 ? `${m}m ${s}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const DIFF_COLOR: Record<string, string> = {
  EASY:   "text-emerald-400",
  MEDIUM: "text-amber-400",
  HARD:   "text-orange-400",
  INSANE: "text-red-400",
};
const DIFF_DOT: Record<string, string> = {
  EASY:   "#22c55e",
  MEDIUM: "#f59e0b",
  HARD:   "#f97316",
  INSANE: "#ef4444",
};
const TYPE_LABEL: Record<string, string> = {
  CTF: "CTF", BLUE_TEAM: "Blue Team", RED_TEAM: "Red Team",
};

export default async function ResumePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const [attempts, simSessions] = await Promise.all([
    db.attempt.findMany({
      where: { userId: me.id },
      include: { lab: { select: { title: true, type: true, difficulty: true, category: true } } },
      orderBy: { solvedAt: "desc" },
    }),
    db.simulationSession.findMany({
      where: { userId: me.id, status: { in: ["CONTAINED", "BREACHED"] } },
      include: { template: { select: { name: true, industry: true } } },
      orderBy: { endedAt: "desc" },
      take: 8,
    }),
  ]);

  const solved = attempts.filter(a => a.status === "SOLVED");
  const rank = getRankInfo(me.skillScore);

  const byType = {
    CTF:       solved.filter(a => a.lab.type === "CTF").length,
    BLUE_TEAM: solved.filter(a => a.lab.type === "BLUE_TEAM").length,
    RED_TEAM:  solved.filter(a => a.lab.type === "RED_TEAM").length,
  };
  const byDiff = {
    EASY:   solved.filter(a => a.lab.difficulty === "EASY").length,
    MEDIUM: solved.filter(a => a.lab.difficulty === "MEDIUM").length,
    HARD:   solved.filter(a => a.lab.difficulty === "HARD").length,
    INSANE: solved.filter(a => a.lab.difficulty === "INSANE").length,
  };

  const avgSimScore = simSessions.length
    ? Math.round(simSessions.reduce((s, x) => s + (x.score ?? 0), 0) / simSessions.length)
    : null;

  const containedCount = simSessions.filter(s => s.status === "CONTAINED").length;

  // Unique categories from solved labs
  const categories = [...new Set(solved.map(a => a.lab.category))].slice(0, 12);

  // Top solved labs for the resume (most recent 12)
  const topSolved = solved.slice(0, 12);

  const today = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <>
      {/* Screen-only controls */}
      <div className="print:hidden">
        <Navbar />
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/stats" className="text-xs text-zinc-500 hover:text-zinc-300 transition">← Back to Stats</Link>
          <div className="flex items-center gap-3">
            <p className="text-xs text-zinc-500">Tip: set margins to None in print dialog for best results</p>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Resume — renders on screen + prints */}
      <div
        id="resume"
        className="
          max-w-4xl mx-auto px-8 py-8
          bg-white text-zinc-900
          print:max-w-none print:px-10 print:py-8 print:text-[11pt]
          font-sans
        "
        style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
      >
        {/* ── Header ── */}
        <header className="border-b-2 border-zinc-900 pb-4 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-900">
                {me.displayName ?? me.email.split("@")[0]}
              </h1>
              {me.jobTitle && (
                <p className="text-base font-semibold text-zinc-600 mt-0.5">{me.jobTitle}{me.company ? ` · ${me.company}` : ""}</p>
              )}
              {me.university && (
                <p className="text-sm text-zinc-500 mt-0.5">{me.university}</p>
              )}
            </div>
            <div className="text-right text-sm text-zinc-500 space-y-0.5 shrink-0">
              <p className="font-medium text-zinc-800">{me.email}</p>
              {me.linkedIn && <p>linkedin.com/in/{me.linkedIn.replace(/^.*\/in\//,"")}</p>}
              {me.github && <p>github.com/{me.github.replace(/^.*github\.com\//,"")}</p>}
              {me.website && <p>{me.website.replace(/^https?:\/\//,"")}</p>}
              <p className="text-zinc-400 text-xs">{today}</p>
            </div>
          </div>
          {me.bio && (
            <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{me.bio}</p>
          )}
        </header>

        {/* ── Platform Credentials ── */}
        <section className="mb-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
            Sage Vault · Verified Platform Credentials
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Skill Score",    value: me.skillScore.toLocaleString(), sub: `${rank.label} tier` },
              { label: "Labs Solved",    value: solved.length,                  sub: `${attempts.length} attempted` },
              { label: "Simulations",    value: simSessions.length,             sub: `${containedCount} contained` },
              { label: "Avg Sim Score",  value: avgSimScore !== null ? `${avgSimScore}` : "—", sub: "out of 100" },
            ].map(s => (
              <div key={s.label} className="border border-zinc-200 rounded-lg p-3 text-center">
                <p className="text-2xl font-black text-zinc-900">{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 mt-0.5">{s.label}</p>
                <p className="text-[10px] text-zinc-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-5">

            {/* ── Skills Breakdown ── */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                Technical Skills Distribution
              </h2>
              <div className="space-y-2">
                {(Object.entries(byType) as [string, number][]).map(([type, count]) => {
                  const pct = solved.length > 0 ? Math.round((count / solved.length) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3 text-sm">
                      <span className="w-24 text-xs font-medium text-zinc-600 shrink-0">{TYPE_LABEL[type]}</span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div className="h-full rounded-full bg-zinc-800" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-500 w-12 text-right">{count} labs</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {(Object.entries(byDiff) as [string, number][]).map(([diff, count]) => count > 0 && (
                  <span key={diff} className="text-[10px] font-semibold px-2 py-0.5 rounded border"
                    style={{ borderColor: DIFF_DOT[diff], color: DIFF_DOT[diff] }}>
                    {diff}: {count}
                  </span>
                ))}
              </div>
            </section>

            {/* ── Lab Highlights ── */}
            {topSolved.length > 0 && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                  Lab Highlights · Most Recent
                </h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-400 text-[10px] uppercase tracking-wide">
                      <th className="pb-1.5 font-semibold">Challenge</th>
                      <th className="pb-1.5 font-semibold">Type</th>
                      <th className="pb-1.5 font-semibold">Difficulty</th>
                      <th className="pb-1.5 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {topSolved.map(a => (
                      <tr key={a.id}>
                        <td className="py-1.5 font-medium text-zinc-800 pr-4">{a.lab.title}</td>
                        <td className="py-1.5 text-zinc-500">{TYPE_LABEL[a.lab.type] ?? a.lab.type}</td>
                        <td className={`py-1.5 font-semibold text-[10px] ${DIFF_COLOR[a.lab.difficulty]}`}>{a.lab.difficulty}</td>
                        <td className="py-1.5 text-right text-zinc-400 tabular-nums">{fmtTime(a.timeTakenSec ?? null)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* ── Simulation History ── */}
            {simSessions.length > 0 && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                  Incident Response Simulations
                </h2>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-zinc-400 text-[10px] uppercase tracking-wide">
                      <th className="pb-1.5 font-semibold">Scenario</th>
                      <th className="pb-1.5 font-semibold">Industry</th>
                      <th className="pb-1.5 font-semibold">Outcome</th>
                      <th className="pb-1.5 font-semibold text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {simSessions.map(s => (
                      <tr key={s.id}>
                        <td className="py-1.5 font-medium text-zinc-800 pr-4">{s.template.name}</td>
                        <td className="py-1.5 text-zinc-500">{s.template.industry ?? "—"}</td>
                        <td className={`py-1.5 font-semibold text-[10px] ${s.status === "CONTAINED" ? "text-emerald-600" : "text-red-500"}`}>
                          {s.status}
                        </td>
                        <td className="py-1.5 text-right text-zinc-700 font-bold tabular-nums">{s.score ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-5">

            {/* Skills tags */}
            {(me.skills?.length > 0 || categories.length > 0) && (
              <section>
                <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                  Skills & Tools
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {(me.skills ?? []).map(s => (
                    <span key={s} className="text-[10px] font-medium bg-zinc-800 text-white px-2 py-0.5 rounded">
                      {s}
                    </span>
                  ))}
                  {categories.map(c => (
                    <span key={c} className="text-[10px] font-medium border border-zinc-300 text-zinc-600 px-2 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Rank badge */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                Platform Rank
              </h2>
              <div className="border-2 rounded-lg p-3 text-center" style={{ borderColor: rank.color }}>
                <p className="text-xl font-black" style={{ color: rank.color }}>
                  {rank.label.toUpperCase()}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{me.skillScore} skill points</p>
                {rank.nextLabel && (
                  <p className="text-[10px] text-zinc-400 mt-1">
                    {rank.pct}% to {rank.nextLabel}
                  </p>
                )}
              </div>
            </section>

            {/* Stats summary */}
            <section>
              <h2 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 mb-3">
                Performance Summary
              </h2>
              <div className="space-y-2 text-xs">
                {[
                  { k: "Completion rate", v: attempts.length ? `${Math.round((solved.length / attempts.length) * 100)}%` : "—" },
                  { k: "Hard+ solved",    v: (byDiff.HARD + byDiff.INSANE).toString() },
                  { k: "Sims contained", v: `${containedCount} / ${simSessions.length}` },
                  { k: "Total points",   v: solved.reduce((s,a) => s + a.score, 0).toLocaleString() },
                ].map(r => (
                  <div key={r.k} className="flex justify-between border-b border-zinc-100 pb-1.5">
                    <span className="text-zinc-500">{r.k}</span>
                    <span className="font-semibold text-zinc-800">{r.v}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Verified by Sage Vault */}
            <section className="mt-auto pt-4 border-t border-zinc-200">
              <p className="text-[9px] text-zinc-400 leading-relaxed">
                This resume was generated by Sage Vault — a verified cybersecurity
                training platform. All metrics reflect real performance data.
                Verify at sagenvault.com/profile/{me.id}
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, .print\\:hidden { display: none !important; }
          #resume {
            margin: 0 !important;
            padding: 1.5cm 1.8cm !important;
            max-width: none !important;
            font-size: 9.5pt !important;
            color: #18181b !important;
          }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </>
  );
}
