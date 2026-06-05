// Recruiter candidate assessment report — printable, shareable PDF.
// Accessible by RECRUITER and ADMIN only.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildAnalystProfile } from "@/lib/simulation/runtime/profiler";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { buildInfluenceGraph } from "@/lib/simulation/runtime/social/graph";
import { applyContagion } from "@/lib/simulation/runtime/social/contagion";
import { computeOrganizationHealth } from "@/lib/simulation/runtime/social/sentiment";
import { computeLeadershipAssessment } from "@/lib/simulation/runtime/coaching";
import { buildWorldState } from "@/lib/simulation/engine";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import type { CompanyProfile } from "@/lib/simulation/types";
import { PrintBtn } from "./_components/print-btn";

export const dynamic = "force-dynamic";

function rating(score: number) {
  if (score >= 88) return { label: "EXCEPTIONAL", color: "text-emerald-600", bar: "bg-emerald-500" };
  if (score >= 68) return { label: "STRONG",      color: "text-blue-600",   bar: "bg-blue-500" };
  if (score >= 48) return { label: "ADEQUATE",    color: "text-amber-600",  bar: "bg-amber-500" };
  return              { label: "DEVELOPING",   color: "text-orange-600", bar: "bg-orange-500" };
}

export default async function CandidateReportPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");
  if (me.role !== "RECRUITER" && me.role !== "ADMIN") redirect("/dashboard");

  const [candidate, sessions] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      include: { certification: true },
    }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      include: {
        template: { select: { name: true, industry: true, slug: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { endedAt: "desc" },
      take: 5,
    }),
  ]);

  if (!candidate || candidate.role !== "STUDENT") notFound();

  const labsSolved = await db.attempt.count({
    where: { userId, status: "SOLVED" },
  });

  const candidateName = candidate.displayName ?? candidate.email.split("@")[0];
  const bestSession = sessions.reduce<(typeof sessions)[0] | null>(
    (best, s) => (!best || s.score > best.score ? s : best),
    null
  );

  // Build full assessment from best session
  let assessment = null;
  let profile = null;
  let mitreTechniques: { id: string; name: string; tactic: string }[] = [];

  if (bestSession) {
    const ws = buildWorldState(bestSession.events);
    const outcome = bestSession.status as "CONTAINED" | "BREACHED";
    const timedEvents = bestSession.events.map((e) => ({
      id: e.id, type: e.type, actor: e.actor, payload: e.payload,
      narrative: e.narrative, createdAt: e.createdAt.toISOString(),
    }));
    profile = buildAnalystProfile(timedEvents);
    const debrief = buildDebrief(bestSession.template.slug, timedEvents, outcome, ws.score);
    mitreTechniques = debrief.mitreTechniques;
    const company = bestSession.companyData as CompanyProfile;
    const rawStates = buildEmployeeStates(company.employees, bestSession.events);
    const graph = buildInfluenceGraph(company.employees);
    const empStates = applyContagion(rawStates, company.employees, graph);
    const offlineCount = Object.values(ws.systemStatuses).filter((s) => s === "OFFLINE").length;
    const orgHealth = computeOrganizationHealth(empStates, offlineCount);
    assessment = computeLeadershipAssessment(profile, orgHealth, outcome);
  }

  const bestScore = bestSession?.score ?? 0;
  const r = rating(bestScore);
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const extra = (candidate.profileExtra ?? {}) as Record<string, unknown>;
  const projects = Array.isArray(extra.projects)
    ? extra.projects as { name: string; description: string; url: string }[]
    : [];

  return (
    <>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Screen nav */}
      <div className="no-print bg-zinc-950 border-b border-white/8 px-6 py-3 flex items-center justify-between">
        <Link href={`/profile/${userId}`} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to Profile
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600">Sage Forge · Candidate Assessment Report</span>
          <PrintBtn />
        </div>
      </div>

      {/* Report body */}
      <main className="min-h-screen bg-white text-zinc-900 print:bg-white">
        <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 mb-2">
                Sage Forge · Candidate Assessment Report
              </p>
              <h1 className="text-3xl font-bold text-zinc-900">{candidateName}</h1>
              {candidate.email && <p className="text-zinc-500 text-sm mt-0.5">{candidate.email}</p>}
              {candidate.university && <p className="text-zinc-500 text-sm">{candidate.university}</p>}
              <div className="flex gap-3 mt-2">
                {candidate.linkedIn && (
                  <span className="text-xs text-zinc-500">LinkedIn: {candidate.linkedIn}</span>
                )}
                {candidate.cvUrl && (
                  <span className="text-xs text-zinc-500">CV on file</span>
                )}
              </div>
            </div>
            <div className="text-right">
              {sessions.length > 0 && (
                <div className={`text-4xl font-bold ${r.color} mb-1`}>{r.label}</div>
              )}
              <p className="text-xs text-zinc-500">Generated {generatedDate}</p>
              <p className="text-xs text-zinc-400">by Sage Forge</p>
            </div>
          </div>

          {/* Score overview */}
          {bestSession && assessment && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Assessment Summary</h2>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "Best Score", value: `${bestScore}`, sub: "pts" },
                  { label: "Outcome", value: bestSession.status, sub: bestSession.template.name },
                  { label: "Leadership", value: assessment.leadershipGrade, sub: "grade" },
                  { label: "Technical", value: `${assessment.technicalScore}`, sub: "/100" },
                  { label: "Operational", value: `${assessment.operationalScore}`, sub: "/100" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
                    <p className={`text-xl font-bold ${value === "CONTAINED" ? "text-emerald-600" : value === "BREACHED" ? "text-red-600" : "text-zinc-900"}`}>
                      {value}
                    </p>
                    <p className="text-[10px] text-zinc-400">{sub}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Score bars */}
          {assessment && (
            <section>
              <div className="grid grid-cols-2 gap-6">
                {([
                  ["Technical Score", assessment.technicalScore],
                  ["Operational Score", assessment.operationalScore],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
                      <span className="font-medium">{label}</span>
                      <span>{val}/100</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val >= 70 ? "bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${val}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Analyst profile */}
          {profile && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Analyst Profile</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm border-b border-zinc-100 pb-2">
                    <span className="text-zinc-600">Decision Speed</span>
                    <span className="font-semibold">{profile.decisionSpeed}</span>
                  </div>
                  {profile.topStrength && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Top Strength</p>
                      <p className="text-sm font-semibold text-emerald-700">{profile.topStrength}</p>
                    </div>
                  )}
                  {profile.topWeakness && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">Development Area</p>
                      <p className="text-sm font-semibold text-red-700">{profile.topWeakness}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5">
                  {profile.traits.map((t) => (
                    <div key={t.id}>
                      <div className="flex justify-between text-xs text-zinc-600 mb-1">
                        <span>{t.label}</span><span>{t.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${t.score >= 60 ? "bg-emerald-500" : t.score >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${t.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Simulation history */}
          {sessions.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">Simulation History</h2>
              <table className="w-full text-sm border border-zinc-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="text-left px-4 py-2">Scenario</th>
                    <th className="text-left px-4 py-2">Industry</th>
                    <th className="text-center px-4 py-2">Outcome</th>
                    <th className="text-right px-4 py-2">Score</th>
                    <th className="text-right px-4 py-2">Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sessions.map((s) => {
                    const sr = rating(s.score);
                    return (
                      <tr key={s.id} className="hover:bg-zinc-50">
                        <td className="px-4 py-2.5 font-medium">{s.template.name}</td>
                        <td className="px-4 py-2.5 text-zinc-500 text-xs">{s.template.industry}</td>
                        <td className={`px-4 py-2.5 text-center text-xs font-bold ${s.status === "CONTAINED" ? "text-emerald-600" : "text-red-600"}`}>
                          {s.status}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">{s.score}</td>
                        <td className={`px-4 py-2.5 text-right text-xs font-bold ${sr.color}`}>{sr.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {/* MITRE techniques */}
          {mitreTechniques.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">MITRE ATT&CK Exposure</h2>
              <div className="flex flex-wrap gap-2">
                {mitreTechniques.map((t) => (
                  <span key={t.id} className="rounded border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-mono text-zinc-600">
                    {t.id} · {t.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {candidate.skills.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Stated Skills</h2>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((s) => (
                  <span key={s} className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{s}</span>
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Projects</h2>
              <div className="grid grid-cols-2 gap-4">
                {projects.map((p, i) => (
                  <div key={i} className="rounded-lg border border-zinc-200 p-3">
                    <p className="font-semibold text-sm">{p.name}</p>
                    {p.description && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{p.description}</p>}
                    {p.url && <p className="text-xs text-zinc-400 mt-1">{p.url}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Lab stats */}
          <section className="grid grid-cols-3 gap-4 border-t border-zinc-200 pt-6">
            {[
              { label: "Skill Score", value: candidate.skillScore },
              { label: "Labs Solved", value: labsSolved },
              { label: "Simulations Run", value: sessions.length },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-bold text-zinc-900">{value}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </section>

          {/* Footer */}
          <div className="border-t border-zinc-200 pt-4 flex items-center justify-between text-xs text-zinc-400">
            <span>Sage Forge · cybersage.uk</span>
            <span>Candidate ID: {userId.slice(0, 16).toUpperCase()}</span>
            <span>{generatedDate}</span>
          </div>
        </div>
      </main>
    </>
  );
}
