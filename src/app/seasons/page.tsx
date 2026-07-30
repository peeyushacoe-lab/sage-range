import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getActiveSeason, getSeasonLeaderboard, getPlayerStanding } from "@/lib/seasons";
import { getSquadSeasonLeaderboard } from "@/lib/squads";
import { Navbar } from "@/components/navbar";
import { PageHeader, EmptyState, Card, StatCard, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Tier } from "@prisma/client";

export const dynamic = "force-dynamic";

const TIER_TONE: Record<Tier, "emerald" | "blue" | "amber" | "red" | "zinc" | "purple"> = {
  MASTER: "purple",
  DIAMOND: "blue",
  PLATINUM: "emerald",
  GOLD: "amber",
  SILVER: "zinc",
  BRONZE: "zinc",
};

export default async function SeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: scopeParam } = await searchParams;
  const scope = scopeParam === "squad" ? "squad" : "solo";

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const season = await getActiveSeason();

  if (!season) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <div className="mx-auto max-w-5xl px-6 py-8">
          <PageHeader
            className="mb-6"
            title="Ranked Season"
            subtitle="Climb the ladder by winning tournaments and weekly cases."
          />
          <EmptyState
            icon="trophy"
            title="No season is running"
            description="The next ranked season has not started yet. Ratings carry over, so your standing is safe."
          />
        </div>
      </main>
    );
  }

  const [standing, soloEntries, squadEntries] = await Promise.all([
    getPlayerStanding(season.id, user.id),
    scope === "solo" ? getSeasonLeaderboard(season.id, 100) : Promise.resolve([]),
    scope === "squad" ? getSquadSeasonLeaderboard(season.id, 100) : Promise.resolve([]),
  ]);

  const daysLeft = Math.max(
    0,
    Math.ceil((season.endsAt.getTime() - Date.now()) / 86_400_000),
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title={season.name}
          subtitle="Ratings move on every ranked result. Tiers are derived from rating, and the ladder recompresses between seasons."
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Your rating"
            value={standing?.rating ?? "—"}
            sub={standing ? `peak ${standing.peakRating}` : "unrated"}
          />
          <StatCard
            label="Tier"
            value={standing?.tier ?? "—"}
            sub={standing ? `rank #${standing.rank ?? "—"}` : "play to rank"}
          />
          <StatCard
            label="Record"
            value={standing ? `${standing.wins}-${standing.losses}` : "0-0"}
            sub={`${standing?.eventsPlayed ?? 0} events`}
          />
          <StatCard label="Season ends" value={`${daysLeft}d`} sub="ratings carry over" />
        </div>

        <nav className="mb-6 flex gap-2">
          {(["solo", "squad"] as const).map((s) => (
            <Link
              key={s}
              href={`/seasons?scope=${s}`}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                scope === s
                  ? "bg-emerald-500 text-black"
                  : "border border-white/10 text-zinc-400 hover:border-white/30 hover:text-white",
              )}
            >
              {s === "solo" ? "Players" : "Squads"}
            </Link>
          ))}
        </nav>

        {scope === "solo" ? (
          soloEntries.length === 0 ? (
            <EmptyState
              icon="leaderboard"
              title="Nobody is rated yet"
              description="The ladder fills up as ranked results come in."
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-zinc-500">
                      <th className="px-5 py-3 font-semibold">Rank</th>
                      <th className="px-5 py-3 font-semibold">Player</th>
                      <th className="px-5 py-3 font-semibold">Tier</th>
                      <th className="px-5 py-3 text-right font-semibold">Rating</th>
                      <th className="px-5 py-3 text-right font-semibold">W–L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soloEntries.map((entry) => {
                      const isMe = entry.userId === user.id;
                      return (
                        <tr
                          key={entry.userId}
                          className={cn(
                            "border-t border-white/5 transition hover:bg-zinc-900/50",
                            isMe && "bg-emerald-500/10",
                          )}
                        >
                          <td className="px-5 py-4 font-mono font-bold text-zinc-400">
                            #{entry.rank}
                          </td>
                          <td className="px-5 py-4 font-medium">
                            {entry.displayName}
                            {isMe && <span className="ml-2 text-xs text-zinc-500">(you)</span>}
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone={TIER_TONE[entry.tier]}>{entry.tier}</Badge>
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                            {entry.rating}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-zinc-300">
                            {entry.wins}–{entry.losses}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )
        ) : squadEntries.length === 0 ? (
          <EmptyState
            icon="users"
            title="No squads have scored yet"
            description="Squad points accumulate through team tournaments."
            action={{ label: "Browse squads", href: "/squads" }}
          />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-xs uppercase tracking-widest text-zinc-500">
                    <th className="px-5 py-3 font-semibold">Rank</th>
                    <th className="px-5 py-3 font-semibold">Squad</th>
                    <th className="px-5 py-3 text-right font-semibold">Points</th>
                    <th className="px-5 py-3 text-right font-semibold">W–L</th>
                  </tr>
                </thead>
                <tbody>
                  {squadEntries.map((entry) => (
                    <tr
                      key={entry.squadId}
                      className="border-t border-white/5 transition hover:bg-zinc-900/50"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-zinc-400">
                        #{entry.rank}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/squads/${entry.slug}`}
                          className="font-medium hover:text-emerald-400"
                        >
                          <span className="text-zinc-500">[{entry.tag}]</span> {entry.name}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400">
                        {entry.points}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-zinc-300">
                        {entry.wins}–{entry.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
