import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getDebrief } from "@/lib/crisis";
import { clockAt } from "@/lib/crisis-engine";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Crisis Debrief · Sage Vault" };

const BAND_TONE = {
  EXEMPLARY: "emerald",
  EFFECTIVE: "blue",
  ADEQUATE: "amber",
  STRUGGLING: "red",
} as const;

const BAND_NOTE: Record<string, string> = {
  EXEMPLARY:
    "You held the technical response together while keeping the board, the regulator and your patients informed. Few commanders manage all three.",
  EFFECTIVE:
    "A sound response. The organisation came out of this in a defensible position, with some decisions worth revisiting.",
  ADEQUATE:
    "You kept the incident from running away, but several fronts went unattended long enough to cost you.",
  STRUGGLING:
    "The incident outran the response. Look at what lapsed below — in most cases the cost came from decisions never made rather than wrong ones.",
};

function money(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

export default async function CrisisDebriefPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const debrief = await getDebrief(runId, user.id);
  if (!debrief) notFound();

  const { run, scenario, grade, timeline } = debrief;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/crisis"
          className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          ← Crisis Command Center
        </Link>

        <PageHeader
          className="mb-6 mt-3"
          title="After-action review"
          subtitle={scenario.title}
          actions={
            <Badge tone={BAND_TONE[grade.band] ?? "zinc"}>{grade.band}</Badge>
          }
        />

        <Card className="mb-8 p-8 text-center">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">Command score</p>
          <p className="mt-2 font-mono text-6xl font-black tabular-nums text-emerald-400">
            {grade.score}
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-400">
            {BAND_NOTE[grade.band] ?? ""}
          </p>
        </Card>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Containment" value={grade.containment} sub="out of 100" />
          <StatCard label="Reputation" value={grade.reputation} sub="out of 100" />
          <StatCard label="Team morale" value={grade.morale} sub="out of 100" />
          <StatCard label="Loss" value={money(grade.financialLoss)} sub="incurred" />
        </div>

        <div className="mb-10 grid grid-cols-2 gap-4">
          <StatCard
            label="Decisions taken"
            value={`${grade.answered}/${scenario.injects.length}`}
            sub={`${Math.round(grade.idealRate * 100)}% best-practice`}
          />
          <StatCard
            label="Let lapse"
            value={grade.missed}
            sub={grade.missed === 0 ? "nothing missed" : "cost you directly"}
          />
        </div>

        {/* ── Timeline ── */}
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Decision by decision
          </h2>

          <div className="space-y-4">
            {timeline.map(({ inject, chosen, ideal, answered, wasIdeal, atMinute }) => (
              <Card
                key={inject.id}
                className={`p-5 ${
                  !answered
                    ? "border-red-500/30"
                    : wasIdeal
                      ? "border-emerald-500/30"
                      : "border-amber-500/30"
                }`}
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-600">
                      {clockAt(scenario, inject.atMinute)} · {inject.channel}
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-zinc-100">
                      {inject.title}
                    </p>
                  </div>
                  {!answered ? (
                    <Badge tone="red">Lapsed</Badge>
                  ) : wasIdeal ? (
                    <Badge tone="emerald">Best call</Badge>
                  ) : (
                    <Badge tone="amber">Suboptimal</Badge>
                  )}
                </div>

                {answered && chosen ? (
                  <div className="mt-3 rounded-md border border-white/8 bg-zinc-900/50 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                      <Icon name="check" size={14} />
                      {chosen.label}
                      {atMinute !== null && (
                        <span className="ml-auto font-mono text-xs text-zinc-600">
                          {clockAt(scenario, atMinute)}
                        </span>
                      )}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">{chosen.rationale}</p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3">
                    <p className="text-sm text-red-300">You did not act on this.</p>
                    <p className="mt-1 text-sm text-zinc-400">{inject.escalation.note}</p>
                  </div>
                )}

                {/* Show the better answer only when it was not the one taken. */}
                {ideal && !wasIdeal && (
                  <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-widest text-emerald-500">
                      The stronger call
                    </p>
                    <p className="mt-1 text-sm font-medium text-zinc-200">{ideal.label}</p>
                    <p className="mt-1 text-sm text-zinc-400">{ideal.rationale}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            Run started {run.startedAt.toLocaleString("en-GB")}
          </p>
          <Link
            href={`/crisis/${scenario.slug}`}
            className="text-sm text-emerald-400 hover:underline"
          >
            Run it again →
          </Link>
        </div>
      </div>
    </main>
  );
}
