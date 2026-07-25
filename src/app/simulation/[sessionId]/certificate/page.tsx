import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildWorldState, computeFinalScore } from "@/lib/simulation/engine";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import { buildAnalystProfile } from "@/lib/simulation/runtime/profiler";
import { computeLeadershipAssessment } from "@/lib/simulation/runtime/coaching";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { buildInfluenceGraph } from "@/lib/simulation/runtime/social/graph";
import { applyContagion } from "@/lib/simulation/runtime/social/contagion";
import { computeOrganizationHealth } from "@/lib/simulation/runtime/social/sentiment";
import type { CompanyProfile } from "@/lib/simulation/types";
import { userCanAccessSession } from "@/lib/simulation/team-access";
import { CertActions } from "./_components/print-btn";
import { track } from "@/lib/analytics";
import { CertificateFrame } from "@/components/certificate/certificate-frame";
import { certificateQrSvg } from "@/components/certificate/qr";

export const dynamic = "force-dynamic";

function assessmentRating(score: number): { label: string; color: string; border: string } {
  if (score >= 88) return { label: "EXCEPTIONAL", color: "text-sage-400",   border: "border-sage-500/40" };
  if (score >= 68) return { label: "STRONG",      color: "text-blue-400",   border: "border-blue-500/40" };
  if (score >= 48) return { label: "ADEQUATE",    color: "text-amber-400",  border: "border-amber-500/40" };
  return              { label: "DEVELOPING",   color: "text-orange-400", border: "border-orange-500/40" };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { template: true, events: { orderBy: { createdAt: "asc" } } },
  });

  if (!session || !(await userCanAccessSession(user.id, session))) notFound();
  if (session.status === "ACTIVE") redirect(`/simulation/${sessionId}`);

  const worldState = buildWorldState(session.events);
  const outcome = (session.status === "CONTAINED" ? "CONTAINED" : "BREACHED") as "CONTAINED" | "BREACHED";
  const certElapsed = session.endedAt
    ? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
    : undefined;
  const score = computeFinalScore(session.template.slug, worldState, certElapsed);

  const timedEvents = session.events.map((e) => ({
    id: e.id, type: e.type, actor: e.actor, payload: e.payload,
    narrative: e.narrative, createdAt: e.createdAt.toISOString(),
  }));

  const debrief = buildDebrief(session.template.slug, timedEvents, outcome, score);
  const profile = buildAnalystProfile(timedEvents);
  const company = session.companyData as CompanyProfile;
  const rawStates = buildEmployeeStates(company.employees, session.events);
  const graph = buildInfluenceGraph(company.employees);
  const empStates = applyContagion(rawStates, company.employees, graph);
  const offlineCount = Object.values(worldState.systemStatuses).filter((s) => s === "OFFLINE").length;
  const orgHealth = computeOrganizationHealth(empStates, offlineCount);
  const assessment = computeLeadershipAssessment(profile, orgHealth, outcome);

  track("simulation.certificate_viewed", user.id, {
    sessionId,
    score,
    outcome,
    templateSlug: session.template.slug,
  });

  const rating = assessmentRating(score);
  const durationMin = session.endedAt
    ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
    : null;

  const completedDate = (session.endedAt ?? session.startedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const displayName = user.displayName || user.email?.split("@")[0] || "Analyst";
  const verifyQr = await certificateQrSvg(`https://www.cybersagevault.uk/verify/simulation/${sessionId}`);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Actions bar (hidden on print) */}
      <div className="print:hidden border-b border-white/8 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href={`/simulation/${sessionId}/debrief`} className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to Debrief
        </Link>
        <CertActions sessionId={sessionId} />
      </div>

      {/* Certificate */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 print:py-0 print:px-0 print:max-w-none">
        <CertificateFrame
          recipientName={displayName}
          intro="has successfully completed the cyber incident response simulation"
          title={session.template.name}
          detail={`${company.industry} — ${company.name}`}
          issuedOn={session.endedAt ?? session.startedAt}
          stats={[
            { icon: "target", label: "Outcome", value: outcome },
            { icon: "doc", label: "Score", value: `${score} / 100` },
            { icon: "layers", label: "Assessment", value: `${rating.label} · Grade ${assessment.leadershipGrade}` },
            ...(durationMin !== null ? [{ icon: "clock" as const, label: "Duration", value: `${durationMin} min` }] : []),
            { icon: "shield", label: "Verification ID", value: sessionId.slice(0, 16).toUpperCase() },
          ]}
          verify={{
            qrSvg: verifyQr,
            display: `cybersagevault.uk/verify/simulation/${sessionId.slice(0, 12)}…`,
          }}
        />

        <div className="rounded-2xl border-2 border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-10 mt-8 print:rounded-none print:border-0 print:bg-white print:text-black">

          {/* Skills demonstrated */}
          {debrief.mitreTechniques.length > 0 && (
            <div className="mb-10">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 print:text-zinc-400 text-center mb-3">
                MITRE ATT&CK Techniques Demonstrated
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {debrief.mitreTechniques.map((t) => (
                  <span
                    key={t.id}
                    className="rounded border border-white/10 print:border-zinc-300 bg-white/5 print:bg-zinc-50 px-2.5 py-1 text-xs font-mono text-zinc-400 print:text-zinc-600"
                  >
                    {t.id} · {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Score bars */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            {([
              ["Technical Score", assessment.technicalScore],
              ["Operational Score", assessment.operationalScore],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-zinc-500 print:text-zinc-500 mb-1">
                  <span>{label}</span><span>{val}/100</span>
                </div>
                <div className="h-2 rounded-full bg-white/8 print:bg-zinc-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${val >= 70 ? "bg-sage-500 print:bg-emerald-500" : val >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 print:border-zinc-200 pt-6 flex items-end justify-between">
            <div>
              <p className="text-xs text-zinc-500 print:text-zinc-400">Issued</p>
              <p className="text-sm font-semibold print:text-zinc-900">{completedDate}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-sage-500 print:text-emerald-600 tracking-widest mb-0.5">
                SAGE VAULT
              </div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Cyber Security Training Platform</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 print:text-zinc-400">Verification ID</p>
              <p className="font-mono text-xs text-zinc-600 print:text-zinc-400">{sessionId.slice(0, 16).toUpperCase()}</p>
              <p className="text-[10px] text-zinc-700 print:text-zinc-400 mt-0.5 break-all">
                sage-vault.com/verify/simulation/{sessionId}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
