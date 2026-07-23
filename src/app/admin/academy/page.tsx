import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HARD:   "text-red-400 bg-red-500/10 border-red-500/20",
  INSANE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const CAT_LABEL: Record<string, string> = {
  FUNDAMENTALS:         "Fundamentals",
  BLUE_TEAM:            "Blue Team",
  RED_TEAM:             "Red Team",
  FORENSICS:            "Forensics",
  SECURITY_ENGINEERING: "Sec Engineering",
  NETWORKING:           "Networking",
  CLOUD:                "Cloud",
};

export default async function AcademyAdminPage() {
  const courses = await db.academyCourse.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { modules: true, enrollments: true } } },
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Academy</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {courses.filter(c => c.published).length} published · {courses.filter(c => !c.published).length} draft
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/academy/enrollments" className="text-sm text-zinc-400 border border-white/10 rounded-lg px-4 py-2 hover:text-white transition">
            Enrollments
          </Link>
          <Link href="/admin/academy/cheatsheets" className="text-sm text-zinc-400 border border-white/10 rounded-lg px-4 py-2 hover:text-white transition">
            Cheat Sheets
          </Link>
          <Link href="/admin/academy/new" className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            + New Course
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Course</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Category</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Difficulty</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Modules</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Enrolled</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Status</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {courses.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600 text-sm">No courses yet. Create your first course.</td>
              </tr>
            )}
            {courses.map(course => (
              <tr key={course.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-200">{course.title}</p>
                  <p className="text-xs text-zinc-600 font-mono">{course.slug}</p>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-400">{CAT_LABEL[course.category] ?? course.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[course.difficulty]}`}>
                    {course.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">{course._count.modules}</td>
                <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">
                  <Link href={`/admin/academy/enrollments?courseId=${course.id}`} className="hover:text-emerald-400 transition">
                    {course._count.enrollments}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${course.published ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 bg-zinc-800"}`}>
                    {course.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/academy/${course.id}/edit`} className="text-xs text-zinc-500 hover:text-emerald-400 transition">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
