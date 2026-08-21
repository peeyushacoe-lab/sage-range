import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getRunState } from "@/lib/ozh";
import { buildBriefing } from "@/content/ozh-scenario";
import {
  OZH_OPENS_AT,
  OZH_CLOSES_AT,
  RUN_MINUTES,
  MAX_SCORE,
  PHASE_ORDER,
  PHASE_LABEL,
  PHASE_POINTS,
  PHASE_MINUTES,
  windowStateAt,
  lastFullRunStart,
} from "@/lib/ozh-engine";
import { formatIST } from "@/lib/ozh-format";
import { isPreviewer } from "@/lib/ozh-preview";
import { Navbar } from "@/components/navbar";
import { Card, Badge, StatCard, buttonVariants } from "@/components/ui";
import { StartOperation } from "./_components/start-operation";
import { ResetPreview } from "./_components/reset-preview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operation Zero Hour · Sage Vault" };

export default async function ZeroHourBriefingPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const brief = buildBriefing();
  const now = new Date();
  const state = windowStateAt(now);
  const run = await getRunState(user.id, now);
  const preview = isPreviewer(user.email);

  // A finished real run has nothing left to brief — send them to their
  // result. A previewer's finished *preview* run is the exception: they land
  // here instead, where the reset button below can discard it and let them
  // walk the console again.
  if (run && run.status !== "IN_PROGRESS" && !(preview && run.preview)) {
    redirect("/operations/zero-hour/result");
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 text-center">
          <Badge tone="red" className="mb-4">
            ⚠ Critical incident
          </Badge>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">OPERATION ZERO HOUR</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-zinc-500">
            Individual incident response competition
          </p>
        </div>

        {preview && (
          <Card className="mb-6 border-purple-500/35 bg-purple-500/[0.06] p-5">
            <Badge tone="purple" className="mb-2">
              Preview access
            </Badge>
            <p className="text-sm font-semibold text-purple-200">
              This account can run the operation before it opens.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Your run is marked as a dry run: it never appears on the leaderboard, cannot win an
              award, and can be discarded and restarted as often as you like. The evidence,
              scoring and timer are otherwise identical to what the interns will get.
            </p>
            {run && (
              <div className="mt-4">
                <ResetPreview />
              </div>
            )}
          </Card>
        )}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Duration" value={`${RUN_MINUTES / 60}h`} sub="once you start" />
          <StatCard label="Phases" value={PHASE_ORDER.length} sub="unlock in order" />
          <StatCard label="Max score" value={MAX_SCORE.toLocaleString()} sub="points" />
          <StatCard label="Attempts" value="1" sub="no resets" />
        </div>

        <Card className="mb-8 p-6">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
            Competition window
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-zinc-500">Opens</p>
              <p className="font-semibold text-zinc-200">{formatIST(OZH_OPENS_AT)} IST</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Closes</p>
              <p className="font-semibold text-zinc-200">{formatIST(OZH_CLOSES_AT)} IST</p>
            </div>
          </div>
          {/* The deadline is a hard stop, so starting late costs you time rather
              than extending the window. Saying so up front is fairer than
              letting someone discover it at 19:45. */}
          <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/90">
            The deadline is a hard stop. A run still open at{" "}
            {formatIST(OZH_CLOSES_AT)} is closed and graded on whatever has been submitted.
            To get the full {RUN_MINUTES / 60} hours, start by{" "}
            <span className="font-semibold">{formatIST(lastFullRunStart())} IST</span>.
          </p>
        </Card>

        <Card className="mb-8 p-6">
          <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">Mission briefing</p>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-300">
            {brief.briefing}
          </pre>
        </Card>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
              {brief.company.name}
            </p>
            <dl className="space-y-1.5 text-sm">
              {[
                ["Sector", brief.company.sector],
                ["Employees", brief.company.employees],
                ["Servers", brief.company.servers],
                ["Endpoints", brief.company.endpoints],
                ["Critical systems", brief.company.criticalSystems],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="font-medium tabular-nums text-zinc-200">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-6">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
              Network overview
            </p>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-zinc-400">
              {brief.network}
            </pre>
          </Card>
        </div>

        <Card className="mb-8 p-6">
          <p className="mb-4 text-[10px] uppercase tracking-widest text-zinc-500">Phases</p>
          <ol className="space-y-2">
            {PHASE_ORDER.map((phase, i) => (
              <li
                key={phase}
                className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xs font-bold tabular-nums text-zinc-600">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-sm font-semibold text-zinc-200">{PHASE_LABEL[phase]}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-zinc-500">
                  <span>~{PHASE_MINUTES[phase]} min</span>
                  <Badge tone="zinc">{PHASE_POINTS[phase]} pts</Badge>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
              Evidence available
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-400">
              {brief.evidenceAvailable.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Card>

          <Card className="border-red-500/20 bg-red-500/[0.03] p-6">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-red-400/80">Rules</p>
            <ul className="space-y-1.5 text-sm text-zinc-400">
              {brief.rules.map((r) => (
                <li key={r} className="flex gap-2">
                  <span className="text-red-500/60">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="flex flex-col items-center gap-4">
          {state === "BEFORE" && !preview && (
            <Card className="w-full p-5 text-center">
              <p className="text-sm text-zinc-400">
                The operation opens {formatIST(OZH_OPENS_AT)} IST.
              </p>
            </Card>
          )}
          {state === "BEFORE" && preview && <StartOperation resuming={!!run} preview />}
          {state === "CLOSED" && (
            <Card className="w-full p-5 text-center">
              <p className="text-sm text-zinc-400">This operation has closed.</p>
              <Link
                href="/operations/zero-hour/leaderboard"
                className={`${buttonVariants({ variant: "secondary" })} mt-3`}
              >
                View the final board
              </Link>
            </Card>
          )}
          {state === "OPEN" && <StartOperation resuming={!!run} preview={preview} />}

          <Link
            href="/operations/zero-hour/leaderboard"
            className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
