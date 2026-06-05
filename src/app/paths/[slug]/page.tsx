import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { EnrollBtn } from "./_components/enroll-btn";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const TASK_STAGES: Record<string, string[]> = {
  "welcome-ctf": ["task_1", "task_2", "task_3"],
  "sql-injection-101": ["task_1", "task_2", "task_3"],
  "soc-alert-investigation": ["investigation", "task_2", "task_3"],
};

const TASK_COUNTS: Record<string, number> = {
  "welcome-ctf": 3,
  "sql-injection-101": 3,
  "soc-alert-investigation": 3,
};

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-sage-500 border-sage-500/40",
  MEDIUM: "text-amber-400 border-amber-500/40",
  HARD:   "text-orange-400 border-orange-500/40",
  INSANE: "text-red-400 border-red-500/40",
};

export default async function PathDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const path = await db.learningPath.findUnique({
    where: { slug },
    include: {
      labs: {
        include: { lab: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!path || !path.published) notFound();

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const userProgress = await db.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  const labIds = path.labs.map((pl) => pl.labId);

  const labResponses = await db.labResponse.findMany({
    where: { userId: user.id, labId: { in: labIds } },
    select: { labId: true, stage: true },
  });

  const completedByLab = new Map<string, Set<string>>();
  for (const r of labResponses) {
    if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
    completedByLab.get(r.labId)!.add(r.stage);
  }

  const isEnrolled = !!userProgress;
  const isCompleted = !!userProgress?.completedAt;

  const allLabsDone = path.labs.every((pl) => {
    const stages = TASK_STAGES[pl.lab.slug] ?? [];
    if (stages.length === 0) return false;
    const done = completedByLab.get(pl.labId);
    return stages.every((s) => done?.has(s));
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/paths" backLabel="Paths" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{path.title}</h1>
            <p className="text-zinc-400 mt-2 leading-relaxed">{path.description}</p>
          </div>
          {isCompleted && (
            <span className="shrink-0 text-xs font-semibold text-amber-400 border border-amber-500/40 rounded-full px-3 py-1">
              Certificate Earned
            </span>
          )}
        </header>

        {!isEnrolled && (
          <div className="mb-8 rounded-xl border border-sage-500/30 bg-sage-500/5 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-sage-500 mb-1">Ready to start?</p>
              <p className="font-semibold">Enroll to track your progress</p>
              <p className="text-sm text-zinc-400 mt-1">
                Complete all {path.labs.length} lab{path.labs.length !== 1 ? "s" : ""} to earn a certificate.
              </p>
            </div>
            <EnrollBtn slug={slug} />
          </div>
        )}

        {allLabsDone && isEnrolled && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 mb-1">Path Complete</p>
              <p className="font-semibold">All labs finished — your certificate is ready.</p>
            </div>
            <Link
              href={`/paths/${slug}/certificate`}
              className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition whitespace-nowrap"
            >
              View Certificate →
            </Link>
          </div>
        )}

        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Labs in this path</h2>
          <div className="flex flex-col gap-3">
            {path.labs.map((pl, idx) => {
              const lab = pl.lab;
              const stages = TASK_STAGES[lab.slug] ?? [];
              const done = completedByLab.get(pl.labId);
              const completedCount = stages.filter((s) => done?.has(s)).length;
              const labDone = stages.length > 0 && stages.every((s) => done?.has(s));
              const taskCount = TASK_COUNTS[lab.slug] ?? stages.length;
              const diffColor = DIFF_COLORS[lab.difficulty as string] ?? "text-zinc-400 border-white/10";

              return (
                <div
                  key={pl.id}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${labDone ? "border-sage-500/40 bg-sage-500/5" : "border-white/8"}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${labDone ? "border-sage-500 bg-sage-500 text-zinc-950" : "border-zinc-700 text-zinc-500"}`}>
                      {labDone ? "✓" : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{lab.title}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                        <span className={`border px-1.5 py-0.5 rounded-full font-medium ${diffColor}`}>{lab.difficulty}</span>
                        <span className="text-zinc-700">·</span>
                        <span>
                          {taskCount} task{taskCount !== 1 ? "s" : ""}
                          {completedCount > 0 && !labDone && ` (${completedCount}/${taskCount})`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/labs/${lab.slug}`}
                    className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-sage-500/40 hover:text-sage-500 transition"
                  >
                    {labDone ? "Review" : completedCount > 0 ? "Continue" : "Start"} →
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
