import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { EditCourseClient } from "./_components/edit-course-client";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  const course = await db.academyCourse.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessons: true } },
          quiz: { select: { id: true } },
        },
      },
    },
  });
  if (!course) notFound();

  return (
    <EditCourseClient
      course={{
        id:           course.id,
        slug:         course.slug,
        title:        course.title,
        subtitle:     course.subtitle ?? "",
        description:  course.description,
        category:     course.category,
        difficulty:   course.difficulty,
        estimatedHrs: course.estimatedHrs,
        thumbnail:    course.thumbnail ?? "",
        published:    course.published,
        order:        course.order,
        objectives:   course.objectives,
        prerequisites: course.prerequisites,
      }}
      modules={course.modules.map(m => ({
        id:          m.id,
        title:       m.title,
        description: m.description ?? "",
        order:       m.order,
        published:   m.published,
        lessonCount: m._count.lessons,
        hasQuiz:     !!m.quiz,
      }))}
    />
  );
}
