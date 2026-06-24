import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { EnrollBtn } from "./_components/enroll-btn";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

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
      labs: { include: { lab: true }, orderBy: { order: "asc" } },
      modules: {
        where: { published: true },
        orderBy: { order: "asc" },
        include: {
          quiz: { select: { id: true, passMark: true } },
          assessment: { select: { id: true } },
        },
      },
    },
  });

  if (!path || !path.published) notFound();

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const userProgress = await db.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  const isEnrolled = !!userProgress;
  const isCompleted = !!userProgress?.completedAt;
  const hasModules = path.modules.length > 0;

  // Module-based progress
  let moduleProgressMap = new Map<string, { quizPassed: boolean; assessmentDone: boolean; completedAt: Date | null }>();
  if (hasModules) {
    const progRecords = await db.userModuleProgress.findMany({
      where: { userId: user.id, moduleId: { in: path.modules.map((m) => m.id) } },
    });
    for (const p of progRecords) {
      moduleProgressMap.set(p.moduleId, {
        quizPassed: p.quizPassed,
        assessmentDone: p.assessmentDone,
        completedAt: p.completedAt,
      });
    }
  }

  const completedModules = hasModules
    ? path.modules.filter((m) => moduleProgressMap.get(m.id)?.completedAt).length
    : 0;
  const allModulesDone = hasModules && completedModules === path.modules.length;

  // Locking: module is locked if any earlier required module is incomplete
  const isModuleLocked = (modOrder: number): boolean => {
    return path.modules
      .filter((m) => m.order < modOrder && m.isRequired)
      .some((m) => !moduleProgressMap.get(m.id)?.completedAt);
  };

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
                Complete all {hasModules ? path.modules.length : path.labs.length}{" "}
                {hasModules ? "module" : "lab"}
                {(hasModules ? path.modules.length : path.labs.length) !== 1 ? "s" : ""} to earn a certificate.
              </p>
            </div>
            <EnrollBtn slug={slug} />
          </div>
        )}

        {allModulesDone && isEnrolled && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 mb-1">Path Complete</p>
              <p className="font-semibold">All modules finished — your certificate is ready.</p>
            </div>
            <Link
              href={`/paths/${slug}/certificate`}
              className="shrink-0 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition whitespace-nowrap"
            >
              View Certificate →
            </Link>
          </div>
        )}

        {hasModules ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-zinc-500">
                Modules — {completedModules}/{path.modules.length} complete
              </h2>
              {isEnrolled && path.modules.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage-500 rounded-full transition-all"
                      style={{ width: `${Math.round((completedModules / path.modules.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {Math.round((completedModules / path.modules.length) * 100)}%
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {path.modules.map((mod, idx) => {
                const prog = moduleProgressMap.get(mod.id);
                const isDone = !!prog?.completedAt;
                const locked = isModuleLocked(mod.order);
                const hasQuiz = !!mod.quiz;
                const hasAssessment = !!mod.assessment;

                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition ${
                      isDone
                        ? "border-sage-500/40 bg-sage-500/5"
                        : locked
                        ? "border-white/5 opacity-60"
                        : "border-white/8"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? "border-sage-500 bg-sage-500 text-zinc-950"
                          : locked
                          ? "border-zinc-700 text-zinc-600"
                          : "border-zinc-700 text-zinc-500"
                      }`}>
                        {isDone ? "✓" : locked ? "🔒" : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${locked ? "text-zinc-500" : ""}`}>{mod.title}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5 flex-wrap">
                          {mod.isRequired && !isDone && (
                            <span className="border border-white/10 px-1.5 py-0.5 rounded-full text-zinc-600 text-[10px]">Required</span>
                          )}
                          {hasQuiz && (
                            <span className={`border px-1.5 py-0.5 rounded-full ${prog?.quizPassed ? "border-sage-500/40 text-sage-500" : "border-white/10"}`}>
                              Quiz{prog?.quizPassed ? " ✓" : ""}
                            </span>
                          )}
                          {hasAssessment && (
                            <span className={`border px-1.5 py-0.5 rounded-full ${prog?.assessmentDone ? "border-sage-500/40 text-sage-500" : "border-white/10"}`}>
                              Assessment{prog?.assessmentDone ? " ✓" : ""}
                            </span>
                          )}
                          {!hasQuiz && !hasAssessment && (
                            <span>Reading only</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {locked ? (
                      <span className="shrink-0 text-xs text-zinc-600 px-4 py-2">Locked</span>
                    ) : (
                      <Link
                        href={`/paths/${slug}/modules/${mod.id}`}
                        className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-sage-500/40 hover:text-sage-500 transition"
                      >
                        {isDone ? "Review" : prog ? "Continue" : "Start"} →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Labs in this path</h2>
            <div className="flex flex-col gap-3">
              {path.labs.map((pl, idx) => {
                const lab = pl.lab;
                const diffColor = DIFF_COLORS[lab.difficulty as string] ?? "text-zinc-400 border-white/10";
                return (
                  <div key={pl.id} className="rounded-xl border border-white/8 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="shrink-0 h-7 w-7 rounded-full border-2 border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{lab.title}</p>
                        <span className={`border px-1.5 py-0.5 rounded-full font-medium text-xs ${diffColor}`}>{lab.difficulty}</span>
                      </div>
                    </div>
                    <Link
                      href={`/labs/${lab.slug}`}
                      className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-300 hover:border-sage-500/40 hover:text-sage-500 transition"
                    >
                      Start →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
