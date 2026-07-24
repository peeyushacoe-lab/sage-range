import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { buildTokenMap, applyTokens, simSeed } from "@/lib/incident-randomizer";
import { ReportBuilderClient } from "./_components/report-builder-client";

export const dynamic = "force-dynamic";

export default async function ReportBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const sim = await db.incidentSimulation.findUnique({
    where: { slug },
    include: {
      company: true,
      artifacts: { orderBy: { order: "asc" } },
    },
  });
  if (!sim || !sim.published) notFound();

  const tokens = sim.randomized ? buildTokenMap(simSeed(user.id, sim.id)) : null;
  const t = (s: string) => (tokens ? applyTokens(s, tokens) : s);

  // Pull whatever context we can to help the student get oriented — this is
  // scaffolding, not an answer key. The report itself is freeform prose.
  const timelineArtifact = sim.artifacts.find((a) => a.type === "TIMELINE");

  const existing = await db.incidentSimReport.findUnique({
    where: { userId_simulationId: { userId: user.id, simulationId: sim.id } },
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref={`/incidents/${slug}`} backLabel={sim.codename} />
      <ReportBuilderClient
        simulationId={sim.id}
        simulationSlug={slug}
        title={sim.title}
        company={{ name: sim.company.name, industry: sim.company.industry, employeeCount: sim.company.employeeCount }}
        timelineHint={timelineArtifact ? t(timelineArtifact.content) : null}
        existing={
          existing
            ? {
                executiveSummary: existing.executiveSummary,
                incidentTimeline: existing.incidentTimeline,
                technicalFindings: existing.technicalFindings,
                mitreMapping: existing.mitreMapping,
                indicatorsOfCompromise: existing.indicatorsOfCompromise,
                businessImpact: existing.businessImpact,
                containmentActions: existing.containmentActions,
                recommendations: existing.recommendations,
                submitted: !!existing.submittedAt,
              }
            : null
        }
      />
    </main>
  );
}
