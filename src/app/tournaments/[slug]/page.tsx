import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getTournamentBySlug } from "@/lib/tournaments";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Round labels read better counting back from the final. */
function roundLabel(round: number, totalRounds: number): string {
  const fromEnd = totalRounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const tournament = await getTournamentBySlug(slug);
  if (!tournament) notFound();

  const nameFor = (entrantId: string | null): string | null => {
    if (!entrantId) return null;
    const e = tournament.entrants.find((x) => x.id === entrantId);
    if (!e) return null;
    return e.squad
      ? `[${e.squad.tag}] ${e.squad.name}`
      : (e.user?.displayName ?? e.user?.email ?? "Unknown");
  };

  const rounds = [...new Set(tournament.matches.map((m) => m.round))].sort((a, b) => a - b);
  const totalRounds = rounds.length > 0 ? Math.max(...rounds) : 0;
  const champion = tournament.entrants.find((e) => e.finalRank === 1);

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar backHref="/tournaments" backLabel="Tournaments" />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title={tournament.name}
          subtitle={tournament.description ?? undefined}
          actions={<Badge tone="blue">{tournament.status.replace("_", " ")}</Badge>}
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Format" value={tournament.entrantType === "SQUAD" ? "Squads" : "Solo"} />
          <StatCard
            label="Entrants"
            value={tournament.entrants.length}
            sub={`of ${tournament.maxEntrants}`}
          />
          <StatCard label="Rounds" value={totalRounds || "—"} />
          <StatCard
            label="Champion"
            value={champion ? (nameFor(champion.id) ?? "—") : "—"}
            sub={tournament.completedAt ? "decided" : "in play"}
          />
        </div>

        {tournament.matches.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="The bracket is not drawn yet"
            description="Seeding is generated from season ratings once registration closes."
          />
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4">
            {rounds.map((round) => (
              <section key={round} className="min-w-[260px] flex-1">
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-3">
                  {roundLabel(round, totalRounds)}
                </h2>
                <div className="flex flex-col gap-3">
                  {tournament.matches
                    .filter((m) => m.round === round)
                    .sort((a, b) => a.position - b.position)
                    .map((match) => {
                      const a = nameFor(match.entrantAId);
                      const b = nameFor(match.entrantBId);
                      return (
                        <Card key={match.id} className="p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] uppercase tracking-widest text-ink-3">
                              Match {match.position}
                            </span>
                            {match.status === "WALKOVER" && (
                              <span className="text-[10px] uppercase tracking-widest text-ink-3">
                                bye
                              </span>
                            )}
                          </div>

                          {[
                            { id: match.entrantAId, name: a, score: match.scoreA },
                            { id: match.entrantBId, name: b, score: match.scoreB },
                          ].map((side, i) => {
                            const won = match.winnerId && match.winnerId === side.id;
                            const lost = match.winnerId && side.id && !won;
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm",
                                  won && "bg-ok-wash font-semibold text-ok",
                                  lost && "text-ink-3",
                                  !side.name && "text-ink-3 italic",
                                )}
                              >
                                <span className="truncate">{side.name ?? "TBD"}</span>
                                {match.winnerId && (
                                  <span className="shrink-0 font-mono text-xs">{side.score}</span>
                                )}
                              </div>
                            );
                          })}
                        </Card>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
