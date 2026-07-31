import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listScenarios, listRuns } from "@/lib/crisis";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crisis Command Center · Sage Vault" };

const BAND_TONE = {
  EXEMPLARY: "emerald",
  EFFECTIVE: "blue",
  ADEQUATE: "amber",
  STRUGGLING: "red",
} as const;

export default async function CrisisHubPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const scenarios = listScenarios();
  const runs = await listRuns(user.id, 10);

  const completed = runs.filter((r) => r.status === "COMPLETED");
  const best = completed.reduce<number | null>(
    (max, r) => (max === null || (r.score ?? 0) > max ? r.score : max),
    null,
  );
  const inProgress = runs.find((r) => r.status === "IN_PROGRESS");

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Crisis Command Center"
          subtitle="You are the Incident Commander. Run the technical response while the board, the regulator, the press and your patients all want answers — and you cannot do everything."
        />

        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Scenarios" value={scenarios.length} sub="available" />
          <StatCard label="Runs" value={runs.length} sub="attempted" />
          <StatCard label="Completed" value={completed.length} sub="graded" />
          <StatCard
            label="Best score"
            value={best === null ? "—" : best}
            sub={best === null ? "not yet graded" : "out of 100"}
          />
        </div>

        {inProgress && (
          <Card className="mb-8 border-amber-500/30 bg-amber-500/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  You have a crisis in progress
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  {inProgress._count.decisions} decisions taken. The clock is where you left it.
                </p>
              </div>
              <Link
                href={`/crisis/run/${inProgress.id}`}
                className="text-sm font-semibold text-amber-300 hover:underline"
              >
                Resume command →
              </Link>
            </div>
          </Card>
        )}

        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Scenarios
          </h2>
          <div className="space-y-4">
            {scenarios.map((s) => (
              <Card key={s.slug} className="p-6" interactive>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/crisis/${s.slug}`}
                      className="text-lg font-bold hover:text-emerald-400"
                    >
                      {s.title}
                    </Link>
                    <p className="mt-1 max-w-2xl text-sm text-zinc-400">{s.description}</p>
                    <p className="mt-3 text-xs text-zinc-600">
                      {s.injectCount} decision points ·{" "}
                      {Math.round(s.durationMinutes / 60)}-hour simulated day
                    </p>
                  </div>
                  <Icon name="escalate" size={22} />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {runs.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Your runs
            </h2>
            <Card className="divide-y divide-white/5 p-0">
              {runs.map((r) => (
                <Link
                  key={r.id}
                  href={
                    r.status === "IN_PROGRESS"
                      ? `/crisis/run/${r.id}`
                      : `/crisis/run/${r.id}/debrief`
                  }
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200">{r.scenarioSlug}</p>
                    <p className="text-xs text-zinc-600">
                      {r.startedAt.toLocaleDateString("en-GB")} ·{" "}
                      {r._count.decisions} decisions
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {r.band && (
                      <Badge tone={BAND_TONE[r.band as keyof typeof BAND_TONE] ?? "zinc"}>
                        {r.band}
                      </Badge>
                    )}
                    {r.score !== null ? (
                      <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                        {r.score}
                      </span>
                    ) : (
                      <Badge tone="amber">IN PROGRESS</Badge>
                    )}
                  </div>
                </Link>
              ))}
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
