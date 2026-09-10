import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listPublishedScenarios } from "@/lib/missions";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { Card, Badge } from "@/components/ui";
import { StartMission } from "./_components/start-mission";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mission Analyst · Sage Vault" };

/**
 * Mission Analyst briefing — V1.
 *
 * One scenario for now ("The Insider"). This page is the doorway into the
 * 3D investigation: it shows the case brief and starts (or resumes) the
 * player's one attempt, same one-shot rule as Operation Zero Hour.
 */
export default async function MissionAnalystPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const scenarios = await listPublishedScenarios();

  const sessions = await db.missionSession.findMany({
    where: { userId: user.id, scenarioId: { in: scenarios.map((s) => s.id) } },
  });
  const sessionByScenario = new Map(sessions.map((s) => [s.scenarioId, s]));

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

        <Card className="mb-8 border-blue-500/20 bg-blue-500/[0.03] p-6">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-blue-400/80">How this works</p>
          <p className="text-sm leading-relaxed text-zinc-400">
            No dashboard, no question list. You&apos;re dropped into a 3D room as the first
            responder. Walk up to anything interactive and press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">E</kbd> to
            examine it — nothing tells you in advance what matters. Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px]">Tab</kbd> at
            any time for your investigator notebook, which tracks everything you&apos;ve found so far.
          </p>
        </Card>

        {scenarios.length === 0 ? (
          <Card className="p-6 text-center text-sm text-zinc-500">No investigations published yet.</Card>
        ) : (
          <div className="space-y-4">
            {scenarios.map((s) => {
              const session = sessionByScenario.get(s.id);
              return (
                <Card key={s.id} className="p-6">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500">Case file</p>
                      <h2 className="mt-1 text-xl font-bold text-zinc-100">{s.title}</h2>
                    </div>
                    {session && (
                      <Badge tone={session.status === "SUBMITTED" ? "zinc" : "emerald"}>
                        {session.status === "SUBMITTED" ? "Submitted" : "In progress"}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-zinc-400">{s.briefing}</p>
                  <p className="mb-5 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-zinc-500">
                    <span className="font-semibold text-zinc-400">Your objective: </span>
                    {s.objective}
                  </p>
                  {session?.status === "SUBMITTED" ? (
                    <p className="text-xs text-zinc-600">This investigation is closed — one attempt per case.</p>
                  ) : (
                    <StartMission slug={s.slug} resuming={!!session} />
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
