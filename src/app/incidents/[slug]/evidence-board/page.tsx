import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { buildTokenMap, applyTokens, simSeed } from "@/lib/incident-randomizer";
import { EvidenceBoardClient } from "./_components/evidence-board-client";

export const dynamic = "force-dynamic";

export default async function EvidenceBoardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const sim = await db.incidentSimulation.findUnique({
    where: { slug },
    include: { artifacts: { orderBy: { order: "asc" } } },
  });
  if (!sim || !sim.published) notFound();

  const tokens = sim.randomized ? buildTokenMap(simSeed(user.id, sim.id)) : null;
  const t = (s: string) => (tokens ? applyTokens(s, tokens) : s);

  // Only artifacts with a tactic assigned are part of the exercise — strip
  // the tactic itself before sending to the client so it isn't leaked.
  const evidenceItems = sim.artifacts
    .filter((a) => a.tactic !== null)
    .map((a) => ({ id: a.id, title: t(a.title), content: t(a.content), type: a.type }));

  const existing = await db.incidentSimEvidenceBoard.findUnique({
    where: { userId_simulationId: { userId: user.id, simulationId: sim.id } },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref={`/incidents/${slug}`} backLabel={sim.codename} />
      <EvidenceBoardClient
        simulationId={sim.id}
        simulationSlug={slug}
        title={sim.title}
        items={evidenceItems}
        existing={
          existing
            ? {
                categorization: existing.categorization as Record<string, string>,
                timelineOrder: existing.timelineOrder,
                score: existing.score,
                accuracyPct: existing.accuracyPct,
                completed: !!existing.completedAt,
              }
            : null
        }
      />
    </main>
  );
}
