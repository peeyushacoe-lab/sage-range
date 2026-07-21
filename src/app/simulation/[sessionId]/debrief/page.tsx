import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildWorldState, computeFinalScore } from "@/lib/simulation/engine";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import { buildAnalystProfile } from "@/lib/simulation/runtime/profiler";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { buildInfluenceGraph } from "@/lib/simulation/runtime/social/graph";
import { applyContagion } from "@/lib/simulation/runtime/social/contagion";
import { computeOrganizationHealth } from "@/lib/simulation/runtime/social/sentiment";
import { computeLeadershipAssessment } from "@/lib/simulation/runtime/coaching";
import { generateCoachingPlan } from "@/lib/simulation/narrator";
import { generateIRReport, generateGapAnalysis, parseGapAnalysis } from "@/lib/simulation/runtime/ai-reports";
import type { CompanyProfile } from "@/lib/simulation/types";
import { CopyReportBtn } from "./_components/copy-report-btn";
import { GapAnalysis } from "./_components/gap-analysis";
import { MitreHeatmap } from "./_components/mitre-heatmap";
import { AttackTimeline } from "./_components/attack-timeline";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";


export default async function DebriefPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || session.userId !== user.id) notFound();

  const status = session.status as string;
  if (status === "ACTIVE") redirect(`/simulation/${sessionId}`);

  const worldState = buildWorldState(session.events);
  const outcome = (status === "CONTAINED" ? "CONTAINED" : "BREACHED") as "CONTAINED" | "BREACHED";
  const endTime = session.endedAt ?? new Date();
  const durationSeconds = Math.floor((endTime.getTime() - session.startedAt.getTime()) / 1000);
  const finalScore = computeFinalScore(session.template.slug, worldState, durationSeconds);

  const timedEvents = session.events.map((e) => ({
    id: e.id, type: e.type, actor: e.actor, payload: e.payload,
    narrative: e.narrative, createdAt: e.createdAt.toISOString(),
  }));

  const debrief = buildDebrief(session.template.slug, timedEvents, outcome, finalScore);
  const profile = buildAnalystProfile(timedEvents);
  const company = session.companyData as CompanyProfile;
  const rawStates = buildEmployeeStates(company.employees, session.events);
  const graph = buildInfluenceGraph(company.employees);
  const empStates = applyContagion(rawStates, company.employees, graph);
  const offlineCount = Object.values(worldState.systemStatuses).filter((s) => s === "OFFLINE").length;
  const orgHealth = computeOrganizationHealth(empStates, offlineCount);
  const assessment = computeLeadershipAssessment(profile, orgHealth, outcome);
  const coachingPlan = await generateCoachingPlan(profile, assessment, orgHealth, outcome);

  const durationMin = session.endedAt
    ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
    : null;

  const mitreSummary = debrief.mitreTechniques.map((t) => `${t.id} (${t.name})`).join(", ");

  const [irReport, gapRaw] = await Promise.all([
    generateIRReport({
      companyName: company.name, industry: session.template.industry,
      scenarioName: session.template.name, durationMin, outcome,
      score: finalScore, techScore: assessment.technicalScore,
      opScore: assessment.operationalScore, techniques: mitreSummary,
    }),
    generateGapAnalysis({
      techScore: assessment.technicalScore, opScore: assessment.operationalScore,
      score: finalScore, status: outcome,
      scenarioName: session.template.name, industry: session.template.industry,
      techniques: mitreSummary,
    }),
  ]);

  const gap = parseGapAnalysis(gapRaw);

  return (
    <main className="min-h-screen">
      <Navbar backHref="/simulation" backLabel="Simulations" />
      <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">{session.template.name}</p>
            <h1 className="text-3xl font-bold">Incident Debrief</h1>
            <p className="text-zinc-500 mt-1 text-sm">
              {session.startedAt.toISOString().slice(0, 10)}
              {durationMin !== null ? ` · ${durationMin} min` : ""}
              · {debrief.decisions.length} decisions
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className={`text-3xl font-bold ${outcome === "CONTAINED" ? "text-sage-500" : "text-red-400"}`}>
              {outcome === "CONTAINED" ? "CONTAINED" : "BREACHED"}
            </p>
            <p className="text-xl font-semibold">{finalScore} <span className="text-sm font-normal text-zinc-500">pts</span></p>
            <div className="flex gap-2">
              <Link
                href={`/simulation/${sessionId}/replay`}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition"
              >
                ▶ Replay Timeline
              </Link>
              <Link
                href={`/simulation/${sessionId}/graph`}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition"
              >
                ⬡ Attack Graph
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <AttackTimeline timeline={debrief.timeline} />
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Your Decisions</h2>
            {debrief.decisions.length === 0 ? <p className="text-zinc-600 text-sm">No actions taken.</p> : (
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {debrief.decisions.map((d, i) => (
                  <li key={i} className="p-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${d.stageBlocker ? "text-sage-400" : ""}`}>
                        {d.label} {d.stageBlocker && <span className="text-xs ml-1 text-sage-500">CONTAINED</span>}
                      </p>
                      {d.narrative && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{d.narrative}</p>}
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${d.scoreChange >= 0 ? "text-sage-500" : "text-red-400"}`}>
                      {d.scoreChange >= 0 ? "+" : ""}{d.scoreChange}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {debrief.missedOpportunities.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Missed Containment Opportunities</h2>
              <ul className="space-y-2">
                {debrief.missedOpportunities.map((m) => (
                  <li key={m.stage} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                    <p className="text-xs text-red-400 uppercase tracking-wider mb-1">{m.stage.replace(/_/g, " ")}</p>
                    {m.missedActionLabels.map((label) => <p key={label} className="text-sm text-zinc-400">— {label}</p>)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {debrief.consequenceLog.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">System Impact Log</h2>
              <ul className="divide-y divide-white/5 rounded-lg border border-white/10">
                {debrief.consequenceLog.map((c, i) => (
                  <li key={i} className="flex items-center justify-between p-3">
                    <div><p className="text-sm font-medium">{c.system}</p><p className="text-xs text-zinc-500">{c.reason}</p></div>
                    <span className={`text-xs font-bold ${c.status === "OFFLINE" ? "text-red-400" : "text-amber-400"}`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Organizational Impact</h2>
            <div className="rounded-lg border border-white/10 p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-0.5">Org outcome</p>
                  <p className={`text-sm font-bold ${assessment.orgOutcome === "STABLE" ? "text-sage-500" : assessment.orgOutcome === "DISRUPTED" ? "text-amber-400" : "text-red-400"}`}>{assessment.orgOutcome}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500 mb-0.5">Operational score</p>
                  <p className={`text-2xl font-bold ${assessment.operationalScore >= 70 ? "text-sage-500" : assessment.operationalScore >= 50 ? "text-amber-400" : "text-red-400"}`}>{assessment.operationalScore}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {([["Panic Index", orgHealth.panicIndex, true], ["Trust in SOC", orgHealth.trustInSOC, false], ["Op. Stability", orgHealth.operationalStability, false], ["Comms Integrity", orgHealth.communicationIntegrity, false], ["Insider Risk", orgHealth.insiderThreatRisk, true]] as [string, number, boolean][]).map(([label, val, inverse]) => {
                  const bad = inverse ? val > 65 : val < 35;
                  const warn = inverse ? val > 40 : val < 55;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-zinc-500 mb-0.5">
                        <span>{label}</span><span className={bad ? "text-red-400" : warn ? "text-amber-400" : "text-sage-500"}>{val}</span>
                      </div>
                      <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${bad ? "bg-red-500" : warn ? "bg-amber-500" : "bg-sage-500"}`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Analyst Profile</h2>
            <div className="rounded-lg border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">Decision speed</p>
                <p className={`text-sm font-semibold ${profile.decisionSpeed === "FAST" ? "text-sage-500" : profile.decisionSpeed === "SLOW" ? "text-red-400" : "text-amber-400"}`}>{profile.decisionSpeed}</p>
              </div>
              {profile.topStrength && (
                <div className="rounded bg-sage-500/10 border border-sage-500/20 px-3 py-2">
                  <p className="text-xs text-zinc-500">Top strength</p>
                  <p className="text-sm font-semibold text-sage-400">{profile.topStrength}</p>
                </div>
              )}
              {profile.topWeakness && (
                <div className="rounded bg-red-500/10 border border-red-500/20 px-3 py-2">
                  <p className="text-xs text-zinc-500">Area to develop</p>
                  <p className="text-sm font-semibold text-red-400">{profile.topWeakness}</p>
                </div>
              )}
              {profile.traits.map((t) => (
                <div key={t.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-zinc-400">{t.label}</p><p className="text-xs text-zinc-600">{t.score}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${t.score >= 60 ? "bg-sage-500" : t.score >= 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${t.score}%` }} />
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">{t.evidence}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Leadership Assessment</h2>
            <div className="rounded-lg border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Overall grade</p>
                  <p className={`text-4xl font-bold ${assessment.leadershipGrade === "A" ? "text-sage-500" : assessment.leadershipGrade === "B" ? "text-sage-400" : assessment.leadershipGrade === "C" ? "text-amber-400" : assessment.leadershipGrade === "D" ? "text-orange-400" : "text-red-400"}`}>{assessment.leadershipGrade}</p>
                </div>
                <div className="space-y-2 min-w-[120px]">
                  {([["Technical", assessment.technicalScore], ["Operational", assessment.operationalScore]] as [string, number][]).map(([label, val]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-zinc-500 mb-0.5"><span>{label}</span><span>{val}</span></div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${val >= 70 ? "bg-sage-500" : val >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {coachingPlan.length > 0 && (
                <div className="border-t border-white/5 pt-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Focus areas</p>
                  <ul className="space-y-2">
                    {coachingPlan.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-xs text-zinc-400">
                        <span className="text-zinc-600 shrink-0 mt-0.5">→</span><span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section>
            <MitreHeatmap techniques={debrief.mitreTechniques} />
          </section>

          <div className="flex flex-col gap-2">
            <Link
              href={`/simulation/${sessionId}/certificate`}
              target="_blank"
              className="rounded-lg bg-sage-500 px-4 py-2.5 text-sm font-semibold text-black text-center hover:bg-sage-700 hover:text-white transition"
            >
              Download Certificate →
            </Link>
            <Link href="/simulation/new" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-center text-zinc-400 hover:text-white hover:border-white/30 transition">
              Run Again
            </Link>
            <Link href="/dashboard" className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-center text-zinc-400 hover:text-white hover:border-white/30 transition">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <GapAnalysis gap={gap} />

      {/* Recommended Labs — surfaced from weakness areas */}
      <section className="mt-12 border-t border-white/10 pt-10">
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Recommended Next Labs</h2>
        {(() => {
          type LabRec = { slug: string; title: string; reason: string; tag: string };
          const recs: LabRec[] = [];
          const techWeak = assessment.technicalScore < 60;
          const opWeak = assessment.operationalScore < 60;
          const missedStages = debrief.missedOpportunities.map((m) => m.stage);
          const industry = (session.template.industry ?? "").toLowerCase();

          if (techWeak || missedStages.some((s) => s.includes("initial") || s.includes("recon")))
            recs.push({ slug: "network-forensics-101", title: "Network Forensics 101", reason: "Strengthen packet analysis and C2 detection — core skills for early-stage containment.", tag: "Blue Team" });
          if (techWeak || missedStages.some((s) => s.includes("lateral") || s.includes("privesc")))
            recs.push({ slug: "windows-log-analysis", title: "Windows Log Analysis", reason: "Practice correlating Event IDs for lateral movement detection across a real attack chain.", tag: "Blue Team" });
          if (opWeak || missedStages.some((s) => s.includes("contain") || s.includes("respond")))
            recs.push({ slug: "malware-triage", title: "Malware Triage", reason: "Improve speed and accuracy in static analysis — a key skill for rapid incident response.", tag: "Forensics" });
          if (industry.includes("health") || industry.includes("supply"))
            recs.push({ slug: "memory-forensics", title: "Memory Forensics", reason: "Supply chain and healthcare incidents often involve process injection — practice Volatility analysis.", tag: "Forensics" });
          if (outcome === "BREACHED" || assessment.leadershipGrade === "D" || assessment.leadershipGrade === "F")
            recs.push({ slug: "phishing-analysis", title: "Phishing Analysis", reason: "Many breaches begin with phishing. Sharpen email header forensics and social engineering recognition.", tag: "Threat Intel" });
          if (industry.includes("gov") || industry.includes("finance"))
            recs.push({ slug: "osint-investigation", title: "OSINT Investigation", reason: "Government and finance targets face persistent reconnaissance. Practice infrastructure pivoting.", tag: "OSINT" });
          if (recs.length === 0) {
            recs.push({ slug: "network-forensics-101", title: "Network Forensics 101", reason: "Continue building packet analysis skills for sustained blue team readiness.", tag: "Blue Team" });
            recs.push({ slug: "malware-triage", title: "Malware Triage", reason: "Deepen static analysis muscle memory — relevant in every scenario class.", tag: "Forensics" });
          }

          const dedupedRecs = recs.slice(0, 3);
          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {dedupedRecs.map((rec) => (
                <Link
                  key={rec.slug}
                  href={`/labs/${rec.slug}`}
                  className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 hover:border-sage-500/40 hover:bg-sage-500/5 transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-sage-500 border border-sage-500/30 bg-sage-500/10 rounded px-1.5 py-0.5">
                      {rec.tag}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-100 group-hover:text-sage-400 transition-colors mb-1">{rec.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{rec.reason}</p>
                  <p className="text-xs text-sage-500 mt-3">Start lab →</p>
                </Link>
              ))}
            </div>
          );
        })()}
      </section>

      <section className="mt-12 border-t border-white/10 pt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500">Post-Incident Report</h2>
          <CopyReportBtn report={irReport} />
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6">
          <div className="prose prose-invert prose-sm max-w-none">
            {irReport.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h3 key={i} className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mt-5 mb-2 first:mt-0">{line.replace("## ", "")}</h3>;
              if (line.startsWith("- ")) return <p key={i} className="text-sm text-zinc-400 pl-3 flex gap-2 mb-1"><span className="text-zinc-600 shrink-0">—</span><span>{line.replace("- ", "")}</span></p>;
              if (line.trim() === "") return <div key={i} className="h-1" />;
              return <p key={i} className="text-sm text-zinc-300 mb-2">{line}</p>;
            })}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
