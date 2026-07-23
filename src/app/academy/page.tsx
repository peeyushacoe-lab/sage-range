import Link from "next/link";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export const dynamic = "force-dynamic";

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HARD:   "text-red-400 bg-red-500/10 border-red-500/20",
  INSANE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const CAT_COLOR: Record<string, string> = {
  FUNDAMENTALS:         "text-zinc-400",
  BLUE_TEAM:            "text-blue-400",
  RED_TEAM:             "text-red-400",
  FORENSICS:            "text-amber-400",
  SECURITY_ENGINEERING: "text-purple-400",
  NETWORKING:           "text-cyan-400",
  CLOUD:                "text-sky-400",
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-emerald-500 font-semibold mb-1.5">Sage Vault Academy</p>
            <h1 className="text-2xl font-bold text-white mb-1">Learn &amp; Level Up</h1>
            <p className="text-sm text-zinc-500">Structured cybersecurity courses with hands-on challenges. Learn first, then apply in labs.</p>
          </div>
          <Link href="/academy/cheatsheets" className="hidden sm:inline-flex text-xs text-zinc-400 border border-white/10 rounded-lg px-4 py-2 hover:text-white hover:border-white/20 transition">
            Cheat Sheets →
          </Link>
        </div>

        {/* User stats bar */}
        {user && userLevel && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="rounded-xl bg-zinc-900/50 border border-white/8 p-4">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Level</p>
              <p className="text-2xl font-black text-white">{userLevel.level}</p>
              <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${userLevel.progress}%` }} />
              </div>
              <p className="text-[10px] text-zinc-600 mt-1">{userLevel.progress}% to next</p>
            </div>
            <div className="rounded-xl bg-zinc-900/50 border border-white/8 p-4">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">XP Earned</p>
              <p className="text-2xl font-black text-amber-400 tabular-nums">{user.xp.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-600 mt-2">+25 XP per lesson</p>
            </div>
            <div className="rounded-xl bg-zinc-900/50 border border-white/8 p-4">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Lessons Done</p>
              <p className="text-2xl font-black text-emerald-400 tabular-nums">{totalCompleted}</p>
              <p className="text-[10px] text-zinc-600 mt-2">{enrollments.length} course{enrollments.length !== 1 ? "s" : ""} enrolled</p>
            </div>
            <div className="rounded-xl bg-zinc-900/50 border border-white/8 p-4">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Certs</p>
              <p className="text-2xl font-black text-purple-400 tabular-nums">{enrollments.filter(e => e.completedAt).length}</p>
              <p className="text-[10px] text-zinc-600 mt-2">{enrollments.filter(e => !e.completedAt && enrolledIds.has(e.courseId)).length} in progress</p>
            </div>
          </div>
        )}

        {/* Continue learning banner */}
        {continueLessonHref && (
          <div className="mb-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 to-zinc-900/40 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold mb-1">Continue Learning</p>
              <p className="text-sm font-semibold text-white mb-0.5">{continueLessonTitle}</p>
              <p className="text-xs text-zinc-500">{continueCourseTitle}</p>
            </div>
            <Link
              href={continueLessonHref}
              className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Resume →
            </Link>
          </div>
        )}

        {/* Course grid */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 mb-4 uppercase tracking-wider">All Courses</h2>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-24 text-zinc-600">
            <p className="text-5xl mb-4">🛡</p>
            <p className="text-lg font-semibold mb-2">Courses coming soon</p>
            <p className="text-sm">The first courses are being prepared. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
            {courses.map(course => {
              const enrolled  = enrolledIds.has(course.id);
              const completed = completedIds.has(course.id);
              const lessons   = totalLessons(course);
              const allCourseLessons = course.modules.flatMap(m => m.lessons.map(l => l.id));
              const doneCount = allCourseLessons.filter(id => completedLessonSet.has(id)).length;
              const pct = allCourseLessons.length > 0 ? Math.round((doneCount / allCourseLessons.length) * 100) : 0;

              return (
                <Link
                  key={course.id}
                  href={`/academy/${course.slug}`}
                  className="group block rounded-2xl border border-white/8 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-white/15 transition-all p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${CAT_COLOR[course.category] ?? "text-zinc-400"}`}>
                      {CAT_LABEL[course.category] ?? course.category}
                    </span>
                    {completed ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">✓ Complete</span>
                    ) : enrolled && doneCount > 0 ? (
                      <span className="text-[10px] text-zinc-500 border border-white/8 px-2 py-0.5 rounded">{pct}% done</span>
                    ) : enrolled ? (
                      <span className="text-[10px] text-zinc-500 border border-white/8 px-2 py-0.5 rounded">Enrolled</span>
                    ) : null}
                  </div>

                  <h2 className="text-base font-semibold text-zinc-200 group-hover:text-white transition mb-1 leading-snug">{course.title}</h2>
                  {course.subtitle && <p className="text-xs text-zinc-500 mb-2">{course.subtitle}</p>}
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-4">{course.description}</p>

                  {/* Progress bar for enrolled */}
                  {enrolled && !completed && (
                    <div className="mb-4">
                      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1">{doneCount} / {allCourseLessons.length} lessons</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-auto">
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[course.difficulty]}`}>
                      {course.difficulty}
                    </span>
                    <span className="text-[10px] text-zinc-600">{course._count.modules} modules</span>
                    <span className="text-[10px] text-zinc-600">{lessons} lessons</span>
                    {course.estimatedHrs > 0 && <span className="text-[10px] text-zinc-600">{course.estimatedHrs}h</span>}
                    <span className="ml-auto text-[10px] text-zinc-600">{lessons * 25} XP total</span>
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
