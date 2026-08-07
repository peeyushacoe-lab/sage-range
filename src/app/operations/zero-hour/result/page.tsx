import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getResult } from "@/lib/ozh";
import { SKILLS_DEMONSTRATED } from "@/content/ozh-scenario";
import { PHASE_LABEL, AWARD_LABEL, type OzhPhase, type OzhAwardKind } from "@/lib/ozh-engine";
import { formatElapsed } from "@/lib/ozh-format";
import { Navbar } from "@/components/navbar";
import { Card, Badge, StatCard, ProgressBar, buttonVariants } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zero Hour Result · Sage Vault" };

export default async function ZeroHourResultPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const result = await getResult(user.id);
  if (!result) redirect("/operations/zero-hour");
  if (!result.finished) redirect("/operations/zero-hour/console");

  const { score, maxScore, accuracy, elapsedSeconds, rank, fieldSize, breakdown, awards, evidence } =
    result;

  // Split the debrief into what held up and what did not. Listing only the
  // misses reads as a punishment; listing only the wins teaches nothing.
  const strong = breakdown.filter((p) => p.maxPoints > 0 && p.points / p.maxPoints >= 0.8);
  const missed = breakdown.flatMap((p) => p.missed.map((m) => ({ phase: p.phase, text: m })));

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Operation Zero Hour
          </p>
          <p className="mt-3 text-6xl font-black tabular-nums leading-none">
            {score}
            <span className="text-2xl text-zinc-600"> / {maxScore}</span>
          </p>
          {result.status === "EXPIRED" && (
            <Badge tone="amber" className="mt-4">
              Time expired — graded on phases submitted
            </Badge>
          )}
          {result.preview && (
            <Badge tone="purple" className="mt-4 ml-2">
              Preview run — excluded from the leaderboard
            </Badge>
          )}
        </div>

        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard
            label="Rank"
            value={rank ? `#${rank}` : "—"}
            sub={fieldSize > 0 ? `of ${fieldSize}` : "unranked"}
          />
          <StatCard label="Accuracy" value={`${accuracy}%`} sub="of decisions" />
          <StatCard label="Time" value={formatElapsed(elapsedSeconds)} sub="elapsed" />
        </div>

        {awards.length > 0 && (
          <Card className="mb-8 border-amber-500/30 bg-amber-500/[0.04] p-5">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-amber-400/80">Awards</p>
            <div className="space-y-2">
              {awards.map((a) => (
                <div key={a.certCode} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-amber-200">
                    {AWARD_LABEL[a.kind as OzhAwardKind]}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">{a.certCode}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="mb-8 p-5">
          <p className="mb-4 text-[10px] uppercase tracking-widest text-zinc-500">Breakdown</p>
          <div className="space-y-3">
            {breakdown.map((p) => (
              <div key={p.phase}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-zinc-300">{PHASE_LABEL[p.phase as OzhPhase]}</span>
                  <span className="font-mono text-sm tabular-nums text-zinc-400">
                    {p.points}/{p.maxPoints}
                  </span>
                </div>
                <ProgressBar value={p.maxPoints ? (p.points / p.maxPoints) * 100 : 0} />
              </div>
            ))}
          </div>
        </Card>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-emerald-400/80">
              What you got right
            </p>
            {strong.length > 0 ? (
              <ul className="space-y-1.5 text-sm text-zinc-400">
                {strong.map((p) => (
                  <li key={p.phase} className="flex gap-2">
                    <span className="text-emerald-500">✓</span>
                    {PHASE_LABEL[p.phase as OzhPhase]} — {p.correct} of {p.total} decisions correct
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">
                No phase reached 80%. The debrief below is where to start.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
              Skills demonstrated
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SKILLS_DEMONSTRATED.map((s) => (
                <Badge key={s} tone="blue">
                  {s}
                </Badge>
              ))}
            </div>
          </Card>
        </div>

        {missed.length > 0 && (
          <Card className="mb-8 p-5">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-amber-400/80">
              What you missed
            </p>
            <p className="mb-3 text-xs text-zinc-500">
              Everything below is specific to the evidence set you were given.
            </p>
            <ul className="space-y-1.5">
              {missed.slice(0, 40).map((m, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-zinc-400">
                  <span className="shrink-0 font-mono text-zinc-600">
                    {PHASE_LABEL[m.phase as OzhPhase].split(" ")[0]}
                  </span>
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
            {missed.length > 40 && (
              <p className="mt-2 text-xs text-zinc-600">…and {missed.length - 40} more.</p>
            )}
          </Card>
        )}

        <Card className="mb-8 p-5">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">
            The intrusion, as it happened
          </p>
          <p className="mb-3 text-xs text-zinc-500">Your evidence set, resolved.</p>
          <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
            {[
              ["Initial access", evidence.attachment],
              ["Phishing domain", evidence.phishDomain],
              ["Patient zero", evidence.victimHost],
              ["Compromised user", evidence.victimUser],
              ["C2 address", `${evidence.c2Ip}:${evidence.c2Port}`],
              ["C2 domain", evidence.c2Domain],
              ["Persistence 1", evidence.taskName],
              ["Persistence 2", evidence.runKeyName],
              ["Credential taken", evidence.svcAccount],
              ["Lateral target", evidence.fileServer],
              ["Staged archive", evidence.archiveName],
              ["Data exfiltrated", `${evidence.exfilMb} MB over DNS`],
              ["Password spray", `${evidence.sprayIp} — failed, not the entry point`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-white/5 py-1">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="text-right font-mono text-zinc-300">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="flex justify-center gap-3">
          <Link
            href="/operations/zero-hour/leaderboard"
            className={buttonVariants({ variant: "primary" })}
          >
            Leaderboard
          </Link>
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            Back to Vault
          </Link>
        </div>
      </div>
    </main>
  );
}
