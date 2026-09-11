import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listCases, getCaseProgress, isMissionAnalystClosed, MISSION_ANALYST_CLOSES_AT } from "@/lib/missions";
import { formatIST } from "@/lib/ozh-format";
import { Navbar } from "@/components/navbar";
import { Card, Badge } from "@/components/ui";
import { StartMission } from "./_components/start-mission";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mission Analyst · Sage Vault" };

/**
 * Mission Analyst briefing.
 *
 * Each case (an IR) is a chain of phases: investigate, file findings, then
 * the next phase unlocks — ending in a final phase. This page shows one
 * card per case with a phase progress strip, and always sends the player to
 * whichever phase they should be on next.
 */
export default async function MissionAnalystPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const cases = await listCases();
  const progressByCase = await Promise.all(cases.map((c) => getCaseProgress(user.id, c.caseSlug)));
  const closed = isMissionAnalystClosed();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 text-center">
          <Badge tone="blue" className="mb-4">
            🕵 First-person investigation
          </Badge>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">MISSION ANALYST</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
            Walk the scene. Find the evidence. Draw your own conclusion.
          </p>
        </div>

        {closed ? (
          <Card className="mb-8 border-red-500/25 bg-red-500/[0.05] p-5 text-center">
            <Badge tone="red" className="mb-2">Closed</Badge>
            <p className="text-sm text-zinc-300">
              This assignment closed {formatIST(MISSION_ANALYST_CLOSES_AT)} IST. No new investigations can be
              started or submitted.
            </p>
          </Card>
        ) : (
          <p className="mb-8 text-center text-xs text-zinc-600">
            This assignment closes {formatIST(MISSION_ANALYST_CLOSES_AT)} IST.
          </p>
        )}

        <Card className="mb-8 border-blue-500/20 bg-blue-500/[0.03] p-6">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-blue-400/80">How this works</p>
          <p className="text-sm leading-relaxed text-zinc-400">
            Each case runs multiple phases. Move your cursor to look around a dark office scene
            with a flashlight, click anything it catches to examine it, then file your findings —
            who was responsible, how you&apos;d classify it, how severe it is, which evidence
            backs that up. Get through the earlier phases and a final phase unlocks with a twist
            that raises the stakes. Nothing about the answer is ever visible in advance, and each
            phase is graded on its own, server-side.
          </p>
        </Card>

        {cases.length === 0 ? (
          <Card className="p-6 text-center text-sm text-zinc-500">No investigations published yet.</Card>
        ) : (
          <div className="space-y-4">
            {cases.map((c, i) => {
              const progress = progressByCase[i];
              if (!progress) return null;
              const currentRow = progress.rows.find((r) => r.phase.slug === progress.currentSlug);
              return (
                <Card key={c.caseSlug} className="p-6">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Case file</p>
                      <h2 className="mt-1 text-xl font-bold text-zinc-100">{c.caseTitle}</h2>
                    </div>
                    {progress.complete ? (
                      <Badge tone="zinc">Complete — {progress.totalScore}/100</Badge>
                    ) : (
                      <Badge tone="emerald">
                        Phase {currentRow?.phase.phaseNumber ?? 1}/{c.phaseCount}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-400">{c.briefing}</p>

                  {/* Phase progress strip */}
                  <div className="mb-5 flex gap-2">
                    {progress.rows.map((r) => (
                      <div
                        key={r.phase.slug}
                        className={`flex-1 rounded-lg border px-3 py-2 text-center ${
                          r.status === "SUBMITTED"
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : r.status === "IN_PROGRESS"
                              ? "border-amber-500/40 bg-amber-500/10"
                              : "border-white/10 bg-white/[0.02] opacity-50"
                        }`}
                      >
                        <p className="text-[9px] uppercase tracking-widest text-zinc-500">{r.phase.phaseLabel}</p>
                        <p className="mt-0.5 text-xs font-semibold text-zinc-300">
                          {r.status === "SUBMITTED" ? `${r.score}/100` : r.status === "IN_PROGRESS" ? "Current" : "Locked"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {progress.complete ? (
                    <p className="text-xs text-zinc-600">Case closed — every phase submitted, one attempt each.</p>
                  ) : closed ? (
                    <p className="text-xs text-red-400/80">Assignment window closed — this case can no longer be started or continued.</p>
                  ) : (
                    <StartMission slug={progress.currentSlug!} resuming={!!currentRow?.hasSession} />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
