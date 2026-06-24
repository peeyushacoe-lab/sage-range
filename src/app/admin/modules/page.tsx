import Link from "next/link";
import { db } from "@/lib/db";
import { CreateModuleForm } from "./_components/create-module-form";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const paths = await db.learningPath.findMany({
    orderBy: { order: "asc" },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          quiz: { select: { id: true } },
          assessment: { select: { id: true } },
          _count: { select: { progress: true } },
        },
      },
    },
  });

  return (
    <div className="p-8 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Modules</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Manage structured learning modules for each path
          </p>
        </div>
      </div>

      <div className="grid gap-8">
        {paths.map((path) => (
          <section key={path.id}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-semibold text-white">{path.title}</h2>
                <p className="text-xs text-zinc-500">
                  {path.modules.length} module{path.modules.length !== 1 ? "s" : ""} ·{" "}
                  {path.published ? "Published" : "Draft"}
                </p>
              </div>
            </div>

            {path.modules.length > 0 && (
              <div className="rounded-xl border border-white/8 overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/2">
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">#</th>
                      <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Title</th>
                      <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Quiz</th>
                      <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Assessment</th>
                      <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Progress</th>
                      <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Published</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4">
                    {path.modules.map((mod) => (
                      <tr key={mod.id} className="hover:bg-white/2 transition">
                        <td className="px-4 py-3 text-zinc-500 text-xs">{mod.order + 1}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/modules/${mod.id}`}
                            className="text-zinc-200 hover:text-emerald-400 transition font-medium"
                          >
                            {mod.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {mod.quiz ? (
                            <span className="text-emerald-400 text-xs">✓</span>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {mod.assessment ? (
                            <span className="text-emerald-400 text-xs">✓</span>
                          ) : (
                            <span className="text-zinc-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-zinc-500">
                          {mod._count.progress}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-medium ${mod.published ? "text-emerald-400" : "text-zinc-600"}`}>
                            {mod.published ? "Yes" : "Draft"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <CreateModuleForm pathId={path.id} nextOrder={path.modules.length} />
          </section>
        ))}
      </div>
    </div>
  );
}
