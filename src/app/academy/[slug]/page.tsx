import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { EnrollBtn } from "./_components/enroll-btn";
import { Navbar } from "@/components/navbar";
import { requestCertificateApproval } from "@/lib/certificate-approval";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();

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

  const enrollment = user ? await db.academyEnrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  }) : null;

  const completedLessonIds = user && enrollment ? new Set(
    (await db.academyLessonProgress.findMany({
      where: {
        userId: user.id,
        lessonId: { in: course.modules.flatMap(m => m.lessons.map(l => l.id)) },
        completedAt: { not: null },
      },
      select: { lessonId: true },
    })).map(p => p.lessonId)
  ) : new Set<string>();

  const cert = user ? await db.academyCertificate.findUnique({
    where: { userId_courseId: { userId: user.id, courseId: course.id } },
  }) : null;

  // If the course is complete but no cert and no approval request exists yet
  // (pre-workflow completion), open one. Idempotent.
  let certApproval = user && !cert && enrollment?.completedAt
    ? await db.certificateApproval.findUnique({
        where: { userId_kind_targetId: { userId: user.id, kind: "ACADEMY", targetId: course.id } },
      })
    : null;
  if (user && !cert && enrollment?.completedAt && !certApproval) {
    certApproval = await requestCertificateApproval(user.id, "ACADEMY", course.id, course.title);
  }

  const allLessons = course.modules.flatMap(m => m.lessons);
  const progressPct = allLessons.length > 0 ? Math.round((completedLessonIds.size / allLessons.length) * 100) : 0;

  const firstLesson = course.modules[0]?.lessons[0];

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <Link href="/academy" className="text-xs text-ink-3 hover:text-ink-2 transition mb-6 block">← Academy</Link>

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
          {course.subtitle && <p className="text-ink-2 text-lg mb-4">{course.subtitle}</p>}
          <p className="text-ink-2 text-sm leading-relaxed max-w-2xl mb-6">{course.description}</p>

          <div className="flex items-center gap-4 flex-wrap mb-6">
            {enrollment && !cert && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-48 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <span className="text-xs text-ink-3">{progressPct}% complete</span>
              </div>
            )}
            {cert && (
              <Link href={`/academy/certificate/${cert.certCode}`} className="text-xs text-ok border border-ok-edge px-3 py-1 rounded-lg hover:bg-ok-wash transition">
                View Certificate →
              </Link>
            )}
            {certApproval && (
              <span className="text-xs text-ink-3 border border-edge px-3 py-1 rounded-lg">
                {certApproval.status === "REJECTED" ? "Certificate not approved" : "Certificate pending admin approval"}
              </span>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            {!enrollment ? (
              <EnrollBtn courseId={course.id} />
            ) : firstLesson ? (
              <Link href={`/academy/${slug}/learn/${firstLesson.id}`} className="bg-ok hover:bg-ok-wash text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
                {progressPct > 0 ? "Continue Learning" : "Start Course"}
              </Link>
            ) : null}
          </div>
        </div>

        {/* Objectives */}
        {course.objectives.length > 0 && (
          <div className="rounded-xl border border-edge bg-surface-1 p-5 mb-8">
            <h2 className="text-xs uppercase tracking-widest text-ink-3 font-mono mb-4">What you&apos;ll learn</h2>
            <ul className="space-y-2">
              {course.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-2">
                  <span className="text-ok shrink-0 mt-0.5"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Modules */}
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-ink-3 font-mono mb-4">Course Content</h2>
          {course.modules.map((mod, mi) => (
            <div key={mod.id} className="rounded-xl border border-edge bg-surface-1 overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-3 font-mono mb-0.5">Module {mi + 1}</p>
                  <p className="font-semibold text-ink">{mod.title}</p>
                </div>
                <span className="text-xs text-ink-3">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? "s" : ""}</span>
              </div>
              {mod.lessons.length > 0 && (
                <div className="border-t border-edge-subtle divide-y divide-edge-subtle">
                  {mod.lessons.map(lesson => {
                    const done = completedLessonIds.has(lesson.id);
                    return (
                      <div key={lesson.id} className="flex items-center gap-3 px-5 py-3">
                        <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] ${done ? "bg-accent-fill border-ok-edge text-white" : "border-edge-strong"}`}>
                          {done ? <Icon name="check" size={13} /> : ""}
                        </span>
                        {enrollment ? (
                          <Link href={`/academy/${slug}/learn/${lesson.id}`} className="text-sm text-ink-2 hover:text-white transition flex-1">
                            {lesson.title}
                          </Link>
                        ) : (
                          <span className="text-sm text-ink-3 flex-1">{lesson.title}</span>
                        )}
                        <span className="text-xs text-ink-3">{lesson.durationMin} min</span>
                      </div>
                    );
                  })}
                  {mod.quiz && enrollment && (
                    <div className="flex items-center gap-3 px-5 py-3 bg-surface-2/30">
                      <span className="w-4 h-4 rounded border border-warn-edge flex-shrink-0 text-[10px] text-warn flex items-center justify-center">Q</span>
                      <span className="text-sm text-ink-2">Module Quiz</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
