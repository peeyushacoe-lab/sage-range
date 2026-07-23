import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ModuleLessonsClient } from "./_components/module-lessons-client";

export const dynamic = "force-dynamic";

export default async function ModuleLessonsPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string }>;
}) {
  const { courseId, moduleId } = await params;

  const [module, course] = await Promise.all([
    db.academyModule.findUnique({
      where: { id: moduleId },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: { _count: { select: { blocks: true, flashcards: true } } },
        },
        quiz: {
          include: { questions: { orderBy: { order: "asc" } } },
        },
      },
    }),
    db.academyCourse.findUnique({ where: { id: courseId }, select: { id: true, title: true } }),
  ]);

  if (!module || !course) notFound();

  return (
    <ModuleLessonsClient
      courseId={courseId}
      courseTitle={course.title}
      module={{
        id:          module.id,
        title:       module.title,
        description: module.description ?? "",
        order:       module.order,
        published:   module.published,
      }}
      lessons={module.lessons.map(l => ({
        id:          l.id,
        title:       l.title,
        summary:     l.summary ?? "",
        order:       l.order,
        published:   l.published,
        durationMin: l.durationMin,
        blockCount:  l._count.blocks,
        cardCount:   l._count.flashcards,
      }))}
      quiz={module.quiz ? {
        id:          module.quiz.id,
        title:       module.quiz.title,
        description: module.quiz.description ?? "",
        passMark:    module.quiz.passMark,
        questions:   module.quiz.questions.map(q => ({
          id:            q.id,
          type:          q.type,
          question:      q.question,
          options:       q.options,
          correctAnswer: q.correctAnswer,
          explanation:   q.explanation ?? "",
          order:         q.order,
        })),
      } : null}
    />
  );
}
