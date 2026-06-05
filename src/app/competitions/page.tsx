import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinCompetitionBtn } from "./_components/join-btn";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

function getStatus(startDate: Date, endDate: Date): "Upcoming" | "Active" | "Ended" {
  const now = new Date();
  if (now < startDate) return "Upcoming";
  if (now > endDate) return "Ended";
  return "Active";
}

function statusBadge(status: ReturnType<typeof getStatus>) {
  if (status === "Active") return "bg-sage-500/20 text-sage-500 border-sage-500/30";
  if (status === "Upcoming") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-zinc-700/50 text-zinc-400 border-zinc-700";
}

export default async function CompetitionsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const competitions = await db.competition.findMany({
    where: { published: true },
    orderBy: { startDate: "asc" },
    include: {
      entries: {
        orderBy: { score: "desc" },
        take: 3,
        include: { user: { select: { displayName: true, email: true } } },
      },
    },
  });

  const userEntryIds = new Set(
    (
      await db.competitionEntry.findMany({
        where: { userId: user.id },
        select: { competitionId: true },
      })
    ).map((e) => e.competitionId)
  );

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Competitions</h1>
      <p className="text-zinc-500 mb-8 text-sm">
        Compete against other students. Complete assigned labs to earn points.
      </p>

      {competitions.length === 0 ? (
        <p className="text-zinc-500 text-sm">No competitions available yet. Check back soon.</p>
      ) : (
        <div className="space-y-5">
          {competitions.map((comp) => {
            const status = getStatus(comp.startDate, comp.endDate);
            const isEntered = userEntryIds.has(comp.id);
            const labCount = (comp.labSlugs as string[]).length;

            return (
              <div
                key={comp.id}
                className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusBadge(status)}`}
                      >
                        {status}
                      </span>
                      <span className="text-xs text-zinc-600">{labCount} lab{labCount !== 1 ? "s" : ""}</span>
                    </div>
                    <Link
                      href={`/competitions/${comp.slug}`}
                      className="text-lg font-semibold text-zinc-100 hover:text-sage-400 transition"
                    >
                      {comp.name}
                    </Link>
                    <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{comp.description}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500 shrink-0">
                    <p>{comp.startDate.toISOString().slice(0, 10)}</p>
                    <p className="text-zinc-600">→ {comp.endDate.toISOString().slice(0, 10)}</p>
                  </div>
                </div>

                {/* Leaderboard preview for active */}
                {status === "Active" && comp.entries.length > 0 && (
                  <div className="rounded-lg border border-white/8 divide-y divide-white/5">
                    {comp.entries.map((entry, i) => (
                      <div key={entry.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-zinc-600 w-4">{i + 1}</span>
                          <p className="text-sm font-medium text-zinc-300">
                            {entry.user.displayName ?? entry.user.email.split("@")[0]}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-sage-500">
                          {entry.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Winner for ended */}
                {status === "Ended" && comp.entries[0] && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center gap-3">
                    <span className="text-amber-400 text-base">🏆</span>
                    <div>
                      <p className="text-xs text-zinc-500">Winner</p>
                      <p className="text-sm font-semibold text-amber-400">
                        {comp.entries[0].user.displayName ?? comp.entries[0].user.email.split("@")[0]}
                      </p>
                    </div>
                    <span className="ml-auto text-sm font-semibold text-zinc-400">
                      {comp.entries[0].score} pts
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/competitions/${comp.slug}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition"
                  >
                    View Details →
                  </Link>
                  {status === "Active" && !isEntered && (
                    <JoinCompetitionBtn slug={comp.slug} />
                  )}
                  {status === "Active" && isEntered && (
                    <span className="text-xs text-sage-500 font-medium">Entered</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </main>
  );
}
