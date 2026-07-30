import Link from "next/link";
import { db } from "@/lib/db";
import { PublishToggle } from "./_components/publish-toggle";
import { DeleteBtn } from "./_components/delete-btn";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom Scenarios — Admin" };

const DIFF_COLORS: Record<string, string> = {
  EASY:   "text-ok",
  MEDIUM: "text-warn",
  HARD:   "text-sev-high",
  INSANE: "text-danger",
};

const PERSONA_LABELS: Record<string, string> = {
  ransomware_gang:  "Ransomware Gang",
  nation_state_apt: "Nation-State APT",
  insider:          "Malicious Insider",
  hacktivist:       "Hacktivist",
  cybercriminal:    "Cybercriminal",
};

export default async function AdminScenariosPage() {
  const scenarios = await db.customScenario.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true, email: true } } },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Custom Scenarios</h1>
          <p className="text-ink-3 text-sm mt-1">{scenarios.length} instructor-built scenario{scenarios.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/scenarios/builder"
          className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-bold text-white hover:bg-accent-hover transition-colors"
        >
          + Build Scenario
        </Link>
      </div>

      {scenarios.length === 0 ? (
        <div className="rounded-xl border border-edge-subtle bg-surface-1 p-12 text-center">
          <p className="text-ink-3 text-sm mb-4">No custom scenarios yet.</p>
          <Link
            href="/scenarios/builder"
            className="text-sm text-ok hover:text-ok font-medium transition-colors"
          >
            Build your first scenario →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-edge overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Title</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Persona</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Difficulty</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Template</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Created by</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-ink-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white truncate max-w-[200px]">{s.title}</p>
                    <p className="text-xs text-ink-3 truncate max-w-[200px]">{s.subtitle}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-2 text-xs">{PERSONA_LABELS[s.personaId] ?? s.personaId}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${DIFF_COLORS[s.difficulty] ?? "text-ink-2"}`}>{s.difficulty}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-3 text-xs font-mono">{s.templateSlug}</td>
                  <td className="px-4 py-3 text-ink-3 text-xs truncate max-w-[140px]">
                    {s.createdBy.displayName ?? s.createdBy.email}
                  </td>
                  <td className="px-4 py-3">
                    <PublishToggle id={s.id} published={s.published} />
                  </td>
                  <td className="px-4 py-3">
                    <DeleteBtn id={s.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
