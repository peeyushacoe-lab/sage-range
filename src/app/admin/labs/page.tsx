import Link from "next/link";
import { db } from "@/lib/db";
import { LabToggle } from "../_components/lab-toggle";
import { TemplateToggle } from "../_components/template-toggle";

export const dynamic = "force-dynamic";

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HARD:   "text-red-400 bg-red-500/10 border-red-500/20",
  INSANE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const TYPE_STYLE: Record<string, string> = {
  CTF:       "text-emerald-400",
  BLUE_TEAM: "text-blue-400",
  RED_TEAM:  "text-red-400",
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
            <p className="text-zinc-500 text-sm mt-1">
              {labs.filter((l) => l.published).length} published · {labs.filter((l) => !l.published).length} draft
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Lab</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Type</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Difficulty</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Attempts</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Version</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {labs.map((lab) => (
                <tr key={lab.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-200">{lab.title}</p>
                    <p className="text-xs text-zinc-600 font-mono">{lab.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${TYPE_STYLE[lab.type] ?? "text-zinc-400"}`}>
                      {lab.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-0.5 ${DIFF_STYLE[lab.difficulty]}`}>
                      {lab.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">{lab._count.attempts}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/labs/${lab.slug}`}
                      className="text-xs text-zinc-500 hover:text-zinc-300 font-mono transition"
                      title="Version history"
                    >
                      v{lab.version}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
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
          <p className="text-zinc-500 text-sm mt-1">
            {templates.filter((t) => t.published).length} published · {templates.filter((t) => !t.published).length} draft
          </p>
        </div>

        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Template</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Industry</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Difficulty</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Published</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-200">{t.name}</p>
                    <p className="text-xs text-zinc-600 font-mono">{t.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{t.industry}</td>
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
