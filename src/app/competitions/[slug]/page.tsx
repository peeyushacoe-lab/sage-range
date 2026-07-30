import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinCompetitionBtn } from "../_components/join-btn";
import { Countdown } from "./_components/countdown";
import { Navbar } from "@/components/navbar";
import { createNotification } from "@/lib/notifications";

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

const MEDAL_TONE = ["gold", "slate", "amber"] as const;

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const competition = await db.competition.findUnique({
    where: { slug, published: true },
    include: {
      entries: {
        where: { user: { hidden: false } },
        orderBy: { score: "desc" },
        include: {
          user: { select: { displayName: true, email: true, university: true } },
        },
      },
    },
  });

  if (!competition) notFound();

  const status = getStatus(competition.startDate, competition.endDate);
  const userEntry = competition.entries.find((e) => e.userId === user.id);
  const labSlugs = competition.labSlugs as string[];
  const now = new Date();
  const isFrozen = !!competition.freezeAt && now >= competition.freezeAt && now < competition.endDate;

  // Count completed labs per entry
  const entrantIds = competition.entries.map((e) => e.userId);
  const labCompletions = await db.labResponse.findMany({
    where: { userId: { in: entrantIds }, lab: { slug: { in: labSlugs } } },
    select: { userId: true, labId: true },
    distinct: ["userId", "labId"],
  });

  const completionsByUser = new Map<string, number>();
  for (const lc of labCompletions) {
    completionsByUser.set(lc.userId, (completionsByUser.get(lc.userId) ?? 0) + 1);
  }

  // Auto-notify winners when competition ends (idempotent)
  if (status === "Ended" && competition.entries.length > 0) {
    const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
    for (let i = 0; i < Math.min(3, competition.entries.length); i++) {
      const entry = competition.entries[i];
      const existing = await db.notification.findFirst({
        where: { userId: entry.userId, type: "competition_win", href: `/competitions/${slug}` },
      });
      if (!existing) {
        createNotification(
          entry.userId,
          "competition_win",
          `${medals[i]} — ${competition.name}`,
          `Final score: ${entry.score} pts${competition.prizeDesc ? ` · ${competition.prizeDesc}` : ""}`,
          `/competitions/${slug}`
        ).catch(() => null);
      }
    }
  }

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar backHref="/competitions" backLabel="Competitions" />
      <div className="p-8 max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusBadge(status)}`}>
              {status}
            </span>
            {isFrozen && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-info-edge bg-info-wash font-semibold text-info">
                Scoreboard Frozen
              </span>
            )}
            <span className="text-xs text-ink-3">{labSlugs.length} lab{labSlugs.length !== 1 ? "s" : ""}</span>
          </div>
          <h1 className="text-3xl font-bold">{competition.name}</h1>
          <p className="text-ink-2 mt-2">{competition.description}</p>
          {competition.prizeDesc && (
            <p className="mt-2 text-sm text-warn font-medium flex items-center gap-1.5"><Icon name="trophy" size={15} /> {competition.prizeDesc}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            {status === "Upcoming" && (
              <Countdown targetIso={competition.startDate.toISOString()} label="Starts in" />
            )}
            {status === "Active" && !isFrozen && (
              <Countdown targetIso={competition.endDate.toISOString()} label="Ends in" urgentMs={3600000} />
            )}
            {isFrozen && competition.endDate && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-info-edge bg-info-wash px-4 py-2.5">
                <span className="text-xs text-info">Final results reveal in</span>
                <Countdown targetIso={competition.endDate.toISOString()} label="" urgentMs={0} />
              </div>
            )}
          </div>
          <div className="flex gap-6 mt-3 text-xs text-ink-3">
            <span>Start: {competition.startDate.toISOString().slice(0, 10)}</span>
            <span>End: {competition.endDate.toISOString().slice(0, 10)}</span>
          </div>
        </div>

        {/* Winner podium for ended competitions */}
        {status === "Ended" && competition.entries.length > 0 && (
          <section className="rounded-2xl border border-warn-edge bg-warn-wash p-6">
            <p className="text-xs uppercase tracking-widest text-ink-3/70 mb-4">Final Results</p>
            <div className="flex flex-wrap gap-4">
              {competition.entries.slice(0, 3).map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex-1 min-w-[160px] rounded-xl border p-4 text-center ${
                    i === 0
                      ? "border-warn-edge bg-warn-wash"
                      : i === 1
                      ? "border-edge-strong/30 bg-surface-2/50"
                      : "border-warn-edge bg-warn-wash"
                  }`}
                >
                  <p className="text-2xl mb-2"><Icon name="medal" size={16} tone={MEDAL_TONE[i]} /></p>
                  <p className="text-sm font-semibold text-ink truncate">
                    {entry.user.displayName ?? entry.user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-ink-3 mt-0.5">{entry.user.university ?? ""}</p>
                  <p className="text-lg font-bold text-warn mt-2">{entry.score} pts</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scoring explanation for active */}
        {status === "Active" && (
          <div className="rounded-xl border border-edge bg-surface-1 p-5">
            <h2 className="text-sm font-semibold text-ink-2 mb-2">How Scoring Works</h2>
            <ul className="space-y-1 text-sm text-ink-2">
              <li className="flex gap-2"><span className="text-ok">+10 pts</span> for each lab stage completed</li>
              <li className="flex gap-2"><span className="text-ok">+50 pts</span> bonus for completing a full lab</li>
            </ul>
            <p className="text-xs text-ink-3 mt-3">
              Competition labs: {labSlugs.map((s) => (
                <Link key={s} href={`/labs/${s}`} className="hover:text-ink-2 transition underline decoration-white/10 mr-2">{s}</Link>
              ))}
            </p>
          </div>
        )}

        {/* Join CTA */}
        {status === "Active" && !userEntry && (
          <div className="rounded-xl border border-ok-edge bg-ok-wash p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ok">Join this Competition</p>
              <p className="text-sm text-ink-2 mt-1">Enter to appear on the leaderboard and compete for the top spot.</p>
            </div>
            <JoinCompetitionBtn slug={slug} label="Enter Competition" />
          </div>
        )}

        {/* Your rank card */}
        {userEntry && status !== "Ended" && (
          <div className="rounded-xl border border-edge bg-surface-1 p-4 flex items-center gap-8">
            <div>
              <p className="text-xs text-ink-3 mb-0.5">Your Score</p>
              <p className="text-2xl font-bold text-ok">{userEntry.score} pts</p>
            </div>
            <div>
              <p className="text-xs text-ink-3 mb-0.5">Your Rank</p>
              <p className="text-2xl font-bold">
                #{competition.entries.findIndex((e) => e.userId === user.id) + 1}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-3 mb-0.5">Labs Done</p>
              <p className="text-2xl font-bold">{completionsByUser.get(user.id) ?? 0}/{labSlugs.length}</p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm uppercase tracking-widest text-ink-3">Leaderboard</h2>
            {isFrozen && (
              <span className="text-[10px] font-bold uppercase text-info border border-info-edge rounded px-1.5 py-0.5">
                Frozen
              </span>
            )}
          </div>
          {competition.entries.length === 0 ? (
            <p className="text-ink-3 text-sm">No participants yet. Be the first to enter!</p>
          ) : (
            <div className="rounded-lg border border-edge divide-y divide-edge-subtle">
              <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-wider text-ink-3">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Student</span>
                <span className="col-span-3">University</span>
                <span className="col-span-2 text-center">Labs</span>
                <span className="col-span-1 text-right">Score</span>
              </div>
              {competition.entries.map((entry, i) => {
                const isMe = entry.userId === user.id;
                const labsDone = completionsByUser.get(entry.userId) ?? 0;
                const medal = MEDAL_TONE[i];
                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 items-center px-4 py-3 ${isMe ? "bg-ok-wash border-l-2 border-ok-edge" : "hover:bg-surface-2"}`}
                  >
                    <span className={`col-span-1 text-sm font-bold ${i === 0 ? "text-warn" : i === 1 ? "text-ink-2" : i === 2 ? "text-warn" : "text-ink-3"}`}>
                      {medal ?? i + 1}
                    </span>
                    <div className="col-span-5">
                      <p className={`text-sm font-medium ${isMe ? "text-ok" : "text-ink"}`}>
                        {entry.user.displayName ?? entry.user.email.split("@")[0]}
                        {isMe && <span className="ml-1.5 text-xs text-ok">(you)</span>}
                      </p>
                    </div>
                    <p className="col-span-3 text-xs text-ink-3">{entry.user.university ?? "—"}</p>
                    <p className="col-span-2 text-center text-sm text-ink-2">{labsDone}/{labSlugs.length}</p>
                    <p className="col-span-1 text-right text-sm font-semibold text-ok">{entry.score}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
