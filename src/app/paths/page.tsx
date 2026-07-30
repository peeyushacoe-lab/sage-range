import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-ok",
  MEDIUM: "text-warn",
  HARD:   "text-sev-high",
  INSANE: "text-danger",
};

export default async function PathsIndex() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const paths = await db.learningPath.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    include: {
      labs: {
        include: { lab: true },
        orderBy: { order: "asc" },
      },
      progress: {
        where: { userId: user.id },
      },
    },
  });

  const labIds = paths.flatMap((p) => p.labs.map((pl) => pl.labId));

  const labResponses = await db.labResponse.findMany({
    where: { userId: user.id, labId: { in: labIds } },
    select: { labId: true, stage: true },
  });

  const completedByLab = new Map<string, Set<string>>();
  for (const r of labResponses) {
    if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
    completedByLab.get(r.labId)!.add(r.stage);
  }

  const completedPathsCount = paths.filter((p) => !!p.progress[0]?.completedAt).length;
  const startedPathsCount = paths.filter((p) => !!p.progress[0] && !p.progress[0].completedAt).length;

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Learning Paths"
          subtitle="Structured courses with certificates. Complete all labs to earn your certificate."
        />

        {paths.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Paths" value={paths.length} />
            <StatCard label="Completed" value={completedPathsCount} sub="certificates earned" />
            <StatCard label="In Progress" value={startedPathsCount} />
          </div>
        )}

        {paths.length === 0 ? (
          <EmptyState
            icon="recon"
            title="No learning paths available yet"
            description="Structured paths are being prepared. In the meantime, explore the individual labs."
            action={{ label: "Browse Labs", href: "/labs" }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paths.map((path) => {
              const userProgress = path.progress[0] ?? null;
              const isStarted = !!userProgress;
              const isCompleted = !!userProgress?.completedAt;

              const totalLabs = path.labs.length;
              const labsDone = path.labs.filter((pl) => {
                const stages = TASK_STAGES[pl.lab.slug] ?? [];
                if (stages.length === 0) return false;
                const done = completedByLab.get(pl.labId);
                return stages.every((s) => done?.has(s));
              }).length;

              const difficulties = path.labs
                .map((pl) => pl.lab.difficulty)
                .filter((v, i, a) => a.indexOf(v) === i);

              const progressPct = totalLabs > 0 ? Math.round((labsDone / totalLabs) * 100) : 0;

              let borderClass = "border-edge hover:border-ok-edge hover:bg-surface-2";
              if (isCompleted) borderClass = "border-warn-edge bg-warn-wash hover:bg-warn-wash";
              else if (isStarted) borderClass = "border-ok-edge bg-ok-wash hover:bg-ok-wash";

              return (
                <Link
                  key={path.id}
                  href={`/paths/${path.slug}`}
                  className={`rounded-xl border p-4 transition flex flex-col gap-3 ${borderClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs border border-edge rounded-full px-2 py-0.5 text-ink-2">
                        {totalLabs} lab{totalLabs !== 1 ? "s" : ""}
                      </span>
                      {difficulties.map((d) => (
                        <span
                          key={d}
                          className={`text-xs border border-edge rounded-full px-2 py-0.5 ${DIFF_COLORS[d as string] ?? "text-ink-2"}`}
                        >
                          {d.charAt(0) + d.slice(1).toLowerCase()}
                        </span>
                      ))}
                    </div>
                    {isCompleted && (
                      <span className="shrink-0 text-xs font-semibold text-warn border border-warn-edge rounded-full px-2 py-0.5">
                        Certificate
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold">{path.title}</h3>
                    <p className="text-sm text-ink-2 mt-1 line-clamp-2">{path.description}</p>
                  </div>

                  <div className="mt-auto pt-1">
                    <div className="flex items-center justify-between text-xs text-ink-3 mb-1.5">
                      <span>{labsDone} / {totalLabs} labs</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-ok transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-ok">
                    {isCompleted ? "View Certificate →" : isStarted ? "Continue →" : "Start Path →"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
