import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-sage-500",
  MEDIUM: "text-amber-400",
  HARD: "text-orange-400",
  INSANE: "text-red-400",
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Incident Simulations</h1>
          <p className="text-zinc-400 mt-2 max-w-3xl">
            Chained, multi-artifact scenarios set inside fictional companies — the kind of 2-3 hour investigation
            a real SOC shift actually looks like, not a single isolated flag. Work through event logs, Sysmon,
            Defender detections, PCAP summaries, memory dumps, and registry exports to reconstruct the full attack
            chain, then write detection logic and an executive summary.
          </p>
        </header>

        {simulations.length === 0 ? (
          <p className="text-zinc-500 text-sm">No incident simulations published yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simulations.map((sim, idx) => {
              const taskCount = sim.tasks.length;
              const doneCount = completedByS.get(sim.id)?.size ?? 0;
              const solved = taskCount > 0 && doneCount === taskCount;

              return (
                <Link
                  key={sim.id}
                  href={`/incidents/${sim.slug}`}
                  className={`card-hover rounded-xl border p-5 flex flex-col gap-3 relative overflow-hidden animate-fade-up ${
                    solved ? "border-sage-500/40 bg-sage-500/5" : "border-white/8 bg-zinc-900/60"
                  }`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {solved && <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/15 rounded-full blur-xl" />}

                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-sage-500 font-mono">{sim.codename}</span>
                    <span className={`text-xs font-bold font-mono ${DIFF_COLORS[sim.difficulty] ?? "text-zinc-400"}`}>
                      {sim.difficulty}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold flex items-center gap-2 leading-snug">
                      {sim.title}
                      {solved && <span className="text-sage-500">✓</span>}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {sim.company.name} · {INDUSTRY_LABEL[sim.company.industry] ?? sim.company.industry}
                    </p>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{sim.briefing}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-1 text-xs text-zinc-600 font-mono">
                    <span>~{sim.estimatedMinutes} min · {taskCount} tasks{doneCount > 0 ? ` (${doneCount}/${taskCount})` : ""}</span>
                    <span className="font-bold text-zinc-400">{sim.points} pts</span>
                  </div>

                  {taskCount > 0 && doneCount > 0 && (
                    <div className="flex gap-1">
                      {Array.from({ length: taskCount }).map((_, i) => (
                        <div key={i} className={`flex-1 h-0.5 rounded-full ${i < doneCount ? "bg-sage-500" : "bg-zinc-800"}`} />
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
