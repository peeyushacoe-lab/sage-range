import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ResourceForm } from "./_components/resource-form";
import { QuizBuilder } from "./_components/quiz-builder";
import { AssessmentForm } from "./_components/assessment-form";
import { RubricBuilder } from "./_components/rubric-builder";
import { ModulePublishToggle } from "./_components/module-publish-toggle";
import { RequiredToggle } from "./_components/required-toggle";

export const dynamic = "force-dynamic";

const RESOURCE_LABELS: Record<string, string> = {
  PDF: "📄 PDF",
  ARTICLE: "📰 Article",
  DOCUMENTATION: "📚 Documentation",
  GITHUB: "🔗 GitHub",
  EXTERNAL_LINK: "🌐 Link",
  TOOL_DOWNLOAD: "🛠 Download",
};

export default async function AdminModuleDetail({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;

  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: {
      path: { select: { id: true, title: true, slug: true } },
      resources: { orderBy: { order: "asc" } },
      quiz: { include: { questions: { orderBy: { order: "asc" } } } },
      assessment: {
        include: {
          rubric: { include: { criteria: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!mod) notFound();

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-4">
          <Link href="/admin/modules" className="hover:text-zinc-300 transition">Modules</Link>
          <span>→</span>
          <span>{mod.path.title}</span>
          <span>→</span>
          <span className="text-zinc-300">{mod.title}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white">{mod.title}</h1>
          <div className="flex gap-2">
            <ModulePublishToggle moduleId={moduleId} published={mod.published} />
            <RequiredToggle moduleId={moduleId} isRequired={mod.isRequired} />
          </div>
        </div>
      </div>

      {/* Resources */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Resources</h2>
        {mod.resources.length > 0 && (
          <div className="rounded-xl border border-white/8 overflow-hidden mb-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-white/4">
                {mod.resources.map((r) => (
                  <tr key={r.id} className="hover:bg-white/2 transition">
                    <td className="px-4 py-3 text-xs text-zinc-500 w-28">{RESOURCE_LABELS[r.type] ?? r.type}</td>
                    <td className="px-4 py-3 text-zinc-200">{r.title}</td>
                    <td className="px-4 py-3 text-right">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-zinc-500 hover:text-emerald-400 transition">
                        Open ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ResourceForm moduleId={moduleId} nextOrder={mod.resources.length} />
      </section>

      {/* Quiz */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Quiz</h2>
        <QuizBuilder
          moduleId={moduleId}
          existingQuiz={mod.quiz ? {
            id: mod.quiz.id,
            title: mod.quiz.title,
            description: mod.quiz.description,
            passMark: mod.quiz.passMark,
            questions: mod.quiz.questions.map((q) => ({
              id: q.id,
              type: q.type as string,
              question: q.question,
              options: q.options as string[] | null,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              order: q.order,
            })),
          } : null}
        />
      </section>

      {/* Assessment */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Assessment</h2>
        <AssessmentForm
          moduleId={moduleId}
          existing={mod.assessment ? {
            id: mod.assessment.id,
            title: mod.assessment.title,
            instructions: mod.assessment.instructions,
          } : null}
        />
      </section>

      {/* Rubric — only shown once an assessment exists */}
      {mod.assessment && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Assessment Rubric</h2>
          <p className="text-xs text-zinc-600 mb-4">Define scoring criteria for mentors to use when reviewing submissions.</p>
          <RubricBuilder
            assessmentId={mod.assessment.id}
            rubricId={mod.assessment.rubric?.id ?? null}
            criteria={mod.assessment.rubric?.criteria ?? []}
          />
        </section>
      )}
    </div>
  );
}
