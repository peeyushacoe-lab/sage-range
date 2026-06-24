import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { ModuleTabs } from "./_components/module-tabs";
import { QuizSection } from "./_components/quiz-section";
import { AssessmentSection } from "./_components/assessment-section";

export const dynamic = "force-dynamic";

const RESOURCE_ICONS: Record<string, string> = {
  PDF: "📄",
  ARTICLE: "📰",
  DOCUMENTATION: "📚",
  GITHUB: "🔗",
  EXTERNAL_LINK: "🌐",
  TOOL_DOWNLOAD: "🛠",
};

const RESOURCE_LABELS: Record<string, string> = {
  PDF: "PDF",
  ARTICLE: "Article",
  DOCUMENTATION: "Documentation",
  GITHUB: "GitHub",
  EXTERNAL_LINK: "Link",
  TOOL_DOWNLOAD: "Download",
};

export default async function ModuleDetail({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;

  const path = await db.learningPath.findUnique({
    where: { slug },
    select: { id: true, title: true, published: true },
  });
  if (!path || !path.published) notFound();

  const mod = await db.module.findFirst({
    where: { id: moduleId, pathId: path.id, published: true },
    include: {
      resources: { orderBy: { order: "asc" } },
      quiz: {
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      },
      assessment: true,
    },
  });
  if (!mod) notFound();

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  // Lock check: any earlier required module that user hasn't completed?
  const priorRequired = await db.module.findMany({
    where: { pathId: path.id, published: true, isRequired: true, order: { lt: mod.order } },
    select: { id: true },
  });
  if (priorRequired.length > 0) {
    const doneCount = await db.userModuleProgress.count({
      where: {
        userId: user.id,
        moduleId: { in: priorRequired.map((m) => m.id) },
        completedAt: { not: null },
      },
    });
    if (doneCount < priorRequired.length) redirect(`/paths/${slug}`);
  }

  // Fetch user's quiz attempt (best/latest)
  const priorAttempt = mod.quiz
    ? await db.quizAttempt.findFirst({
        where: { quizId: mod.quiz.id, userId: user.id },
        orderBy: { completedAt: "desc" },
        select: { score: true, passed: true, completedAt: true },
      })
    : null;

  // Fetch user's assessment submission
  const existingSubmission = mod.assessment
    ? await db.assessmentSubmission.findUnique({
        where: { assessmentId_userId: { assessmentId: mod.assessment.id, userId: user.id } },
        include: { review: { select: { status: true, grade: true, comment: true } } },
      })
    : null;

  // Fetch sibling modules for navigation
  const siblings = await db.module.findMany({
    where: { pathId: path.id, published: true },
    orderBy: { order: "asc" },
    select: { id: true, title: true, order: true },
  });
  const currentIdx = siblings.findIndex((s) => s.id === moduleId);
  const prev = siblings[currentIdx - 1] ?? null;
  const next = siblings[currentIdx + 1] ?? null;

  // Serialise for client components (remove non-serialisable types)
  const quizForClient = mod.quiz
    ? {
        id: mod.quiz.id,
        title: mod.quiz.title,
        description: mod.quiz.description,
        passMark: mod.quiz.passMark,
        questions: mod.quiz.questions.map((q) => ({
          id: q.id,
          type: q.type as string,
          question: q.question,
          options: q.options as string[] | null,
          explanation: q.explanation,
          order: q.order,
        })),
      }
    : null;

  const priorAttemptForClient = priorAttempt
    ? { ...priorAttempt, completedAt: priorAttempt.completedAt.toISOString() }
    : null;

  const submissionForClient = existingSubmission
    ? {
        id: existingSubmission.id,
        type: existingSubmission.type as string,
        content: existingSubmission.content,
        submittedAt: existingSubmission.submittedAt.toISOString(),
        review: existingSubmission.review
          ? {
              status: existingSubmission.review.status as string,
              grade: existingSubmission.review.grade,
              comment: existingSubmission.review.comment,
            }
          : null,
      }
    : null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref={`/paths/${slug}`} backLabel={path.title} />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Module {mod.order + 1}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{mod.title}</h1>
        </header>

        <ModuleTabs
          hasQuiz={!!mod.quiz}
          hasAssessment={!!mod.assessment}
        >
          {(tab) => (
            <>
              {tab === "overview" && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {mod.overview}
                  </div>
                </div>
              )}

              {tab === "reading" && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {mod.readingMaterial}
                  </div>
                </div>
              )}

              {tab === "resources" && (
                <div>
                  {mod.resources.length === 0 ? (
                    <p className="text-sm text-zinc-500">No resources added yet.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {mod.resources.map((r) => (
                        <a
                          key={r.id}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 rounded-xl border border-white/8 p-4 hover:border-sage-500/40 hover:bg-sage-500/5 transition group"
                        >
                          <span className="text-2xl shrink-0">{RESOURCE_ICONS[r.type] ?? "🔗"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm group-hover:text-sage-400 transition truncate">{r.title}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{RESOURCE_LABELS[r.type] ?? r.type}</p>
                          </div>
                          <svg className="w-4 h-4 shrink-0 text-zinc-600 group-hover:text-sage-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "quiz" && quizForClient && (
                <QuizSection
                  moduleId={moduleId}
                  quiz={quizForClient as Parameters<typeof QuizSection>[0]["quiz"]}
                  priorAttempt={priorAttemptForClient as Parameters<typeof QuizSection>[0]["priorAttempt"]}
                />
              )}

              {tab === "assessment" && mod.assessment && (
                <AssessmentSection
                  moduleId={moduleId}
                  assessmentId={mod.assessment.id}
                  instructions={mod.assessment.instructions}
                  existingSubmission={submissionForClient as Parameters<typeof AssessmentSection>[0]["existingSubmission"]}
                />
              )}
            </>
          )}
        </ModuleTabs>

        {/* Prev / Next navigation */}
        <div className="mt-12 pt-6 border-t border-white/8 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              href={`/paths/${slug}/modules/${prev.id}`}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
            >
              <span>←</span>
              <span className="truncate max-w-[200px]">{prev.title}</span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/paths/${slug}/modules/${next.id}`}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
            >
              <span className="truncate max-w-[200px]">{next.title}</span>
              <span>→</span>
            </Link>
          ) : (
            <Link
              href={`/paths/${slug}`}
              className="text-sm text-sage-400 hover:text-sage-300 transition"
            >
              Back to path →
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
