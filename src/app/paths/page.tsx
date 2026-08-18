import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader, StatCard, Card, Badge, ProgressBar } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

const DIFF_TONE: Record<string, "emerald" | "amber" | "red" | "purple"> = {
  EASY: "emerald",
  MEDIUM: "amber",
  HARD: "red",
  INSANE: "purple",
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Learning Paths"
          subtitle="Structured courses with certificates. Complete all labs in a path to earn your certificate."
        />

        {paths.length > 0 && (
          <div className="mb-8 grid grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

              const accent = isCompleted
                ? "border-amber-500/40 bg-amber-500/[0.06]"
                : isStarted
                  ? "border-sage-500/40 bg-sage-500/[0.06]"
                  : "";
              const tileTint = isCompleted ? "text-amber-400 bg-amber-500/10" : "text-sage-500 bg-sage-500/10";

              return (
                <Link key={path.id} href={`/paths/${path.slug}`} className="group block">
                  <Card interactive className={`flex h-full flex-col gap-3 p-5 ${accent}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tileTint}`}>
                        <Icon name={isCompleted ? "certificates" : "recon"} size={17} />
                      </div>
                      {isCompleted ? (
                        <Badge tone="amber"><Icon name="certificates" size={12} className="mr-0.5 inline-block" />Certificate</Badge>
                      ) : isStarted ? (
                        <Badge tone="emerald">{progressPct}%</Badge>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="font-semibold leading-snug text-zinc-100 transition group-hover:text-white">{path.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-500">{path.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                        {totalLabs} lab{totalLabs !== 1 ? "s" : ""}
                      </span>
                      {difficulties.map((d) => (
                        <Badge key={d} tone={DIFF_TONE[d as string] ?? "zinc"}>
                          {d.charAt(0) + d.slice(1).toLowerCase()}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-auto pt-1">
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-zinc-500">
                        <span>{labsDone} / {totalLabs} labs</span>
                        <span className="tabular-nums">{progressPct}%</span>
                      </div>
                      <ProgressBar value={progressPct} tone={isCompleted ? "amber" : "emerald"} className="h-1.5" />
                    </div>

                    <div className="text-xs font-semibold text-sage-500">
                      {isCompleted ? "View Certificate →" : isStarted ? "Continue →" : "Start Path →"}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
