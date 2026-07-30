import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listTournaments } from "@/lib/tournaments";
import { Navbar } from "@/components/navbar";
import { PageHeader, EmptyState, Card, Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import type { TournamentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<TournamentStatus, "emerald" | "blue" | "amber" | "zinc" | "red"> = {
  REGISTRATION: "emerald",
  IN_PROGRESS: "blue",
  COMPLETED: "zinc",
  DRAFT: "zinc",
  CANCELLED: "red",
};

const STATUS_LABEL: Record<TournamentStatus, string> = {
  REGISTRATION: "Open",
  IN_PROGRESS: "Live",
  COMPLETED: "Finished",
  DRAFT: "Draft",
  CANCELLED: "Cancelled",
};

export default async function TournamentsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const tournaments = await listTournaments();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Tournaments"
          subtitle="Single-elimination events for solo players and squads. Seeding follows your season rating."
        />

        {tournaments.length === 0 ? (
          <EmptyState
            icon="trophy"
            title="No tournaments scheduled"
            description="New brackets open for registration throughout the season."
            action={{ label: "View the ladder", href: "/seasons" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => {
              const full = t._count.entrants >= t.maxEntrants;
              return (
                <Card key={t.id} className="flex flex-col gap-3 p-5" interactive>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/tournaments/${t.slug}`}
                      className="text-base font-semibold hover:text-emerald-400"
                    >
                      {t.name}
                    </Link>
                    <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>

                  {t.description && (
                    <p className="line-clamp-2 text-sm text-zinc-400">{t.description}</p>
                  )}

                  <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Icon name={t.entrantType === "SQUAD" ? "users" : "user"} size={14} />
                      {t.entrantType === "SQUAD" ? "Squads" : "Solo"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Icon name="leaderboard" size={14} />
                      {t._count.entrants} / {t.maxEntrants}
                      {full && <span className="text-amber-400">full</span>}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 text-xs text-zinc-600">
                    <Icon name="clock" size={14} />
                    starts{" "}
                    {t.startsAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
