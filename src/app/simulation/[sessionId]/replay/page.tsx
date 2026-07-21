import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import { buildWorldState, computeFinalScore } from "@/lib/simulation/engine";
import { Navbar } from "@/components/navbar";
import { ReplayPlayer } from "./_components/replay-player";
import type { ReplayEvent, StageMarker } from "./_components/replay-player";

export const dynamic = "force-dynamic";

export default async function ReplayPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      template: { select: { name: true, slug: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session || session.userId !== user.id) notFound();
  if (session.status === "ACTIVE") redirect(`/simulation/${sessionId}`);

  const startMs = session.startedAt.getTime();
  const endMs   = session.endedAt?.getTime() ?? (session.events.at(-1)?.createdAt.getTime() ?? startMs);
  const totalMs = Math.max(0, endMs - startMs);

  // Serialise events to plain objects for client
  const replayEvents: ReplayEvent[] = session.events.map((e) => ({
    id:          e.id,
    type:        e.type,
    actor:       e.actor,
    payload:     e.payload as Record<string, unknown>,
    narrative:   e.narrative,
    relativeMs:  e.createdAt.getTime() - startMs,
  }));

  // Build stage markers from debrief
  const timedEvents = session.events.map((e) => ({
    id: e.id, type: e.type, actor: e.actor,
    payload: e.payload, narrative: e.narrative,
    createdAt: e.createdAt.toISOString(),
  }));

  const outcome = (session.status === "CONTAINED" ? "CONTAINED" : "BREACHED") as "CONTAINED" | "BREACHED";
  const worldState = buildWorldState(session.events);
  const replayElapsed = Math.floor(totalMs / 1000);
  const finalScore = computeFinalScore(session.template.slug, worldState, replayElapsed);
  const debrief = buildDebrief(session.template.slug, timedEvents, outcome, finalScore);

  const stages: StageMarker[] = debrief.timeline.map((t) => ({
    stage:       t.stage,
    label:       t.label,
    relativeMs:  new Date(t.enteredAt).getTime() - startMs,
    wasBlocked:  t.wasBlocked,
  }));

  function fmtDuration(ms: number): string {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href={`/simulation/${sessionId}/debrief`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2 inline-block"
            >
              ← Back to debrief
            </Link>
            <h1 className="text-2xl font-bold">Timeline Replay</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{session.template.name}</p>
          </div>
          <div className="text-right text-sm">
            <p className={`font-bold ${outcome === "CONTAINED" ? "text-emerald-400" : "text-red-400"}`}>
              {outcome}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {fmtDuration(totalMs)} · {replayEvents.length} events · score {finalScore}
            </p>
          </div>
        </div>

        {/* Stage legend */}
        <div className="flex flex-wrap gap-2">
          {stages.map((s) => (
            <span
              key={s.stage + s.relativeMs}
              className="text-[10px] border border-white/8 bg-zinc-900/50 rounded px-2 py-1 text-zinc-500"
            >
              {s.label}
              {s.wasBlocked && <span className="text-emerald-500 ml-1">✓</span>}
            </span>
          ))}
        </div>

        {/* Interactive player — client component */}
        <ReplayPlayer
          events={replayEvents}
          stages={stages}
          totalMs={totalMs}
          outcome={outcome}
          score={finalScore}
        />

      </main>
    </div>
  );
}
