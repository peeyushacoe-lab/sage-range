import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { listChampionships, getActiveChampionship } from "@/lib/championships";
import { getRunState } from "@/lib/ozh";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard, EmptyState, buttonVariants } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { OZH_OPENS_AT, OZH_CLOSES_AT, windowStateAt } from "@/lib/ozh-engine";
import { formatIST } from "@/lib/ozh-format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Monthly Championship · Sage Vault" };

const TIER_TONE = {
  CHAMPION: "amber",
  MEDALLIST: "purple",
  FINALIST: "blue",
  COMPETITOR: "zinc",
} as const;

function daysLeft(endsAt: Date): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000));
}

/**
 * Operation Zero Hour banner.
 *
 * It runs on its own three-day window rather than the monthly cycle, so it
 * needs its own surface here — otherwise a limited-window event would be
 * invisible on the page interns actually check for competitions.
 *
 * Stays visible after the window closes rather than disappearing — the
 * result, debrief, and awards are exactly what people come looking for once
 * it's over, and this is the page they check for that.
 */
function OzhFeature({ hasResult }: { hasResult: boolean }) {
  const state = windowStateAt(new Date());

  if (state === "CLOSED") {
    return (
      <Card className="mb-8 border-white/8 bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge tone="zinc" className="mb-3">Concluded</Badge>
            <p className="text-2xl font-black tracking-tight">OPERATION ZERO HOUR</p>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-400">
              The operation has concluded. Ranks, awards, and every analyst's debrief are final.
            </p>
          </div>
          <Link
            href={hasResult ? "/operations/zero-hour/result" : "/operations/zero-hour/leaderboard"}
            className={buttonVariants({ variant: "primary" })}
          >
            {hasResult ? "View your result" : "View final leaderboard"}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-8 border-red-500/25 bg-gradient-to-br from-red-500/[0.07] to-transparent p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone={state === "OPEN" ? "red" : "blue"} className="mb-3">
            {state === "OPEN" ? "⚠ Live now" : "Opens soon"}
          </Badge>
          <p className="text-2xl font-black tracking-tight">OPERATION ZERO HOUR</p>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-400">
            A single three-hour incident, investigated alone. Six phases, 1,000 points, one
            attempt — and the evidence you are given is not the evidence anyone else gets.
          </p>
          <p className="mt-3 text-xs text-zinc-500">
            {state === "OPEN" ? "Closes" : "Opens"}{" "}
            {formatIST(state === "OPEN" ? OZH_CLOSES_AT : OZH_OPENS_AT)} IST
          </p>
        </div>
        <Link href="/operations/zero-hour" className={buttonVariants({ variant: "primary" })}>
          {state === "OPEN" ? "Enter the operation" : "Read the briefing"}
        </Link>
      </div>
    </Card>
  );
}

export default async function ChampionshipHubPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [active, past, ozhRun, myAwards] = await Promise.all([
    getActiveChampionship(),
    listChampionships(12),
    getRunState(user.id),
    db.championshipAward.findMany({
      where: { userId: user.id },
      include: { championship: { select: { title: true, slug: true } } },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  const myActiveEntry = active
    ? await db.championshipEntry.findUnique({
        where: { championshipId_userId: { championshipId: active.id, userId: user.id } },
      })
    : null;

  const concluded = past.filter((c) => c.status === "CONCLUDED");

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Monthly Championship"
          subtitle="One challenge set, one month, one leaderboard. The podium and top finalists earn a verifiable certificate."
        />

        <OzhFeature hasResult={!!ozhRun && ozhRun.status !== "IN_PROGRESS"} />


        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="This month"
            value={active ? `${daysLeft(active.endsAt)}d` : "—"}
            sub={active ? "remaining" : "none running"}
          />
          <StatCard
            label="Your score"
            value={myActiveEntry?.score ?? "—"}
            sub={myActiveEntry ? `${myActiveEntry.solved} solved` : "not entered"}
          />
          <StatCard label="Certificates" value={myAwards.length} sub="earned" />
          <StatCard label="Past events" value={concluded.length} sub="concluded" />
        </div>

        {/* ── Current ── */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Running now
          </h2>

          {!active ? (
            <EmptyState
              icon="trophy"
              title="No championship is running"
              description="A new championship opens on the first of each month. Check back then, or keep sharpening up in the labs."
              action={{ label: "Browse Labs", href: "/labs" }}
            />
          ) : (
            <Card className="p-6" interactive>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/championship/${active.slug}`}
                    className="text-xl font-bold hover:text-emerald-400"
                  >
                    {active.title}
                  </Link>
                  <p className="mt-1 max-w-xl text-sm text-zinc-400">{active.description}</p>
                  <p className="mt-3 text-xs text-zinc-600">
                    {(active.labSlugs as string[]).length} challenges ·{" "}
                    closes {active.endsAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone="emerald">{daysLeft(active.endsAt)} days left</Badge>
                  {myActiveEntry && (
                    <p className="mt-2 font-mono text-2xl font-black tabular-nums text-emerald-400">
                      {myActiveEntry.score}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </section>

        {/* ── Your certificates ── */}
        {myAwards.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Your championship certificates
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {myAwards.map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Icon name="trophy" size={18} />
                      {a.championship.title}
                    </span>
                    <Badge tone={TIER_TONE[a.tier]}>{a.tier}</Badge>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Placed #{a.rank} · issued {a.issuedAt.toLocaleDateString("en-GB")}
                  </p>
                  <Link
                    href={`/championship/certificate/${a.certCode}`}
                    className="mt-2 block font-mono text-xs text-emerald-400 hover:underline"
                  >
                    {a.certCode} →
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Past ── */}
        {concluded.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Past championships
            </h2>
            <Card className="divide-y divide-white/5 p-0">
              {concluded.map((c) => (
                <Link
                  key={c.id}
                  href={`/championship/${c.slug}`}
                  className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/3"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{c.title}</p>
                    <p className="text-xs text-zinc-600">
                      {c._count.entries} entrant{c._count.entries === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Icon name="chevronRight" size={16} />
                </Link>
              ))}
            </Card>
          </section>
        )}
      </div>
    </main>
  );
}
