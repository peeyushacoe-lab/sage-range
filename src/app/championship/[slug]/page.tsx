import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  getChampionshipBySlug,
  getLeaderboard,
  syncEntryScore,
} from "@/lib/championships";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { JoinChampionshipButton } from "./_components/join-button";

export const dynamic = "force-dynamic";

const TIER_TONE = {
  CHAMPION: "amber",
  MEDALLIST: "purple",
  FINALIST: "blue",
  COMPETITOR: "zinc",
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getChampionshipBySlug(slug);
  return { title: c ? `${c.title} · Sage Vault` : "Championship · Sage Vault" };
}

export default async function ChampionshipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const championship = await getChampionshipBySlug(slug);
  if (!championship || !championship.published) notFound();

  const myEntry = await db.championshipEntry.findUnique({
    where: { championshipId_userId: { championshipId: championship.id, userId: user.id } },
  });

  // Refresh the viewer's own score on load so the board is current for them
  // without re-scoring every entrant on every request. The cron handles the
  // rest, and the conclusion re-syncs everyone before freezing ranks.
  if (myEntry && championship.status === "ACTIVE") {
    await syncEntryScore(championship.id, user.id);
  }

  const [board, labs, awards] = await Promise.all([
    getLeaderboard(championship.id, 100),
    db.lab.findMany({
      where: { slug: { in: championship.labSlugs as string[] } },
      select: { slug: true, title: true, difficulty: true, points: true },
      orderBy: { title: "asc" },
    }),
    championship.status === "CONCLUDED"
      ? db.championshipAward.findMany({
          where: { championshipId: championship.id },
          select: { userId: true, tier: true, certCode: true, rank: true },
        })
      : Promise.resolve([]),
  ]);

  const awardByUser = new Map(awards.map((a) => [a.userId, a]));
  const myRow = board.find((r) => r.userId === user.id);
  const myAward = awardByUser.get(user.id);

  const isOpen =
    championship.status === "ACTIVE" && new Date() <= championship.endsAt;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/championship"
          className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          ← All championships
        </Link>

        <PageHeader
          className="mb-6 mt-3"
          title={championship.title}
          subtitle={championship.description}
          actions={
            <Badge tone={championship.status === "ACTIVE" ? "emerald" : "zinc"}>
              {championship.status}
            </Badge>
          }
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Challenges" value={labs.length} sub="in the set" />
          <StatCard label="Entrants" value={board.length} sub="on the board" />
          <StatCard
            label="Your score"
            value={myRow?.score ?? myEntry?.score ?? "—"}
            sub={myEntry ? `${myEntry.solved} solved` : "not entered"}
          />
          <StatCard
            label="Your rank"
            value={myRow ? `#${myRow.rank}` : "—"}
            sub={championship.status === "CONCLUDED" ? "final" : "live"}
          />
        </div>

        {/* Entry / award state */}
        {myAward ? (
          <Card className="mb-8 border-emerald-500/30 bg-emerald-500/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  You placed #{myAward.rank ?? myRow?.rank} — {myAward.tier}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Your certificate is verifiable at the code below.
                </p>
              </div>
              <Link
                href={`/championship/certificate/${myAward.certCode}`}
                className="font-mono text-sm text-emerald-400 hover:underline"
              >
                {myAward.certCode} →
              </Link>
            </div>
          </Card>
        ) : (
          isOpen &&
          !myEntry && (
            <Card className="mb-8 p-6 text-center">
              <p className="text-sm text-zinc-400">
                Enter the championship to appear on the leaderboard. Solves in the
                challenge set count from the moment the month opened.
              </p>
              <div className="mt-4">
                <JoinChampionshipButton slug={championship.slug} />
              </div>
            </Card>
          )
        )}

        {/* ── Leaderboard ── */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            {championship.status === "CONCLUDED" ? "Final standings" : "Live leaderboard"}
          </h2>

          {board.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-zinc-500">
                No entrants yet. Be the first on the board.
              </p>
            </Card>
          ) : (
            <div className="divide-y divide-white/8 rounded-lg border border-white/10">
              <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-wider text-zinc-600">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Entrant</span>
                <span className="col-span-3">Institution</span>
                <span className="col-span-1 text-center">Solved</span>
                <span className="col-span-2 text-right">Score</span>
              </div>
              {board.map((row) => {
                const isMe = row.userId === user.id;
                const award = awardByUser.get(row.userId);
                return (
                  <div
                    key={row.userId}
                    className={`grid grid-cols-12 items-center px-4 py-3 ${
                      isMe ? "border-l-2 border-emerald-500 bg-emerald-500/5" : "hover:bg-white/3"
                    }`}
                  >
                    <span className="col-span-1 font-mono text-xs tabular-nums text-zinc-500">
                      {row.rank}
                    </span>
                    <span className="col-span-5 flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm text-zinc-200">
                        {row.entry.user.displayName ??
                          row.entry.user.email.split("@")[0]}
                      </span>
                      {award && (
                        <Badge tone={TIER_TONE[award.tier]}>{award.tier}</Badge>
                      )}
                    </span>
                    <span className="col-span-3 truncate text-xs text-zinc-500">
                      {row.entry.user.university ?? "—"}
                    </span>
                    <span className="col-span-1 text-center text-xs text-zinc-500">
                      {row.entry.solved}
                    </span>
                    <span className="col-span-2 text-right text-sm font-semibold text-emerald-400">
                      {row.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Challenge set ── */}
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Challenge set
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {labs.map((lab) => (
              <Card key={lab.slug} className="p-4" interactive>
                <Link href={`/labs/${lab.slug}`} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm text-zinc-200 hover:text-emerald-400">
                    {lab.title}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {lab.difficulty} · {lab.points}
                  </span>
                </Link>
              </Card>
            ))}
          </div>
          {labs.length === 0 && (
            <Card className="p-6">
              <p className="text-sm text-zinc-500">
                The challenge set references labs that are no longer published.
              </p>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
