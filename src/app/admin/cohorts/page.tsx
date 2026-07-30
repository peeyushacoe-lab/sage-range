import Link from "next/link";
import { db } from "@/lib/db";
import { CreateCohortForm } from "./_components/create-cohort-form";

export const dynamic = "force-dynamic";

export default async function AdminCohortsPage() {
  const cohorts = await db.cohort.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { members: true } },
      paths: { include: { path: { select: { title: true } } } },
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cohorts</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Manage intern batches and track group progress
          </p>
        </div>
      </div>

      {cohorts.length > 0 && (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Cohort</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Paths</th>
                <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Members</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Join Code</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {cohorts.map((c) => (
                <tr key={c.id} className="hover:bg-white/2 transition">
                  <td className="px-4 py-3">
                    <Link href={`/cohorts/${c.id}`} className="text-zinc-200 hover:text-emerald-400 transition font-medium">
                      {c.name}
                    </Link>
                    {c.description && (
                      <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-xs">{c.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.paths.map((cp) => (
                        <span key={cp.id} className="text-xs text-zinc-500 border border-white/8 rounded px-1.5 py-0.5">
                          {cp.path.title}
                        </span>
                      ))}
                      {c.paths.length === 0 && <span className="text-xs text-zinc-700">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-zinc-300 font-semibold">{c._count.members}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1">
                      {c.joinCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-zinc-500">
                    {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                    {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString()}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCohortForm />
    </div>
  );
}
