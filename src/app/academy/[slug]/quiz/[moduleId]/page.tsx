import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { QuizClient } from "./_components/quiz-client";

export const dynamic = "force-dynamic";

export default async function ModuleQuizPage({
  params,
}: {
  params: Promise<{ slug: string; moduleId: string }>;
}) {
  const { slug, moduleId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect(`/sign-in?next=/academy/${slug}`);

  const course = await db.academyCourse.findUnique({
    where: { slug, published: true },
    select: { id: true, title: true },
  });
  if (!course) notFound();

  const enrollment = await db.academyEnrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  });
  if (!enrollment) redirect(`/academy/${slug}`);

  const quiz = await db.academyQuiz.findFirst({
    where: { moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) notFound();

  const lastAttempt = await db.academyQuizAttempt.findFirst({
    where: { quizId: quiz.id, userId: user.id },
    orderBy: { completedAt: "desc" },
  });

  return (
    <QuizClient
      courseSlug={slug}
      courseTitle={course.title}
      quiz={{
        id:          quiz.id,
        title:       quiz.title,
        description: quiz.description ?? "",
        passMark:    quiz.passMark,
        questions:   quiz.questions.map(q => ({
          id:            q.id,
          type:          q.type,
          question:      q.question,
          options:       q.options as { id: string; text: string }[] | null,
          explanation:   q.explanation ?? "",
        })),
      }}
      lastAttempt={lastAttempt ? { score: lastAttempt.score, passed: lastAttempt.passed } : null}
    />
  );
}
