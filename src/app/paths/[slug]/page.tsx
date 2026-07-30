import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { EnrollBtn } from "./_components/enroll-btn";
import { Navbar } from "@/components/navbar";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import { requestCertificateApproval } from "@/lib/certificate-approval";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-ok border-ok-edge",
  MEDIUM: "text-warn border-warn-edge",
  HARD:   "text-sev-high border-sev-high-edge",
  INSANE: "text-danger border-danger-edge",
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

  let userProgress = await db.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  const isEnrolled = !!userProgress;
  let isCompleted = !!userProgress?.completedAt;
  const hasModules = path.modules.length > 0;

  // Lab-based paths (PathLab, no Modules) don't get an automatic completion
  // event the way module quizzes/assessments do — derive it here from lab
  // completion, matching the same TASK_STAGES check used on /paths.
  let labsDone = 0;
  let allLabsDone = false;
  let labDoneFlags: boolean[] = path.labs.map(() => false);
  if (!hasModules && path.labs.length > 0) {
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
    labDoneFlags = path.labs.map((pl) => {
      const stages = TASK_STAGES[pl.lab.slug] ?? [];
      if (stages.length === 0) return false;
      const done = completedByLab.get(pl.labId);
      return stages.every((s) => done?.has(s));
    });
    labsDone = labDoneFlags.filter(Boolean).length;
    allLabsDone = labsDone === path.labs.length;

    if (isEnrolled && !isCompleted && allLabsDone) {
      userProgress = await db.userPathProgress.update({
        where: { userId_pathId: { userId: user.id, pathId: path.id } },
        data: { completedAt: new Date() },
      });
      isCompleted = true;
    }
  }

  // Ensure a certificate approval request exists whenever the path is complete —
  // covers paths that were completed before this workflow existed (or via the
  // seed script), not just fresh completions. requestCertificateApproval is
  // idempotent, so this is safe on every load.
  let certApproval = isCompleted
    ? await db.certificateApproval.findUnique({
        where: { userId_kind_targetId: { userId: user.id, kind: "PATH", targetId: path.id } },
      })
    : null;
  if (isCompleted && !certApproval) {
    certApproval = await requestCertificateApproval(user.id, "PATH", path.id, path.title);
  }
  const certApproved = certApproval?.status === "APPROVED";

  const capstoneSlug = path.capstoneSimulationSlug;
  const capstoneReady = isCompleted && !!capstoneSlug;

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
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar backHref="/paths" backLabel="Paths" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{path.title}</h1>
            <p className="text-ink-2 mt-2 leading-relaxed">{path.description}</p>
          </div>
          {isCompleted && (
            <span className="shrink-0 text-xs font-semibold text-warn border border-warn-edge rounded-full px-3 py-1">
              Certificate Earned
            </span>
          )}
        </header>

        {!isEnrolled && (
          <div className="mb-8 rounded-xl border border-ok-edge bg-ok-wash p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Ready to start?</p>
              <p className="font-semibold">Enroll to track your progress</p>
              <p className="text-sm text-ink-2 mt-1">
                Complete all {hasModules ? path.modules.length : path.labs.length}{" "}
                {hasModules ? "module" : "lab"}
                {(hasModules ? path.modules.length : path.labs.length) !== 1 ? "s" : ""} to earn a certificate.
              </p>
            </div>
            <EnrollBtn slug={slug} />
          </div>
        )}

        {((allModulesDone && hasModules) || (!hasModules && allLabsDone)) && isEnrolled && (
          <div className="mb-8 rounded-xl border border-warn-edge bg-warn-wash p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Path Complete</p>
              <p className="font-semibold">
                {certApproved
                  ? `All ${hasModules ? "modules" : "labs"} finished — your certificate is ready.`
                  : certApproval?.status === "REJECTED"
                  ? "Certificate request was not approved — contact your instructor."
                  : `All ${hasModules ? "modules" : "labs"} finished — awaiting admin approval for your certificate.`}
              </p>
            </div>
            {certApproved ? (
              <Link
                href={`/paths/${slug}/certificate`}
                className="shrink-0 rounded-lg border border-warn-edge bg-warn-wash px-5 py-2.5 text-sm font-semibold text-warn hover:bg-warn-wash transition whitespace-nowrap"
              >
                View Certificate →
              </Link>
            ) : (
              <span className="shrink-0 rounded-lg border border-edge px-5 py-2.5 text-sm font-semibold text-ink-3 whitespace-nowrap">
                {certApproval?.status === "REJECTED" ? "Not Approved" : "Pending Approval"}
              </span>
            )}
          </div>
        )}

        {capstoneReady && (
          <div className="mb-8 rounded-xl border border-ok-edge bg-ok-wash p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Capstone Unlocked</p>
              <p className="font-semibold">Put it all together in a full Incident Simulation.</p>
            </div>
            <Link
              href={`/incidents/${capstoneSlug}`}
              className="shrink-0 rounded-lg bg-accent-fill px-5 py-2.5 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white transition whitespace-nowrap"
            >
              Start Capstone →
            </Link>
          </div>
        )}

        {hasModules ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-ink-3">
                Modules — {completedModules}/{path.modules.length} complete
              </h2>
              {isEnrolled && path.modules.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ok rounded-full transition-all"
                      style={{ width: `${Math.round((completedModules / path.modules.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-3">
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
                        ? "border-ok-edge bg-ok-wash"
                        : locked
                        ? "border-edge-subtle opacity-60"
                        : "border-edge"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        isDone
                          ? "border-ok-edge bg-ok text-surface-0"
                          : locked
                          ? "border-edge-strong text-ink-3"
                          : "border-edge-strong text-ink-3"
                      }`}>
                        {isDone ? <Icon name="check" size={13} /> : locked ? <Icon name="lock" size={13} /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium truncate ${locked ? "text-ink-3" : ""}`}>{mod.title}</p>
                        <div className="flex items-center gap-2 text-xs text-ink-3 mt-0.5 flex-wrap">
                          {mod.isRequired && !isDone && (
                            <span className="border border-edge px-1.5 py-0.5 rounded-full text-ink-3 text-[10px]">Required</span>
                          )}
                          {hasQuiz && (
                            <span className={`border px-1.5 py-0.5 rounded-full ${prog?.quizPassed ? "border-ok-edge text-ok" : "border-edge"}`}>
                              Quiz{prog?.quizPassed && <Icon name="check" size={11} className="inline-block ml-1" />}
                            </span>
                          )}
                          {hasAssessment && (
                            <span className={`border px-1.5 py-0.5 rounded-full ${prog?.assessmentDone ? "border-ok-edge text-ok" : "border-edge"}`}>
                              Assessment{prog?.assessmentDone && <Icon name="check" size={11} className="inline-block ml-1" />}
                            </span>
                          )}
                          {!hasQuiz && !hasAssessment && (
                            <span>Reading only</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {locked ? (
                      <span className="shrink-0 text-xs text-ink-3 px-4 py-2">Locked</span>
                    ) : (
                      <Link
                        href={`/paths/${slug}/modules/${mod.id}`}
                        className="shrink-0 rounded-lg border border-edge px-4 py-2 text-xs font-semibold text-ink-2 hover:border-ok-edge hover:text-ok transition"
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-widest text-ink-3">
                Labs in this path — {labsDone}/{path.labs.length} complete
              </h2>
              {isEnrolled && path.labs.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 bg-surface-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ok rounded-full transition-all"
                      style={{ width: `${Math.round((labsDone / path.labs.length) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-ink-3">{Math.round((labsDone / path.labs.length) * 100)}%</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              {path.labs.map((pl, idx) => {
                const lab = pl.lab;
                const diffColor = DIFF_COLORS[lab.difficulty as string] ?? "text-ink-2 border-edge";
                const isDone = labDoneFlags[idx] ?? false;
                return (
                  <div
                    key={pl.id}
                    className={`rounded-xl border p-4 flex items-center justify-between gap-4 transition ${
                      isDone ? "border-ok-edge bg-ok-wash" : "border-edge"
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className={`shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                          isDone ? "border-ok-edge bg-ok text-surface-0" : "border-edge-strong text-ink-3"
                        }`}
                      >
                        {isDone ? <Icon name="check" size={13} /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{lab.title}</p>
                        <span className={`border px-1.5 py-0.5 rounded-full font-medium text-xs ${diffColor}`}>{lab.difficulty}</span>
                      </div>
                    </div>
                    <Link
                      href={`/labs/${lab.slug}`}
                      className="shrink-0 rounded-lg border border-edge px-4 py-2 text-xs font-semibold text-ink-2 hover:border-ok-edge hover:text-ok transition"
                    >
                      {isDone ? "Review" : "Start"} →
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
