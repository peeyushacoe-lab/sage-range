import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinCompetitionBtn } from "./_components/join-btn";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

function getStatus(startDate: Date, endDate: Date): "Upcoming" | "Active" | "Ended" {
  const now = new Date();
  if (now < startDate) return "Upcoming";
  if (now > endDate) return "Ended";
  return "Active";
}

function statusBadge(status: ReturnType<typeof getStatus>) {
  if (status === "Active") return "bg-ok-wash text-ok border-ok-edge";
  if (status === "Upcoming") return "bg-warn-wash text-warn border-warn-edge";
  return "bg-surface-3/50 text-ink-2 border-edge-strong";
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
      <PageHeader
        className="mb-8"
        title="Competitions"
        subtitle="Compete against other students. Complete assigned labs to earn points."
      />

      {competitions.length === 0 ? (
        <EmptyState
          icon="trophy"
          title="No competitions available yet"
          description="Check back soon, or sharpen up in the meantime with individual labs."
          action={{ label: "Browse Labs", href: "/labs" }}
        />
      ) : (
        <div className="space-y-5">
          {competitions.map((comp) => {
            const status = getStatus(comp.startDate, comp.endDate);
            const isEntered = userEntryIds.has(comp.id);
            const labCount = (comp.labSlugs as string[]).length;

            return (
              <div
                key={comp.id}
                className="rounded-xl border border-edge bg-surface-1 p-6 space-y-4"
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
                      <span className="text-xs text-ink-3">{labCount} lab{labCount !== 1 ? "s" : ""}</span>
                    </div>
                    <Link
                      href={`/competitions/${comp.slug}`}
                      className="text-lg font-semibold text-ink hover:text-ok transition"
                    >
                      {comp.name}
                    </Link>
                    <p className="text-sm text-ink-2 mt-1 line-clamp-2">{comp.description}</p>
                  </div>
                  <div className="text-right text-xs text-ink-3 shrink-0">
                    <p>{comp.startDate.toISOString().slice(0, 10)}</p>
                    <p className="text-ink-3">→ {comp.endDate.toISOString().slice(0, 10)}</p>
                  </div>
                </div>

                {/* Leaderboard preview for active */}
                {status === "Active" && comp.entries.length > 0 && (
                  <div className="rounded-lg border border-edge divide-y divide-edge-subtle">
                    {comp.entries.map((entry, i) => (
                      <div key={entry.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-ink-3 w-4">{i + 1}</span>
                          <p className="text-sm font-medium text-ink-2">
                            {entry.user.displayName ?? entry.user.email.split("@")[0]}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-ok">
                          {entry.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Winner for ended */}
                {status === "Ended" && comp.entries[0] && (
                  <div className="rounded-lg border border-warn-edge bg-warn-wash px-4 py-3 flex items-center gap-3">
                    <Icon name="trophy" size={16} tone="gold" />
                    <div>
                      <p className="text-xs text-ink-3">Winner</p>
                      <p className="text-sm font-semibold text-warn">
                        {comp.entries[0].user.displayName ?? comp.entries[0].user.email.split("@")[0]}
                      </p>
                    </div>
                    <span className="ml-auto text-sm font-semibold text-ink-2">
                      {comp.entries[0].score} pts
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/competitions/${comp.slug}`}
                    className="text-xs px-3 py-1.5 rounded-lg border border-edge text-ink-2 hover:text-white hover:border-edge-strong transition"
                  >
                    View Details →
                  </Link>
                  {status === "Active" && !isEntered && (
                    <JoinCompetitionBtn slug={comp.slug} />
                  )}
                  {status === "Active" && isEntered && (
                    <span className="text-xs text-ok font-medium">Entered</span>
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
