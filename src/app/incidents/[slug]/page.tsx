import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { IncidentPlayerClient } from "./_components/incident-player-client";
import { buildTokenMap, applyTokens, simSeed } from "@/lib/incident-randomizer";
import type { NetworkNode, NetworkEvent } from "@/lib/network-map";

export const dynamic = "force-dynamic";

export default async function IncidentSimulationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const sim = await db.incidentSimulation.findUnique({
    where: { slug },
    include: {
      company: true,
      artifacts: { orderBy: { order: "asc" } },
      tasks: {
        orderBy: { order: "asc" },
        include: { hints: { orderBy: { level: "asc" } } },
      },
    },
  });
  if (!sim || !sim.published) notFound();

  const progress = await db.incidentSimProgress.findMany({
    where: { userId: user.id, simulationId: sim.id },
    select: { taskId: true },
  });
  const completedTaskIds = progress.map((p) => p.taskId);

  // If this simulation is templated, substitute this student's unique,
  // deterministic token values before rendering — the Simulation Generator.
  const tokens = sim.randomized ? buildTokenMap(simSeed(user.id, sim.id)) : null;
  const t = (s: string) => (tokens ? applyTokens(s, tokens) : s);

  const artifactsForClient = sim.artifacts.map((a) => ({ ...a, title: t(a.title), content: t(a.content) }));

  // Strip correctAnswer before sending to the client — verification happens server-side.
  const tasksForClient = sim.tasks.map(({ correctAnswer: _correctAnswer, ...task }) => ({
    ...task,
    prompt: t(task.prompt),
    options: task.options.map((o) => t(o)),
    hints: task.hints.map((h) => ({ ...h, text: t(h.text) })),
  }));

  // Network Map data is optional, simulation-authored JSON — apply the same
  // token substitution to labels/notes so randomized sims stay consistent.
  const rawNodes = (sim.networkNodes as NetworkNode[] | null) ?? null;
  const rawEvents = (sim.networkEvents as NetworkEvent[] | null) ?? null;
  const networkNodesForClient = rawNodes
    ? rawNodes.map((n) => ({ ...n, label: t(n.label) }))
    : null;
  const networkEventsForClient = rawEvents
    ? rawEvents.map((e) => ({ ...e, note: e.note ? t(e.note) : e.note }))
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/incidents" backLabel="Incident Simulations" />
      <IncidentPlayerClient
        simulation={{
          id: sim.id,
          slug: sim.slug,
          codename: sim.codename,
          title: sim.title,
          briefing: sim.briefing,
          difficulty: sim.difficulty,
          estimatedMinutes: sim.estimatedMinutes,
          points: sim.points,
          company: {
            name: sim.company.name,
            industry: sim.company.industry,
            description: sim.company.description,
            employeeCount: sim.company.employeeCount,
            networkNotes: sim.company.networkNotes,
          },
        }}
        artifacts={artifactsForClient}
        tasks={tasksForClient}
        completedTaskIds={completedTaskIds}
        networkNodes={networkNodesForClient}
        networkEvents={networkEventsForClient}
      />
    </main>
  );
}
