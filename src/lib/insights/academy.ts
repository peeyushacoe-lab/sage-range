import { db } from "@/lib/db";

export type UserCourseProgress = {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  courseCategory: string;
  courseDifficulty: string;
  enrolledAt: Date;
  completedAt: Date | null;
  totalLessons: number;
  completedLessons: number;
  lessonProgressPct: number;
  totalQuizzes: number;
  quizzesPassed: number;
  certificateIssued: boolean;
  certCode: string | null;
};

/**
 * Per-course academy progress for a single user — enrollment, lesson
 * completion, quiz pass count, and certificate status for each course
 * they're enrolled in.
 */
export async function getUserAcademyProgress(userId: string): Promise<UserCourseProgress[]> {
  const enrollments = await db.academyEnrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true, slug: true, title: true, category: true, difficulty: true,
          modules: { select: { id: true, quiz: { select: { id: true } } , lessons: { select: { id: true } } } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  if (enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.courseId);

  const [completedLessonRows, passedQuizRows, certificates] = await Promise.all([
    db.academyLessonProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { lesson: { select: { module: { select: { courseId: true } } } } },
    }),
    db.academyQuizAttempt.findMany({
      where: { userId, passed: true },
      select: { quizId: true, quiz: { select: { module: { select: { courseId: true } } } } },
    }),
    db.academyCertificate.findMany({
      where: { userId, courseId: { in: courseIds } },
      select: { courseId: true, certCode: true },
    }),
  ]);

  const completedLessonsByCourse = new Map<string, number>();
  for (const row of completedLessonRows) {
    const cid = row.lesson.module.courseId;
    completedLessonsByCourse.set(cid, (completedLessonsByCourse.get(cid) ?? 0) + 1);
  }

  const passedQuizIdsByCourse = new Map<string, Set<string>>();
  for (const row of passedQuizRows) {
    const cid = row.quiz.module.courseId;
    if (!passedQuizIdsByCourse.has(cid)) passedQuizIdsByCourse.set(cid, new Set());
    passedQuizIdsByCourse.get(cid)!.add(row.quizId);
  }

  const certByCourse = new Map(certificates.map((c) => [c.courseId, c.certCode]));

  return enrollments.map((e) => {
    const totalLessons = e.course.modules.reduce((s, m) => s + m.lessons.length, 0);
    const totalQuizzes = e.course.modules.filter((m) => m.quiz).length;
    const completedLessons = completedLessonsByCourse.get(e.courseId) ?? 0;
    const quizzesPassed = passedQuizIdsByCourse.get(e.courseId)?.size ?? 0;
    const certCode = certByCourse.get(e.courseId) ?? null;

    return {
      courseId: e.courseId,
      courseSlug: e.course.slug,
      courseTitle: e.course.title,
      courseCategory: e.course.category,
      courseDifficulty: e.course.difficulty,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      totalLessons,
      completedLessons,
      lessonProgressPct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      totalQuizzes,
      quizzesPassed,
      certificateIssued: certCode !== null,
      certCode,
    };
  });
}

export type AcademyEnrollmentRow = {
  userId: string;
  userName: string;
  userEmail: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  enrolledAt: Date;
  completedAt: Date | null;
  totalLessons: number;
  completedLessons: number;
  lessonProgressPct: number;
  totalQuizzes: number;
  quizzesPassed: number;
  certificateIssued: boolean;
};

/**
 * Every academy enrollment across every user and course, with computed
 * lesson/quiz progress — the source for the admin-wide enrollments table.
 */
export async function getAllAcademyEnrollments(): Promise<AcademyEnrollmentRow[]> {
  const enrollments = await db.academyEnrollment.findMany({
    include: {
      user: { select: { id: true, displayName: true, email: true } },
      course: {
        select: {
          id: true, slug: true, title: true,
          modules: { select: { id: true, quiz: { select: { id: true } }, lessons: { select: { id: true } } } },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  if (enrollments.length === 0) return [];

  const [completedLessonRows, passedQuizRows, certificates] = await Promise.all([
    db.academyLessonProgress.findMany({
      where: { completedAt: { not: null } },
      select: { userId: true, lesson: { select: { module: { select: { courseId: true } } } } },
    }),
    db.academyQuizAttempt.findMany({
      where: { passed: true },
      select: { userId: true, quizId: true, quiz: { select: { module: { select: { courseId: true } } } } },
    }),
    db.academyCertificate.findMany({ select: { userId: true, courseId: true } }),
  ]);

  const key = (userId: string, courseId: string) => `${userId}:${courseId}`;

  const completedLessonsMap = new Map<string, number>();
  for (const row of completedLessonRows) {
    const k = key(row.userId, row.lesson.module.courseId);
    completedLessonsMap.set(k, (completedLessonsMap.get(k) ?? 0) + 1);
  }

  const passedQuizMap = new Map<string, Set<string>>();
  for (const row of passedQuizRows) {
    const k = key(row.userId, row.quiz.module.courseId);
    if (!passedQuizMap.has(k)) passedQuizMap.set(k, new Set());
    passedQuizMap.get(k)!.add(row.quizId);
  }

  const certSet = new Set(certificates.map((c) => key(c.userId, c.courseId)));

  return enrollments.map((e) => {
    const totalLessons = e.course.modules.reduce((s, m) => s + m.lessons.length, 0);
    const totalQuizzes = e.course.modules.filter((m) => m.quiz).length;
    const k = key(e.userId, e.courseId);
    const completedLessons = completedLessonsMap.get(k) ?? 0;
    const quizzesPassed = passedQuizMap.get(k)?.size ?? 0;

    return {
      userId: e.userId,
      userName: e.user.displayName ?? e.user.email,
      userEmail: e.user.email,
      courseId: e.courseId,
      courseSlug: e.course.slug,
      courseTitle: e.course.title,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      totalLessons,
      completedLessons,
      lessonProgressPct: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
      totalQuizzes,
      quizzesPassed,
      certificateIssued: certSet.has(k),
    };
  });
}
