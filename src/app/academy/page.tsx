import Link from "next/link";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { formatDuration } from "@/lib/utils";
import { getDeckSummary } from "@/lib/academy-review";
import { Card, Badge, ProgressBar, buttonVariants } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

const DIFF_TONE: Record<string, "emerald" | "amber" | "red" | "purple"> = {
  EASY: "emerald",
  MEDIUM: "amber",
  HARD: "red",
  INSANE: "purple",
};

const CATEGORY: Record<string, { label: string; icon: IconName; tint: string }> = {
  FUNDAMENTALS:         { label: "Fundamentals", icon: "learning",   tint: "text-zinc-300 bg-zinc-700/30" },
  BLUE_TEAM:            { label: "Blue Team",     icon: "blueTeam",   tint: "text-blue-300 bg-blue-500/10" },
  RED_TEAM:             { label: "Red Team",      icon: "redTeam",    tint: "text-red-300 bg-red-500/10" },
  FORENSICS:            { label: "Forensics",     icon: "forensics",  tint: "text-amber-300 bg-amber-500/10" },
  SECURITY_ENGINEERING: { label: "Security Eng",  icon: "tools",      tint: "text-purple-300 bg-purple-500/10" },
  NETWORKING:           { label: "Networking",    icon: "networkMap", tint: "text-cyan-300 bg-cyan-500/10" },
  CLOUD:                { label: "Cloud",         icon: "cloud",      tint: "text-sky-300 bg-sky-500/10" },
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

  const lessonProgress = user ? await db.academyLessonProgress.findMany({
    where: { userId: user.id, lessonId: { in: allLessonIds }, completedAt: { not: null } },
    select: { lessonId: true },
  }) : [];
  const completedLessonSet = new Set(lessonProgress.map(p => p.lessonId));

  // Find "continue learning" — first incomplete lesson in first enrolled course
  let continueLessonHref: string | null = null;
  let continueLessonTitle: string | null = null;
  let continueCourseTitle: string | null = null;

  for (const course of courses) {
    if (!enrolledIds.has(course.id) || completedIds.has(course.id)) continue;
    for (const mod of course.modules) {
      for (const lesson of mod.lessons) {
        if (!completedLessonSet.has(lesson.id)) {
          continueLessonHref = `/academy/${course.slug}/learn/${lesson.id}`;
          continueLessonTitle = lesson.title;
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
  const certCount = enrollments.filter(e => e.completedAt).length;
  const inProgress = enrollments.filter(e => !e.completedAt && enrolledIds.has(e.courseId)).length;

  const deck = user
    ? await getDeckSummary(user.id)
    : { total: 0, due: 0, new: 0, learning: 0, young: 0, mature: 0, leeches: 0 };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Hero */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 sm:flex">
              <Icon name="graduation" size={24} className="text-emerald-400" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-500">Sage Vault Academy</p>
              <h1 className="text-2xl font-bold">Learn &amp; Level Up</h1>
              <p className="mt-1 max-w-lg text-sm text-zinc-500">
                Structured cybersecurity courses with hands-on challenges. Learn first, then apply in labs.
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {user && deck.total > 0 && (
              <Link
                href="/academy/review"
                className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition ${
                  deck.due > 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <Icon name="progress" size={13} />
                Review
                {deck.due > 0 && (
                  <span className="rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold tabular-nums text-black">
                    {deck.due}
                  </span>
                )}
              </Link>
            )}
            <Link href="/academy/cheatsheets" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Cheat Sheets
            </Link>
          </div>
        </div>

        {/* Learner stat bar */}
        {user && userLevel && (
          <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card className="p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <Icon name="star" size={12} className="text-amber-400" />
                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Level</p>
              </div>
              <p className="text-2xl font-black leading-none tabular-nums">{userLevel.level}</p>
              <ProgressBar value={userLevel.progress} tone="amber" className="mt-2.5 h-1" />
              <p className="mt-1 text-[10px] text-zinc-600">{userLevel.progress}% to level {userLevel.level + 1}</p>
            </Card>
            <StatTile icon="xp" tint="text-amber-400" label="XP Earned" value={user.xp.toLocaleString()} sub="+25 XP per lesson" />
            <StatTile icon="checkCircle" tint="text-emerald-400" label="Lessons Done" value={totalCompleted} sub={`${enrollments.length} course${enrollments.length !== 1 ? "s" : ""} enrolled`} />
            <StatTile icon="certificates" tint="text-purple-400" label="Certificates" value={certCount} sub={`${inProgress} in progress`} />
          </div>
        )}

        {/* Continue learning */}
        {continueLessonHref && (
          <Card className="mb-4 border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 to-zinc-900/40 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 sm:flex">
                  <Icon name="learning" size={18} />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">Continue learning</p>
                  <p className="text-sm font-semibold">{continueLessonTitle}</p>
                  <p className="text-xs text-zinc-500">{continueCourseTitle}</p>
                </div>
              </div>
              <Link href={continueLessonHref} className={buttonVariants({ variant: "primary", size: "sm" })}>
                Resume →
              </Link>
            </div>
          </Card>
        )}

        {/* Spaced repetition */}
        {user && deck.due > 0 && (
          <Card className="mb-8 border-purple-500/20 bg-gradient-to-r from-purple-950/30 to-zinc-900/40 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 sm:flex">
                  <Icon name="progress" size={18} />
                </div>
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400">Spaced repetition</p>
                  <p className="text-sm font-semibold">{deck.due} card{deck.due === 1 ? "" : "s"} due for review</p>
                  <p className="text-xs text-zinc-500">{deck.mature} mature · {deck.young} young · {deck.new} not yet seen</p>
                </div>
              </div>
              <Link
                href="/academy/review"
                className="shrink-0 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-500"
              >
                Review →
              </Link>
            </div>
          </Card>
        )}

        {/* Courses */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">All Courses</h2>
          <span className="text-[11px] text-zinc-600">{courses.length} course{courses.length !== 1 ? "s" : ""}</span>
        </div>

        {courses.length === 0 ? (
          <Card className="py-24 text-center text-zinc-600">
            <p className="mb-4 flex justify-center"><Icon name="blueTeam" size={48} /></p>
            <p className="mb-2 text-lg font-semibold">Courses coming soon</p>
            <p className="text-sm">The first courses are being prepared. Check back soon.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {courses.map(course => {
              const enrolled  = enrolledIds.has(course.id);
              const completed = completedIds.has(course.id);
              const lessons   = totalLessons(course);
              const totalMinutes = course.modules.reduce(
                (s, m) => s + m.lessons.reduce((ls, l) => ls + l.durationMin, 0), 0,
              );
              const allCourseLessons = course.modules.flatMap(m => m.lessons.map(l => l.id));
              const doneCount = allCourseLessons.filter(id => completedLessonSet.has(id)).length;
              const pct = allCourseLessons.length > 0 ? Math.round((doneCount / allCourseLessons.length) * 100) : 0;
              const cat = CATEGORY[course.category] ?? { label: course.category, icon: "learning" as IconName, tint: "text-zinc-300 bg-zinc-700/30" };

              return (
                <Link key={course.id} href={`/academy/${course.slug}`} className="group block">
                  <Card interactive className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cat.tint}`}>
                          <Icon name={cat.icon} size={17} />
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.tint.split(" ")[0]}`}>
                          {cat.label}
                        </span>
                      </div>
                      {completed ? (
                        <Badge tone="emerald"><Icon name="check" size={12} className="mr-0.5 inline-block" />Complete</Badge>
                      ) : enrolled && doneCount > 0 ? (
                        <Badge tone="zinc">{pct}% done</Badge>
                      ) : enrolled ? (
                        <Badge tone="zinc">Enrolled</Badge>
                      ) : null}
                    </div>

                    <h3 className="mb-1 text-base font-semibold leading-snug text-zinc-100 transition group-hover:text-white">{course.title}</h3>
                    {course.subtitle && <p className="mb-2 text-xs text-zinc-500">{course.subtitle}</p>}
                    <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-zinc-500">{course.description}</p>

                    {enrolled && !completed && (
                      <div className="mb-4">
                        <ProgressBar value={pct} tone="emerald" className="h-1" />
                        <p className="mt-1 text-[10px] text-zinc-600">{doneCount} / {allCourseLessons.length} lessons</p>
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                      <Badge tone={DIFF_TONE[course.difficulty] ?? "slate"}>{course.difficulty}</Badge>
                      <span className="text-[10px] text-zinc-600">{course._count.modules} modules</span>
                      <span className="text-[10px] text-zinc-600">{lessons} lessons</span>
                      {totalMinutes > 0 && <span className="text-[10px] text-zinc-600">{formatDuration(totalMinutes)}</span>}
                      <span className="ml-auto text-[10px] font-medium text-amber-500/80">{lessons * 25} XP</span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon, tint, label, value, sub,
}: {
  icon: IconName; tint: string; label: string; value: React.ReactNode; sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon name={icon} size={12} className={tint} />
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      </div>
      <p className={`text-2xl font-black leading-none tabular-nums ${tint}`}>{value}</p>
      <p className="mt-2 text-[10px] text-zinc-600">{sub}</p>
    </Card>
  );
}
