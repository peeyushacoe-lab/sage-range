import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditIncidentClient } from "./_components/edit-incident-client";

export const dynamic = "force-dynamic";

export default async function EditIncidentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [sim, companies] = await Promise.all([
    db.incidentSimulation.findUnique({
      where: { slug },
      include: {
        artifacts: { orderBy: { order: "asc" } },
        tasks: { orderBy: { order: "asc" }, include: { hints: { orderBy: { level: "asc" } } } },
      },
    }),
    db.companyEnvironment.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!sim) notFound();

  return (
    <EditIncidentClient
      sim={{
        slug: sim.slug,
        codename: sim.codename,
        title: sim.title,
        companyId: sim.companyId,
        briefing: sim.briefing,
        difficulty: sim.difficulty,
        estimatedMinutes: sim.estimatedMinutes,
        points: sim.points,
        randomized: sim.randomized,
        published: sim.published,
      }}
      companies={companies}
      artifacts={sim.artifacts.map((a) => ({
        id: a.id, type: a.type, title: a.title, content: a.content, order: a.order, tactic: a.tactic,
      }))}
      tasks={sim.tasks.map((t) => ({
        id: t.id, order: t.order, title: t.title, prompt: t.prompt, answerType: t.answerType,
        correctAnswer: t.correctAnswer, options: t.options, points: t.points,
        hints: t.hints.map((h) => ({ id: h.id, level: h.level, pointCost: h.pointCost, text: h.text })),
      }))}
    />
  );
}
