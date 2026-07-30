// Public verification page — no auth required.
// Employers / recruiters paste the Verification ID from a simulation certificate
// to confirm it is genuine and on record.

import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { buildWorldState, computeFinalScore } from "@/lib/simulation/engine";
import { buildAnalystProfile } from "@/lib/simulation/runtime/profiler";
import { buildEmployeeStates } from "@/lib/simulation/runtime/humans/state";
import { buildInfluenceGraph } from "@/lib/simulation/runtime/social/graph";
import { applyContagion } from "@/lib/simulation/runtime/social/contagion";
import { computeOrganizationHealth } from "@/lib/simulation/runtime/social/sentiment";
import { computeLeadershipAssessment } from "@/lib/simulation/runtime/coaching";
import type { CompanyProfile } from "@/lib/simulation/types";
import { isSimCertEligible } from "@/lib/sim-certificate";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

function rating(score: number) {
  if (score >= 88) return { label: "EXCEPTIONAL", color: "text-ok",   bg: "bg-ok-wash border-ok-edge" };
  if (score >= 68) return { label: "STRONG",      color: "text-info",   bg: "bg-info-wash border-info-edge" };
  if (score >= 48) return { label: "ADEQUATE",    color: "text-warn",  bg: "bg-warn-wash border-warn-edge" };
  return              { label: "DEVELOPING",   color: "text-sev-high", bg: "bg-sev-high-wash border-sev-high-edge" };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId } = await params;

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      template: { select: { name: true, industry: true } },
      user: { select: { displayName: true, email: true } },
    },
  });

  if (!session || session.status === "ACTIVE") {
    return { title: "Certificate Verification — Sage Vault" };
  }

  const candidateName = session.user.displayName ?? session.user.email?.split("@")[0] ?? "Analyst";
  const outcome = session.status === "CONTAINED" ? "Contained" : "Breached";
  const title = `${candidateName} — ${session.template.name} Simulation Certificate | Sage Vault`;
  const description = `Verified Sage Vault incident response simulation: ${session.template.name} (${session.template.industry}). Outcome: ${outcome}.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function VerifySimulationPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      template: { select: { slug: true, name: true, industry: true } },
      user: { select: { displayName: true, email: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  // Not found or still active
  if (!session || session.status === "ACTIVE") {
    return (
      <div className="min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg text-center space-y-4">
          <p className="text-5xl font-bold text-danger"><Icon name="cross" size={14} className="inline-block shrink-0" /></p>
          <h1 className="text-2xl font-bold">Certificate Not Found</h1>
          <p className="text-ink-2 text-sm">
            This simulation certificate could not be verified. It may not exist, may still be in progress, or the ID may be incorrect.
          </p>
          <p className="font-mono text-xs text-ink-3 break-all">{sessionId}</p>
          <Link href="/" className="text-xs text-ink-3 hover:text-ink-2">
            ← Sage Vault
          </Link>
        </div>
      </div>
    );
  }

  const worldState = buildWorldState(session.events);
  const outcome = (session.status === "CONTAINED" ? "CONTAINED" : "BREACHED") as "CONTAINED" | "BREACHED";
  const verifyElapsed = session.endedAt
    ? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
    : undefined;
  const score = computeFinalScore(session.template.slug, worldState, verifyElapsed);

  const approval = isSimCertEligible(session.status, score)
    ? await db.certificateApproval.findUnique({
        where: { userId_kind_targetId: { userId: session.userId, kind: "SIMULATION", targetId: sessionId } },
      })
    : null;

  if (approval?.status !== "APPROVED") {
    return (
      <div className="min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-lg text-center space-y-4">
          <p className="text-5xl font-bold text-danger"><Icon name="cross" size={14} className="inline-block shrink-0" /></p>
          <h1 className="text-2xl font-bold">Certificate Not Found</h1>
          <p className="text-ink-2 text-sm">
            This simulation certificate could not be verified. It may not exist, may not have been approved, or the ID may be incorrect.
          </p>
          <p className="font-mono text-xs text-ink-3 break-all">{sessionId}</p>
          <Link href="/" className="text-xs text-ink-3 hover:text-ink-2">
            ← Sage Vault
          </Link>
        </div>
      </div>
    );
  }

  const timedEvents = session.events.map((e) => ({
    id: e.id, type: e.type, actor: e.actor, payload: e.payload,
    narrative: e.narrative, createdAt: e.createdAt.toISOString(),
  }));

  const profile = buildAnalystProfile(timedEvents);
  const company = session.companyData as CompanyProfile;
  const rawStates = buildEmployeeStates(company.employees, session.events);
  const graph = buildInfluenceGraph(company.employees);
  const empStates = applyContagion(rawStates, company.employees, graph);
  const offlineCount = Object.values(worldState.systemStatuses).filter((s) => s === "OFFLINE").length;
  const orgHealth = computeOrganizationHealth(empStates, offlineCount);
  const assessment = computeLeadershipAssessment(profile, orgHealth, outcome);

  const r = rating(score);
  const candidateName = session.user.displayName ?? session.user.email?.split("@")[0] ?? "Analyst";
  const issuedDate = (session.endedAt ?? session.startedAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const verificationId = sessionId.slice(0, 16).toUpperCase();
  const durationMin = session.endedAt
    ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
    : null;
  const decisionsCount = session.events.filter((e) => e.type === "STUDENT_ACTION").length;

  return (
    <div className="min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl space-y-6">

        {/* Verified banner */}
        <div className="rounded-2xl border border-ok-edge bg-ok-wash p-8 flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-ok-wash border border-ok-edge flex items-center justify-center">
            <span className="text-3xl text-ok"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-1">Verified Certificate</p>
            <h1 className="text-2xl font-bold">This simulation is genuine</h1>
            <p className="text-ink-2 text-sm mt-1">
              Issued by Sage Vault · Verified on record
            </p>
          </div>
        </div>

        {/* Certificate details */}
        <div className="rounded-2xl border border-edge bg-surface-1 divide-y divide-edge-subtle">

          {/* Candidate */}
          <div className="px-6 py-5">
            <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Candidate</p>
            <p className="text-xl font-bold">{candidateName}</p>
          </div>

          {/* Simulation */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Scenario</p>
              <p className="font-semibold text-sm">{session.template.name}</p>
              <p className="text-xs text-ink-3 mt-0.5">{session.template.industry}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Date Completed</p>
              <p className="font-semibold text-sm">{issuedDate}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Duration</p>
              <p className="font-semibold text-sm">{durationMin !== null ? `${durationMin} min` : "—"}</p>
            </div>
          </div>

          {/* Outcome + Score */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Outcome</p>
              <p className={`font-bold ${outcome === "CONTAINED" ? "text-ok" : "text-danger"}`}>
                {outcome}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Score</p>
              <p className="font-bold text-white">{score}<span className="text-ink-3 text-xs font-normal"> / 100</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Assessment</p>
              <span className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${r.bg} ${r.color}`}>
                {r.label}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Leadership</p>
              <p className="font-bold text-white">{assessment.leadershipGrade}</p>
            </div>
          </div>

          {/* Scores */}
          <div className="px-6 py-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Technical Score</p>
              <p className="font-bold">{assessment.technicalScore}<span className="text-ink-3 text-xs font-normal">/100</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Operational Score</p>
              <p className="font-bold">{assessment.operationalScore}<span className="text-ink-3 text-xs font-normal">/100</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Decisions Made</p>
              <p className="font-bold">{decisionsCount}</p>
            </div>
          </div>

          {/* Verification ID */}
          <div className="px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Verification ID</p>
              <p className="font-mono text-sm text-ink-2">{verificationId}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Platform</p>
              <p className="text-sm font-semibold text-ok">Sage Vault</p>
              <p className="text-[10px] text-ink-3">Cyber Security Training Platform</p>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-ink-3 leading-relaxed">
          This certificate was issued automatically upon completion of a live cyber incident response simulation.
          The score, assessment, and leadership grade reflect real-time decisions made during the scenario.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link href="/" className="text-xs text-ink-3 hover:text-ink-2 transition">
            ← Sage Vault
          </Link>
          <span className="text-ink-3">·</span>
          <Link href="/pricing" className="text-xs text-ink-3 hover:text-ink-2 transition">
            About the Platform
          </Link>
        </div>
      </div>
    </div>
  );
}
