import Link from "next/link";
import { db } from "@/lib/db";
import { IncidentPublishToggle } from "./_components/incident-publish-toggle";
import { IncidentDeleteBtn } from "./_components/incident-delete-btn";

export const dynamic = "force-dynamic";

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-ok bg-ok-wash border-ok-edge",
  MEDIUM: "text-warn bg-warn-wash border-warn-edge",
  HARD:   "text-danger bg-danger-wash border-danger-edge",
  INSANE: "text-accent bg-accent-wash border-accent-edge",
};

export default async function AdminIncidentsPage() {
  const sims = await db.incidentSimulation.findMany({
    orderBy: [{ published: "desc" }, { createdAt: "desc" }],
    include: {
      company: { select: { name: true } },
      _count: { select: { artifacts: true, tasks: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Boss Fight Simulations</h1>
          <p className="text-ink-3 text-sm mt-1">
            {sims.filter((s) => s.published).length} published · {sims.filter((s) => !s.published).length} draft — the
            content authoring tool: build new incident simulations without touching code.
          </p>
        </div>
        <Link
          href="/admin/incidents/new"
          className="bg-accent-fill hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          + New Simulation
        </Link>
      </div>

      <div className="rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Simulation</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Company</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Difficulty</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Content</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {sims.map((s) => (
              <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{s.title}</p>
                  <p className="text-xs text-ink-3 font-mono">{s.slug}</p>
                </td>
                <td className="px-4 py-3 text-ink-2 text-xs">{s.company.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[s.difficulty]}`}>
                    {s.difficulty}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-ink-2 tabular-nums text-xs">
                  {s._count.artifacts} artifacts · {s._count.tasks} tasks
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/incidents/${s.slug}/edit`} className="text-xs text-ink-3 hover:text-ok transition mr-3">
                    Edit
                  </Link>
                  <IncidentPublishToggle slug={s.slug} published={s.published} />
                  <span className="inline-block ml-3">
                    <IncidentDeleteBtn slug={s.slug} />
                  </span>
                </td>
              </tr>
            ))}
            {sims.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-3 text-sm">
                  No simulations yet — click "New Simulation" to build one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
