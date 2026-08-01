import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { REPORT_REASON_LABEL, reportPriority, type ScenarioReportReason } from "@/lib/scenario-sharing";
import { ReportActions } from "./_components/report-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scenario Reports — Admin" };

export default async function ScenarioReportsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const reports = await db.scenarioReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      reporter: { select: { displayName: true, email: true } },
      reviewedBy: { select: { displayName: true, email: true } },
      scenario: {
        select: {
          id: true,
          title: true,
          visibility: true,
          takenDownAt: true,
          createdBy: { select: { displayName: true, email: true } },
        },
      },
    },
  });

  const open = reports.filter((r) => r.status === "OPEN");
  const closed = reports.filter((r) => r.status !== "OPEN");

  // Distinct reporters per scenario, so a queue is ordered by how many people
  // independently flagged something rather than raw report count.
  const byScenario = new Map<string, { reporterId: string }[]>();
  for (const r of open) {
    const list = byScenario.get(r.scenarioId) ?? [];
    list.push({ reporterId: r.reporterId });
    byScenario.set(r.scenarioId, list);
  }

  const sortedOpen = [...open].sort(
    (a, b) =>
      reportPriority(byScenario.get(b.scenarioId) ?? []) -
      reportPriority(byScenario.get(a.scenarioId) ?? []),
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Scenario Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {open.length} open · {closed.length} resolved
        </p>
      </div>

      {open.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-8 text-center">
          <p className="text-sm text-zinc-400">Nothing waiting for review.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOpen.map((r) => {
            const flaggers = reportPriority(byScenario.get(r.scenarioId) ?? []);
            return (
              <div
                key={r.id}
                className="rounded-xl border border-amber-500/25 bg-zinc-900/50 p-5"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/scenarios/${r.scenario.id}`}
                      className="text-base font-semibold text-zinc-100 hover:text-emerald-400"
                    >
                      {r.scenario.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      by{" "}
                      {r.scenario.createdBy.displayName ??
                        r.scenario.createdBy.email.split("@")[0]}{" "}
                      · {r.scenario.visibility}
                      {r.scenario.takenDownAt && " · already removed"}
                    </p>
                  </div>
                  {flaggers > 1 && (
                    <span className="shrink-0 rounded border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-red-400">
                      {flaggers} reporters
                    </span>
                  )}
                </div>

                <div className="rounded-md border border-white/8 bg-zinc-900/60 px-4 py-3">
                  <p className="text-sm font-medium text-amber-300">
                    {REPORT_REASON_LABEL[r.reason as ScenarioReportReason] ?? r.reason}
                  </p>
                  {r.detail && <p className="mt-1 text-sm text-zinc-400">{r.detail}</p>}
                  <p className="mt-2 text-xs text-zinc-600">
                    reported by{" "}
                    {r.reporter.displayName ?? r.reporter.email.split("@")[0]} ·{" "}
                    {r.createdAt.toLocaleString("en-GB")}
                  </p>
                </div>

                <div className="mt-3">
                  <ReportActions
                    reportId={r.id}
                    alreadyTakenDown={r.scenario.takenDownAt != null}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {closed.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
            Resolved
          </h2>
          <div className="divide-y divide-white/5 rounded-xl border border-white/10">
            {closed.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/scenarios/${r.scenario.id}`}
                    className="truncate text-sm text-zinc-300 hover:text-emerald-400"
                  >
                    {r.scenario.title}
                  </Link>
                  <p className="text-xs text-zinc-600">
                    {REPORT_REASON_LABEL[r.reason as ScenarioReportReason] ?? r.reason}
                    {r.reviewedBy &&
                      ` · by ${r.reviewedBy.displayName ?? r.reviewedBy.email.split("@")[0]}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.status === "UPHELD"
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-white/15 bg-white/5 text-zinc-400"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
