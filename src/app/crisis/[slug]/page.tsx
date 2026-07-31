import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { findCrisisScenario } from "@/content/crisis-scenarios";
import { getScenarioLeaderboard } from "@/lib/crisis";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, StatCard, Badge } from "@/components/ui";
import { StartRunButton } from "./_components/start-run-button";

export const dynamic = "force-dynamic";

const BAND_TONE = {
  EXEMPLARY: "emerald",
  EFFECTIVE: "blue",
  ADEQUATE: "amber",
  STRUGGLING: "red",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = findCrisisScenario(slug);
  return { title: s ? `${s.title} · Crisis · Sage Vault` : "Crisis · Sage Vault" };
}

export default async function CrisisBriefPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const scenario = findCrisisScenario(slug);
  if (!scenario) notFound();

  const board = await getScenarioLeaderboard(slug, 20);

  // Channels give a sense of the breadth without revealing the timeline.
  const channels = [...new Set(scenario.injects.map((i) => i.channel))];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/crisis"
          className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          ← All scenarios
        </Link>

        <PageHeader className="mb-6 mt-3" title={scenario.title} subtitle={scenario.description} />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Simulated day"
            value={`${Math.round(scenario.durationMinutes / 60)}h`}
            sub={`from ${scenario.clockStart}`}
          />
          <StatCard label="Decision points" value={scenario.injects.length} sub="across the day" />
          <StatCard label="Fronts" value={channels.length} sub="competing for you" />
          <StatCard label="Commanders" value={board.length} sub="have completed it" />
        </div>

        <Card className="mb-8 p-6">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            How this works
          </h2>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li>
              <span className="text-zinc-200">The clock is your budget.</span> Every decision
              consumes simulated minutes. While you are dealing with one thing, others are
              still arriving.
            </li>
            <li>
              <span className="text-zinc-200">Injects expire.</span> Each has a deadline. Letting
              one lapse is a legitimate choice, but it has consequences and it counts against
              your grade.
            </li>
            <li>
              <span className="text-zinc-200">Four things are tracked:</span> containment,
              reputation, team morale, and financial loss. Almost no decision improves all four.
            </li>
            <li>
              <span className="text-zinc-200">You can stop and resume.</span> The run is saved
              after every decision, so an eight-hour day does not need one sitting.
            </li>
          </ul>
        </Card>

        <Card className="mb-8 p-6 text-center">
          <p className="text-sm text-zinc-400">
            You will be graded on the state you leave the organisation in and on the quality of
            your decisions — including the ones you chose not to make.
          </p>
          <div className="mt-4">
            <StartRunButton slug={scenario.slug} />
          </div>
        </Card>

        {board.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Best commanders
            </h2>
            <Card className="divide-y divide-white/5 p-0">
              {board.map((run, i) => (
                <div
                  key={run.id}
                  className={`flex items-center justify-between gap-4 px-5 py-3 ${
                    run.userId === user.id ? "border-l-2 border-emerald-500 bg-emerald-500/5" : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 font-mono text-xs tabular-nums text-zinc-600">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm text-zinc-200">
                      {run.user.displayName ?? run.user.email.split("@")[0]}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {run.band && (
                      <Badge tone={BAND_TONE[run.band as keyof typeof BAND_TONE] ?? "zinc"}>
                        {run.band}
                      </Badge>
                    )}
                    <span className="font-mono text-sm font-bold tabular-nums text-emerald-400">
                      {run.score}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
