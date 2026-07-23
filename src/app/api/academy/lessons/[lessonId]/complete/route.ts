import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function POST(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { lessonId } = await params;
  const lesson = await db.academyLesson.findUnique({ where: { id: lessonId } });
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await db.academyLessonProgress.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });

  await db.academyLessonProgress.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });

  if (!existing?.completedAt) {
    await db.user.update({ where: { id: user.id }, data: { xp: { increment: 25 } } });
  }

  // Check if whole course is now complete
  const module = await db.academyModule.findUnique({
    where: { id: lesson.moduleId },
    include: {
      course: { include: { modules: { include: { lessons: true } } } },
    },
  });
  if (module) {
    const allLessonIds = module.course.modules.flatMap(m => m.lessons.map(l => l.id));
    const completedCount = await db.academyLessonProgress.count({
      where: { userId: user.id, lessonId: { in: allLessonIds }, completedAt: { not: null } },
    });
    if (completedCount >= allLessonIds.length) {
      const certCode = `SV-${Date.now().toString(36).toUpperCase()}-${user.id.slice(-4).toUpperCase()}`;
      await db.academyCertificate.upsert({
        where: { userId_courseId: { userId: user.id, courseId: module.course.id } },
        create: { userId: user.id, courseId: module.course.id, certCode },
        update: {},
      });
      await db.academyEnrollment.updateMany({
        where: { userId: user.id, courseId: module.course.id, completedAt: null },
        data: { completedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
