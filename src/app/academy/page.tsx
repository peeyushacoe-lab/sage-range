import Link from "next/link";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { formatDuration } from "@/lib/utils";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-ok bg-ok-wash border-ok-edge",
  MEDIUM: "text-warn bg-warn-wash border-warn-edge",
  HARD:   "text-danger bg-danger-wash border-danger-edge",
  INSANE: "text-accent bg-accent-wash border-accent-edge",
};

const CAT_COLOR: Record<string, string> = {
  FUNDAMENTALS:         "text-ink-2",
  BLUE_TEAM:            "text-info",
  RED_TEAM:             "text-danger",
  FORENSICS:            "text-warn",
  SECURITY_ENGINEERING: "text-accent",
  NETWORKING:           "text-cyan-400",
  CLOUD:                "text-info",
};

const CAT_LABEL: Record<string, string> = {
  FUNDAMENTALS:         "Fundamentals",
  BLUE_TEAM:            "Blue Team",
  RED_TEAM:             "Red Team",
  FORENSICS:            "Forensics",
  SECURITY_ENGINEERING: "Security Eng",
  NETWORKING:           "Networking",
  CLOUD:                "Cloud",
};

function xpToLevel(xp: number) {
  const level = Math.floor(xp / 500) + 1;
  const levelXp = (level - 1) * 500;
  const nextXp = level * 500;
  return { level, progress: Math.round(((xp - levelXp) / (nextXp - levelXp)) * 100) };
}

export default async function AcademyPage() {
  const user = await getOrCreateAppUser();

  const [courses, enrollments] = await Promise.all([
    db.academyCourse.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        _count: { select: { modules: true, enrollments: true } },
        modules: {
          where: { published: true },
          orderBy: { order: "asc" },
          select: {
            id: true,
            _count: { select: { lessons: true } },
            lessons: {
              where: { published: true },
              orderBy: { order: "asc" },
              select: { id: true, title: true, durationMin: true },
            },
          },
        },
      },
    }),
    user ? db.academyEnrollment.findMany({
      where: { userId: user.id },
      select: { courseId: true, completedAt: true },
    }) : [],
  ]);

  const enrolledIds = new Set(enrollments.map(e => e.courseId));
  const completedIds = new Set(enrollments.filter(e => e.completedAt).map(e => e.courseId));

  const totalLessons = (c: typeof courses[0]) => c.modules.reduce((s, m) => s + m._count.lessons, 0);
  const allLessonIds = courses.flatMap(c => c.modules.flatMap(m => m.lessons.map(l => l.id)));

  // Get progress for enrolled courses
  const lessonProgress = user ? await db.academyLessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: allLessonIds }, completedAt: { not: null } },
    select: { lessonId: true },
  }) : [];
  const completedLessonSet = new Set(lessonProgress.map(p => p.lessonId));

  // Find "continue learning" — first incomplete lesson in first enrolled course
  let continueLessonHref: string | null = null;
  let continueLessonTitle: string | null = null;
  let continueCourseSlug: string | null = null;
  let continueCourseTitle: string | null = null;

  for (const course of courses) {
    if (!enrolledIds.has(course.id) || completedIds.has(course.id)) continue;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!completedLessonSet.has(lesson.id)) {
          continueLessonHref = `/academy/${course.slug}/learn/${lesson.id}`;
          continueLessonTitle = lesson.title;
          continueCourseSlug = course.slug;
          continueCourseTitle = course.title;
          break;
        }
      }
      if (continueLessonHref) break;
    }
    if (continueLessonHref) break;
  }

  const userLevel = user ? xpToLevel(user.xp) : null;
  const totalCompleted = completedLessonSet.size;

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-ink-3 font-semibold mb-1.5">Sage Vault Academy</p>
            <h1 className="text-2xl font-bold text-white mb-1">Learn &amp; Level Up</h1>
            <p className="text-sm text-ink-3">Structured cybersecurity courses with hands-on challenges. Learn first, then apply in labs.</p>
          </div>
          <Link href="/academy/cheatsheets" className="hidden sm:inline-flex text-xs text-ink-2 border border-edge rounded-lg px-4 py-2 hover:text-white hover:border-edge-strong transition">
            Cheat Sheets →
          </Link>
        </div>

        {/* User stats bar */}
        {user && userLevel && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="rounded-xl bg-surface-1 border border-edge p-4">
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Level</p>
              <p className="text-2xl font-black text-white">{userLevel.level}</p>
              <div className="mt-2 h-1 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-warn rounded-full" style={{ width: `${userLevel.progress}%` }} />
              </div>
              <p className="text-[10px] text-ink-3 mt-1">{userLevel.progress}% to next</p>
            </div>
            <div className="rounded-xl bg-surface-1 border border-edge p-4">
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">XP Earned</p>
              <p className="text-2xl font-black text-warn tabular-nums">{user.xp.toLocaleString()}</p>
              <p className="text-[10px] text-ink-3 mt-2">+25 XP per lesson</p>
            </div>
            <div className="rounded-xl bg-surface-1 border border-edge p-4">
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Lessons Done</p>
              <p className="text-2xl font-black text-ok tabular-nums">{totalCompleted}</p>
              <p className="text-[10px] text-ink-3 mt-2">{enrollments.length} course{enrollments.length !== 1 ? "s" : ""} enrolled</p>
            </div>
            <div className="rounded-xl bg-surface-1 border border-edge p-4">
              <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1">Certs</p>
              <p className="text-2xl font-black text-accent tabular-nums">{enrollments.filter(e => e.completedAt).length}</p>
              <p className="text-[10px] text-ink-3 mt-2">{enrollments.filter(e => !e.completedAt && enrolledIds.has(e.courseId)).length} in progress</p>
            </div>
          </div>
        )}

        {/* Continue learning banner */}
        {continueLessonHref && (
          <div className="mb-8 rounded-2xl border border-ok-edge bg-gradient-to-r from-ok to-surface-1/40 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1">Continue Learning</p>
              <p className="text-sm font-semibold text-white mb-0.5">{continueLessonTitle}</p>
              <p className="text-xs text-ink-3">{continueCourseTitle}</p>
            </div>
            <Link
              href={continueLessonHref}
              className="shrink-0 bg-ok hover:bg-ok-wash text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Resume →
            </Link>
          </div>
        )}

        {/* Course grid */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-ink-2 mb-4 uppercase tracking-wider">All Courses</h2>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-24 text-ink-3">
            <p className="mb-4 flex justify-center"><Icon name="blueTeam" size={48} /></p>
            <p className="text-lg font-semibold mb-2">Courses coming soon</p>
            <p className="text-sm">The first courses are being prepared. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {courses.map(course => {
              const enrolled  = enrolledIds.has(course.id);
              const completed = completedIds.has(course.id);
              const lessons   = totalLessons(course);
              const totalMinutes = course.modules.reduce(
                (s, m) => s + m.lessons.reduce((ls, l) => ls + l.durationMin, 0), 0
              );
              const allCourseLessons = course.modules.flatMap(m => m.lessons.map(l => l.id));
              const doneCount = allCourseLessons.filter(id => completedLessonSet.has(id)).length;
              const pct = allCourseLessons.length > 0 ? Math.round((doneCount / allCourseLessons.length) * 100) : 0;

              return (
                <Link
                  key={course.id}
                  href={`/academy/${course.slug}`}
                  className="group block rounded-2xl border border-edge bg-surface-1 hover:bg-surface-1 hover:border-edge-strong transition-all p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${CAT_COLOR[course.category] ?? "text-ink-2"}`}>
                      {CAT_LABEL[course.category] ?? course.category}
                    </span>
                    {completed ? (
                      <span className="text-[10px] font-bold text-ok bg-ok-wash px-2 py-0.5 rounded border border-ok-edge"><Icon name="check" size={14} className="inline-block shrink-0" /> Complete</span>
                    ) : enrolled && doneCount > 0 ? (
                      <span className="text-[10px] text-ink-3 border border-edge px-2 py-0.5 rounded">{pct}% done</span>
                    ) : enrolled ? (
                      <span className="text-[10px] text-ink-3 border border-edge px-2 py-0.5 rounded">Enrolled</span>
                    ) : null}
                  </div>

                  <h2 className="text-base font-semibold text-ink group-hover:text-white transition mb-1 leading-snug">{course.title}</h2>
                  {course.subtitle && <p className="text-xs text-ink-3 mb-2">{course.subtitle}</p>}
                  <p className="text-xs text-ink-3 leading-relaxed line-clamp-2 mb-4">{course.description}</p>

                  {/* Progress bar for enrolled */}
                  {enrolled && !completed && (
                    <div className="mb-4">
                      <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-ink-3 mt-1">{doneCount} / {allCourseLessons.length} lessons</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-auto">
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[course.difficulty]}`}>
                      {course.difficulty}
                    </span>
                    <span className="text-[10px] text-ink-3">{course._count.modules} modules</span>
                    <span className="text-[10px] text-ink-3">{lessons} lessons</span>
                    {totalMinutes > 0 && <span className="text-[10px] text-ink-3">{formatDuration(totalMinutes)}</span>}
                    <span className="ml-auto text-[10px] text-ink-3">{lessons * 25} XP total</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
