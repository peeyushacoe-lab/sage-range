import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LessonEditorClient } from "./_components/lesson-editor-client";

export const dynamic = "force-dynamic";

export default async function LessonEditorPage({
  params,
}: {
  params: Promise<{ courseId: string; moduleId: string; lessonId: string }>;
}) {
  const { courseId, moduleId, lessonId } = await params;

  const lesson = await db.academyLesson.findUnique({
    where: { id: lessonId },
    include: {
      blocks:     { orderBy: { order: "asc" } },
      flashcards: { orderBy: { order: "asc" } },
      module:     { select: { id: true, title: true, courseId: true } },
    },
  });
  if (!lesson || lesson.module.courseId !== courseId || lesson.moduleId !== moduleId) notFound();

  return (
    <LessonEditorClient
      courseId={courseId}
      moduleId={moduleId}
      lesson={{
        id:          lesson.id,
        title:       lesson.title,
        summary:     lesson.summary ?? "",
        order:       lesson.order,
        published:   lesson.published,
        durationMin: lesson.durationMin,
      }}
      moduleTitle={lesson.module.title}
      blocks={lesson.blocks.map(b => ({
        id:      b.id,
        type:    b.type as "TEXT" | "CODE" | "IMAGE" | "CALLOUT",
        order:   b.order,
        content: b.content as Record<string, unknown>,
      }))}
      flashcards={lesson.flashcards.map(c => ({
        id:    c.id,
        front: c.front,
        back:  c.back,
        order: c.order,
      }))}
    />
  );
}
