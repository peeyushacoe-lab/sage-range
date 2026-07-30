import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader, Severity, toSeverity } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

// Difficulty is genuinely ordered, same shape as severity — EASY reads as
// "low risk to attempt", INSANE as "critical".
const DIFF_SEVERITY: Record<string, ReturnType<typeof toSeverity>> = {
  EASY: "low",
  MEDIUM: "medium",
  HARD: "high",
  INSANE: "critical",
};

const INDUSTRY_LABEL: Record<string, string> = {
  FINANCE: "Finance",
  HEALTHCARE: "Healthcare",
  EDUCATION: "Education",
  MANUFACTURING: "Manufacturing",
  RETAIL: "Retail",
  GOVERNMENT: "Government",
  TECHNOLOGY: "Technology",
};

export default async function IncidentsIndex() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const simulations = await db.incidentSimulation.findMany({
    where: { published: true },
    include: {
      company: true,
      tasks: { select: { id: true } },
    },
    orderBy: [{ difficulty: "asc" }, { points: "asc" }],
  });

  const progress = await db.incidentSimProgress.findMany({
    where: { userId: user.id, simulationId: { in: simulations.map((s) => s.id) } },
    select: { simulationId: true, taskId: true },
  });
  const completedByS = new Map<string, Set<string>>();
  for (const p of progress) {
    if (!completedByS.has(p.simulationId)) completedByS.set(p.simulationId, new Set());
    completedByS.get(p.simulationId)!.add(p.taskId);
  }

  return (
    <main className="min-h-screen bg-surface-0 text-ink">
      <Navbar />
      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Incident Simulations"
          subtitle="Chained, multi-artifact scenarios set inside fictional companies — the kind of 2-3 hour investigation a real SOC shift actually looks like, not a single isolated flag. Work through event logs, Sysmon, Defender detections, PCAP summaries, memory dumps, and registry exports to reconstruct the full attack chain, then write detection logic and an executive summary."
        />

        {simulations.length === 0 ? (
          <EmptyState icon="investigate" title="No incident simulations published yet" description="The first scenario is being prepared. Check back soon." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {simulations.map((sim, idx) => {
              const taskCount = sim.tasks.length;
              const doneCount = completedByS.get(sim.id)?.size ?? 0;
              const solved = taskCount > 0 && doneCount === taskCount;

              return (
                <Link
                  key={sim.id}
                  href={`/incidents/${sim.slug}`}
                  className={cn(
                    "animate-fade-up flex flex-col gap-3 rounded-lg border p-5 transition-colors duration-fast",
                    solved ? "border-ok-edge bg-ok-wash hover:border-ok" : "border-edge bg-surface-1 hover:border-edge-strong hover:bg-surface-2"
                  )}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">{sim.codename}</span>
                    <Severity level={DIFF_SEVERITY[sim.difficulty] ?? "low"}>{sim.difficulty}</Severity>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-2 font-medium leading-snug text-ink">
                      {sim.title}
                      {solved && <span className="text-ok"><Icon name="check" size={14} className="inline-block shrink-0" /></span>}
                    </h3>
                    <p className="mt-1 text-xs text-ink-3">
                      {sim.company.name} · {INDUSTRY_LABEL[sim.company.industry] ?? sim.company.industry}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-2">{sim.briefing}</p>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1 font-mono text-xs text-ink-3">
                    <span>~{sim.estimatedMinutes} min · {taskCount} tasks{doneCount > 0 ? ` (${doneCount}/${taskCount})` : ""}</span>
                    <span className="font-medium text-ink-2">{sim.points} pts</span>
                  </div>

                  {taskCount > 0 && doneCount > 0 && (
                    <div className="flex gap-1">
                      {Array.from({ length: taskCount }).map((_, i) => (
                        <div key={i} className={cn("h-0.5 flex-1 rounded-full", i < doneCount ? "bg-ok" : "bg-surface-inset")} />
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
