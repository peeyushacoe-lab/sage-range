import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { IncidentPlayerClient } from "./_components/incident-player-client";

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

  // Strip correctAnswer before sending to the client — verification happens server-side.
  const tasksForClient = sim.tasks.map(({ correctAnswer: _correctAnswer, ...t }) => t);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/incidents" backLabel="Incident Simulations" />
      <IncidentPlayerClient
        simulation={{
          id: sim.id,
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
        artifacts={sim.artifacts}
        tasks={tasksForClient}
        completedTaskIds={completedTaskIds}
      />
    </main>
  );
}
