import Link from "next/link";
import { db } from "@/lib/db";
import { LabToggle } from "../_components/lab-toggle";
import { TemplateToggle } from "../_components/template-toggle";

export const dynamic = "force-dynamic";

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-ok bg-ok-wash border-ok-edge",
  MEDIUM: "text-warn bg-warn-wash border-warn-edge",
  HARD:   "text-danger bg-danger-wash border-danger-edge",
  INSANE: "text-accent bg-accent-wash border-accent-edge",
};

const TYPE_STYLE: Record<string, string> = {
  CTF:       "text-ok",
  BLUE_TEAM: "text-info",
  RED_TEAM:  "text-danger",
};

export default async function LabsPage() {
  const [labs, templates] = await Promise.all([
    db.lab.findMany({
      orderBy: [{ published: "desc" }, { createdAt: "asc" }],
      include: { _count: { select: { attempts: true } } },
    }),
    db.scenarioTemplate.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="p-8 space-y-10">
      {/* Labs */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Labs</h1>
            <p className="text-ink-3 text-sm mt-1">
              {labs.filter((l) => l.published).length} published · {labs.filter((l) => !l.published).length} draft
            </p>
          </div>
          <Link
            href="/admin/labs/new"
            className="bg-ok hover:bg-ok-wash text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Lab
          </Link>
        </div>

        <div className="rounded-xl border border-edge overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-white/2">
                <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Lab</th>
                <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Type</th>
                <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Difficulty</th>
                <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Attempts</th>
                <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Version</th>
                <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {labs.map((lab) => (
                <tr key={lab.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{lab.title}</p>
                    <p className="text-xs text-ink-3 font-mono">{lab.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${TYPE_STYLE[lab.type] ?? "text-ink-2"}`}>
                      {lab.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[lab.difficulty]}`}>
                      {lab.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-ink-2 tabular-nums">{lab._count.attempts}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/labs/${lab.slug}`}
                      className="text-xs text-ink-3 hover:text-ink-2 font-mono transition"
                      title="Version history"
                    >
                      v{lab.version}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/labs/${lab.slug}/edit`}
                      className="text-xs text-ink-3 hover:text-ok transition mr-3"
                    >
                      Edit
                    </Link>
                    <LabToggle id={lab.id} published={lab.published} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scenario Templates */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Scenario Templates</h2>
          <p className="text-ink-3 text-sm mt-1">
            {templates.filter((t) => t.published).length} published · {templates.filter((t) => !t.published).length} draft
          </p>
        </div>

        <div className="rounded-xl border border-edge overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-white/2">
                <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Template</th>
                <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Industry</th>
                <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Difficulty</th>
                <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{t.name}</p>
                    <p className="text-xs text-ink-3 font-mono">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-2 text-xs">{t.industry}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[t.difficulty]}`}>
                      {t.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <TemplateToggle id={t.id} published={t.published} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
