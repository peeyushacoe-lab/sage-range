import Link from "next/link";
import { db } from "@/lib/db";
import { getAllAcademyEnrollments } from "@/lib/insights/academy";

export const dynamic = "force-dynamic";

export default async function AcademyEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;

  const [enrollments, courses] = await Promise.all([
    getAllAcademyEnrollments(),
    db.academyCourse.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  const filtered = courseId ? enrollments.filter((e) => e.courseId === courseId) : enrollments;
  const activeCourse = courses.find((c) => c.id === courseId);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Academy Enrollments</h1>
          <p className="text-ink-3 text-sm mt-1">
            {filtered.length} enrollment{filtered.length !== 1 ? "s" : ""}
            {activeCourse && <> in <span className="text-ink-2">{activeCourse.title}</span></>}
          </p>
        </div>
        <Link href="/admin/academy" className="text-sm text-ink-2 border border-edge rounded-lg px-4 py-2 hover:text-white transition">
          ← Back to Academy
        </Link>
      </div>

      {/* Course filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/academy/enrollments"
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
            !courseId ? "bg-ok-wash border-ok-edge text-white" : "border-edge text-ink-2 hover:text-white"
          }`}
        >
          All Courses
        </Link>
        {courses.map((c) => (
          <Link
            key={c.id}
            href={`/admin/academy/enrollments?courseId=${c.id}`}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              courseId === c.id ? "bg-ok-wash border-ok-edge text-white" : "border-edge text-ink-2 hover:text-white"
            }`}
          >
            {c.title}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">User</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Course</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Enrolled</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Lesson Progress</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Quizzes Passed</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Completed</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-3 text-sm">No enrollments yet.</td>
              </tr>
            )}
            {filtered.map((e) => (
              <tr key={`${e.userId}:${e.courseId}`} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{e.userName}</p>
                  <p className="text-xs text-ink-3">{e.userEmail}</p>
                </td>
                <td className="px-4 py-3 text-ink-2">{e.courseTitle}</td>
                <td className="px-4 py-3 text-xs text-ink-3">
                  {e.enrolledAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </td>
                <td className="px-4 py-3 text-right text-ink-2 tabular-nums">
                  {e.completedLessons}/{e.totalLessons} ({e.lessonProgressPct}%)
                </td>
                <td className="px-4 py-3 text-right text-ink-2 tabular-nums">
                  {e.quizzesPassed}/{e.totalQuizzes}
                </td>
                <td className="px-4 py-3 text-xs text-ink-3">
                  {e.completedAt
                    ? e.completedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    e.certificateIssued ? "text-ok bg-ok-wash"
                    : e.completedAt ? "text-info bg-info-wash"
                    : "text-ink-3 bg-surface-2"
                  }`}>
                    {e.certificateIssued ? "Certified" : e.completedAt ? "Completed" : "In Progress"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
