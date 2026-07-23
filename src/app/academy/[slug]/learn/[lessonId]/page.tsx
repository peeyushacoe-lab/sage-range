import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { LessonViewer } from "./_components/lesson-viewer";

export const dynamic = "force-dynamic";

export default async function LearnLessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect(`/sign-in?next=/academy/${slug}`);

  const course = await db.academyCourse.findUnique({
    where: { slug, published: true },
    include: {
      modules: {
        where: { published: true },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { published: true },
            orderBy: { order: "asc" },
            select: { id: true, title: true, durationMin: true },
          },
          quiz: { select: { id: true } },
        },
      },
    },
  });
  if (!course) notFound();

  const enrollment = await db.academyEnrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enrollment) redirect(`/academy/${slug}`);

  const lesson = await db.academyLesson.findUnique({
    where: { id: lessonId, published: true },
    include: {
      blocks:     { orderBy: { order: "asc" } },
      flashcards: { orderBy: { order: "asc" } },
      module:     { select: { id: true, courseId: true } },
    },
  });
  if (!lesson || lesson.module.courseId !== course.id) notFound();

  const completedIds = new Set(
    (await db.academyLessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: course.modules.flatMap(m => m.lessons.map(l => l.id)) },
        completedAt: { not: null },
      },
      select: { lessonId: true },
    })).map(p => p.lessonId)
  );

  const note = await db.academyUserNote.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    select: { content: true },
  });

  const allLessons = course.modules.flatMap(m =>
    m.lessons.map(l => ({ ...l, moduleId: m.id, moduleQuizId: m.quiz?.id ?? null }))
  );
  const currentIdx = allLessons.findIndex(l => l.id === lessonId);
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const nextLessonRow = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  // If this is the last lesson of its module and the module has a quiz, the
  // next step is that quiz — otherwise fall through to the next lesson.
  const currentModule = course.modules.find(m => m.id === lesson.module.id);
  const isLastInModule = currentModule
    ? currentModule.lessons[currentModule.lessons.length - 1]?.id === lessonId
    : false;

  let next: { href: string; label: string } | null;
  if (isLastInModule && currentModule?.quiz?.id) {
    next = { href: `/academy/${slug}/quiz/${currentModule.id}`, label: `${currentModule.title} Quiz` };
  } else if (nextLessonRow) {
    next = { href: `/academy/${slug}/learn/${nextLessonRow.id}`, label: nextLessonRow.title };
  } else {
    next = null;
  }

  return (
    <LessonViewer
      courseSlug={slug}
      courseTitle={course.title}
      lesson={{
        id:          lesson.id,
        title:       lesson.title,
        durationMin: lesson.durationMin,
        blocks:      lesson.blocks.map(b => ({
          id:      b.id,
          type:    b.type as "TEXT" | "CODE" | "IMAGE" | "CALLOUT" | "KNOWLEDGE_CHECK",
          order:   b.order,
          content: b.content as Record<string, unknown>,
        })),
        flashcards: lesson.flashcards.map(c => ({
          id:    c.id,
          front: c.front,
          back:  c.back,
        })),
      }}
      modules={course.modules.map(m => ({
        id:    m.id,
        title: m.title,
        quizId: m.quiz?.id ?? null,
        lessons: m.lessons.map(l => ({
          id:          l.id,
          title:       l.title,
          durationMin: l.durationMin,
          completed:   completedIds.has(l.id),
        })),
      }))}
      prevLesson={prev ? { id: prev.id, title: prev.title } : null}
      next={next}
      alreadyCompleted={completedIds.has(lessonId)}
      initialNote={note?.content ?? ""}
      userXp={user.xp}
    />
  );
}
