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
import { userCanAccessSession } from "@/lib/simulation/team-access";
import { isSimCertEligible, SIM_CERT_MIN_SCORE } from "@/lib/sim-certificate";
import { CopyReportBtn } from "./_components/copy-report-btn";
import { GapAnalysis } from "./_components/gap-analysis";
import { MitreHeatmap } from "./_components/mitre-heatmap";
import { AttackTimeline } from "./_components/attack-timeline";
import { Navbar } from "@/components/navbar";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";


export default async function DebriefPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || !(await userCanAccessSession(user.id, session))) notFound();

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
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">{session.template.name}</p>
            <h1 className="text-3xl font-bold">Incident Debrief</h1>
            <p className="text-ink-3 mt-1 text-sm">
              {session.startedAt.toISOString().slice(0, 10)}
              {durationMin !== null ? ` · ${durationMin} min` : ""}
              · {debrief.decisions.length} decisions
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <p className={`text-3xl font-bold ${outcome === "CONTAINED" ? "text-ok" : "text-danger"}`}>
              {outcome === "CONTAINED" ? "CONTAINED" : "BREACHED"}
            </p>
            <p className="text-xl font-semibold">{finalScore} <span className="text-sm font-normal text-ink-3">pts</span></p>
            <div className="flex gap-2">
              <Link
                href={`/simulation/${sessionId}/replay`}
                className="text-xs px-3 py-1.5 rounded-lg border border-edge text-ink-2 hover:text-ink hover:border-edge-strong transition"
              >
                ▶ Replay Timeline
              </Link>
              <Link
                href={`/simulation/${sessionId}/graph`}
                className="text-xs px-3 py-1.5 rounded-lg border border-edge text-ink-2 hover:text-ink hover:border-edge-strong transition"
              >
                <Icon name="networkMap" size={14} className="inline-block" /> Attack Graph
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
            <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Your Decisions</h2>
            {debrief.decisions.length === 0 ? <p className="text-ink-3 text-sm">No actions taken.</p> : (
              <ul className="divide-y divide-edge-subtle rounded-lg border border-edge">
                {debrief.decisions.map((d, i) => (
                  <li key={i} className="p-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${d.stageBlocker ? "text-ok" : ""}`}>
                        {d.label} {d.stageBlocker && <span className="text-xs ml-1 text-ok">CONTAINED</span>}
                      </p>
                      {d.narrative && <p className="text-xs text-ink-3 mt-0.5 line-clamp-2">{d.narrative}</p>}
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${d.scoreChange >= 0 ? "text-ok" : "text-danger"}`}>
                      {d.scoreChange >= 0 ? "+" : ""}{d.scoreChange}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {debrief.missedOpportunities.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Missed Containment Opportunities</h2>
              <ul className="space-y-2">
                {debrief.missedOpportunities.map((m) => (
                  <li key={m.stage} className="rounded-lg border border-danger-edge bg-danger-wash p-3">
                    <p className="text-xs text-ink-3 uppercase tracking-wider mb-1">{m.stage.replace(/_/g, " ")}</p>
                    {m.missedActionLabels.map((label) => <p key={label} className="text-sm text-ink-2">— {label}</p>)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {debrief.consequenceLog.length > 0 && (
            <section>
              <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">System Impact Log</h2>
              <ul className="divide-y divide-edge-subtle rounded-lg border border-edge">
                {debrief.consequenceLog.map((c, i) => (
                  <li key={i} className="flex items-center justify-between p-3">
                    <div><p className="text-sm font-medium">{c.system}</p><p className="text-xs text-ink-3">{c.reason}</p></div>
                    <span className={`text-xs font-bold ${c.status === "OFFLINE" ? "text-danger" : "text-warn"}`}>{c.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Organizational Impact</h2>
            <div className="rounded-lg border border-edge p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-ink-3 mb-0.5">Org outcome</p>
                  <p className={`text-sm font-bold ${assessment.orgOutcome === "STABLE" ? "text-ok" : assessment.orgOutcome === "DISRUPTED" ? "text-warn" : "text-danger"}`}>{assessment.orgOutcome}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-3 mb-0.5">Operational score</p>
                  <p className={`text-2xl font-bold ${assessment.operationalScore >= 70 ? "text-ok" : assessment.operationalScore >= 50 ? "text-warn" : "text-danger"}`}>{assessment.operationalScore}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {([["Panic Index", orgHealth.panicIndex, true], ["Trust in SOC", orgHealth.trustInSOC, false], ["Op. Stability", orgHealth.operationalStability, false], ["Comms Integrity", orgHealth.communicationIntegrity, false], ["Insider Risk", orgHealth.insiderThreatRisk, true]] as [string, number, boolean][]).map(([label, val, inverse]) => {
                  const bad = inverse ? val > 65 : val < 35;
                  const warn = inverse ? val > 40 : val < 55;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-ink-3 mb-0.5">
                        <span>{label}</span><span className={bad ? "text-danger" : warn ? "text-warn" : "text-ok"}>{val}</span>
                      </div>
                      <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                        <div className={`h-full rounded-full ${bad ? "bg-danger" : warn ? "bg-warn" : "bg-ok"}`} style={{ width: `${val}%` }} />
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
            <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Analyst Profile</h2>
            <div className="rounded-lg border border-edge p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-ink-3">Decision speed</p>
                <p className={`text-sm font-semibold ${profile.decisionSpeed === "FAST" ? "text-ok" : profile.decisionSpeed === "SLOW" ? "text-danger" : "text-warn"}`}>{profile.decisionSpeed}</p>
              </div>
              {profile.topStrength && (
                <div className="rounded bg-ok-wash border border-ok-edge px-3 py-2">
                  <p className="text-xs text-ink-3">Top strength</p>
                  <p className="text-sm font-semibold text-ok">{profile.topStrength}</p>
                </div>
              )}
              {profile.topWeakness && (
                <div className="rounded bg-danger-wash border border-danger-edge px-3 py-2">
                  <p className="text-xs text-ink-3">Area to develop</p>
                  <p className="text-sm font-semibold text-danger">{profile.topWeakness}</p>
                </div>
              )}
              {profile.traits.map((t) => (
                <div key={t.id}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-ink-2">{t.label}</p><p className="text-xs text-ink-3">{t.score}</p>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${t.score >= 60 ? "bg-ok" : t.score >= 30 ? "bg-warn" : "bg-danger"}`} style={{ width: `${t.score}%` }} />
                  </div>
                  <p className="text-xs text-ink-3 mt-0.5">{t.evidence}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Leadership Assessment</h2>
            <div className="rounded-lg border border-edge p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-3 mb-1">Overall grade</p>
                  <p className={`text-4xl font-bold ${assessment.leadershipGrade === "A" ? "text-ok" : assessment.leadershipGrade === "B" ? "text-ok" : assessment.leadershipGrade === "C" ? "text-warn" : assessment.leadershipGrade === "D" ? "text-sev-high" : "text-danger"}`}>{assessment.leadershipGrade}</p>
                </div>
                <div className="space-y-2 min-w-[120px]">
                  {([["Technical", assessment.technicalScore], ["Operational", assessment.operationalScore]] as [string, number][]).map(([label, val]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-ink-3 mb-0.5"><span>{label}</span><span>{val}</span></div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className={`h-full rounded-full ${val >= 70 ? "bg-ok" : val >= 50 ? "bg-warn" : "bg-danger"}`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {coachingPlan.length > 0 && (
                <div className="border-t border-edge-subtle pt-3">
                  <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">Focus areas</p>
                  <ul className="space-y-2">
                    {coachingPlan.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-xs text-ink-2">
                        <span className="text-ink-3 shrink-0 mt-0.5">→</span><span>{tip}</span>
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
            {isSimCertEligible(status, finalScore) ? (
              <Link
                href={`/simulation/${sessionId}/certificate`}
                target="_blank"
                className="rounded-lg bg-accent-fill px-4 py-2.5 text-sm font-semibold text-white text-center hover:bg-ok-wash hover:text-white transition"
              >
                Claim Certificate →
              </Link>
            ) : (
              <div className="rounded-lg border border-edge px-4 py-2.5 text-xs text-ink-3 text-center">
                No certificate this run — requires containment and a score of {SIM_CERT_MIN_SCORE}+.
              </div>
            )}
            <Link href="/simulation/new" className="rounded-lg border border-edge px-4 py-2.5 text-sm text-center text-ink-2 hover:text-white hover:border-edge-strong transition">
              Run Again
            </Link>
            <Link href="/dashboard" className="rounded-lg border border-edge px-4 py-2.5 text-sm text-center text-ink-2 hover:text-white hover:border-edge-strong transition">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <GapAnalysis gap={gap} />

      {/* Recommended Labs — surfaced from weakness areas */}
      <section className="mt-12 border-t border-edge pt-10">
        <h2 className="text-sm uppercase tracking-widest text-ink-3 mb-4">Recommended Next Labs</h2>
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
                  className="rounded-xl border border-edge bg-surface-1 p-4 hover:border-ok-edge hover:bg-ok-wash transition-colors group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-ink-3 border border-ok-edge bg-ok-wash rounded px-1.5 py-0.5">
                      {rec.tag}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-ink group-hover:text-ok transition-colors mb-1">{rec.title}</p>
                  <p className="text-xs text-ink-3 leading-relaxed">{rec.reason}</p>
                  <p className="text-xs text-ok mt-3">Start lab →</p>
                </Link>
              ))}
            </div>
          );
        })()}
      </section>

      <section className="mt-12 border-t border-edge pt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm uppercase tracking-widest text-ink-3">Post-Incident Report</h2>
          <CopyReportBtn report={irReport} />
        </div>
        <div className="rounded-xl border border-edge bg-surface-1 p-6">
          <div className="prose prose-invert prose-sm max-w-none">
            {irReport.split("\n").map((line, i) => {
              if (line.startsWith("## ")) return <h3 key={i} className="text-xs uppercase tracking-widest text-ink-3 font-semibold mt-5 mb-2 first:mt-0">{line.replace("## ", "")}</h3>;
              if (line.startsWith("- ")) return <p key={i} className="text-sm text-ink-2 pl-3 flex gap-2 mb-1"><span className="text-ink-3 shrink-0">—</span><span>{line.replace("- ", "")}</span></p>;
              if (line.trim() === "") return <div key={i} className="h-1" />;
              return <p key={i} className="text-sm text-ink-2 mb-2">{line}</p>;
            })}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
