import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinCompetitionBtn } from "../_components/join-btn";
import { Countdown } from "./_components/countdown";
import { Navbar } from "@/components/navbar";
import { createNotification } from "@/lib/notifications";

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

const MEDAL = ["🥇", "🥈", "🥉"];

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
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/competitions" backLabel="Competitions" />
      <div className="p-8 max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusBadge(status)}`}>
              {status}
            </span>
            {isFrozen && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 font-semibold text-blue-400">
                Scoreboard Frozen
              </span>
            )}
            <span className="text-xs text-zinc-600">{labSlugs.length} lab{labSlugs.length !== 1 ? "s" : ""}</span>
          </div>
          <h1 className="text-3xl font-bold">{competition.name}</h1>
          <p className="text-zinc-400 mt-2">{competition.description}</p>
          {competition.prizeDesc && (
            <p className="mt-2 text-sm text-amber-400 font-medium">🏆 {competition.prizeDesc}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            {status === "Upcoming" && (
              <Countdown targetIso={competition.startDate.toISOString()} label="Starts in" />
            )}
            {status === "Active" && !isFrozen && (
              <Countdown targetIso={competition.endDate.toISOString()} label="Ends in" urgentMs={3600000} />
            )}
            {isFrozen && competition.endDate && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-2.5">
                <span className="text-xs text-blue-400">Final results reveal in</span>
                <Countdown targetIso={competition.endDate.toISOString()} label="" urgentMs={0} />
              </div>
            )}
          </div>
          <div className="flex gap-6 mt-3 text-xs text-zinc-600">
            <span>Start: {competition.startDate.toISOString().slice(0, 10)}</span>
            <span>End: {competition.endDate.toISOString().slice(0, 10)}</span>
          </div>
        </div>

        {/* Winner podium for ended competitions */}
        {status === "Ended" && competition.entries.length > 0 && (
          <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
            <p className="text-xs uppercase tracking-widest text-amber-500/70 mb-4">Final Results</p>
            <div className="flex flex-wrap gap-4">
              {competition.entries.slice(0, 3).map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex-1 min-w-[160px] rounded-xl border p-4 text-center ${
                    i === 0
                      ? "border-amber-400/40 bg-amber-400/8"
                      : i === 1
                      ? "border-zinc-400/30 bg-zinc-800/50"
                      : "border-amber-700/30 bg-amber-900/10"
                  }`}
                >
                  <p className="text-2xl mb-2">{MEDAL[i]}</p>
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {entry.user.displayName ?? entry.user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{entry.user.university ?? ""}</p>
                  <p className="text-lg font-bold text-amber-400 mt-2">{entry.score} pts</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scoring explanation for active */}
        {status === "Active" && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-2">How Scoring Works</h2>
            <ul className="space-y-1 text-sm text-zinc-400">
              <li className="flex gap-2"><span className="text-sage-500">+10 pts</span> for each lab stage completed</li>
              <li className="flex gap-2"><span className="text-sage-500">+50 pts</span> bonus for completing a full lab</li>
            </ul>
            <p className="text-xs text-zinc-600 mt-3">
              Competition labs: {labSlugs.map((s) => (
                <Link key={s} href={`/labs/${s}`} className="hover:text-zinc-400 transition underline decoration-white/10 mr-2">{s}</Link>
              ))}
            </p>
          </div>
        )}

        {/* Join CTA */}
        {status === "Active" && !userEntry && (
          <div className="rounded-xl border border-sage-500/30 bg-sage-500/5 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-sage-400">Join this Competition</p>
              <p className="text-sm text-zinc-400 mt-1">Enter to appear on the leaderboard and compete for the top spot.</p>
            </div>
            <JoinCompetitionBtn slug={slug} label="Enter Competition" />
          </div>
        )}

        {/* Your rank card */}
        {userEntry && status !== "Ended" && (
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 flex items-center gap-8">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Your Score</p>
              <p className="text-2xl font-bold text-sage-500">{userEntry.score} pts</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Your Rank</p>
              <p className="text-2xl font-bold">
                #{competition.entries.findIndex((e) => e.userId === user.id) + 1}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Labs Done</p>
              <p className="text-2xl font-bold">{completionsByUser.get(user.id) ?? 0}/{labSlugs.length}</p>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm uppercase tracking-widest text-zinc-500">Leaderboard</h2>
            {isFrozen && (
              <span className="text-[10px] font-bold uppercase text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5">
                Frozen
              </span>
            )}
          </div>
          {competition.entries.length === 0 ? (
            <p className="text-zinc-500 text-sm">No participants yet. Be the first to enter!</p>
          ) : (
            <div className="rounded-lg border border-white/10 divide-y divide-white/8">
              <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-wider text-zinc-600">
                <span className="col-span-1">#</span>
                <span className="col-span-5">Student</span>
                <span className="col-span-3">University</span>
                <span className="col-span-2 text-center">Labs</span>
                <span className="col-span-1 text-right">Score</span>
              </div>
              {competition.entries.map((entry, i) => {
                const isMe = entry.userId === user.id;
                const labsDone = completionsByUser.get(entry.userId) ?? 0;
                const medal = MEDAL[i];
                return (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 items-center px-4 py-3 ${isMe ? "bg-sage-500/5 border-l-2 border-sage-500" : "hover:bg-white/3"}`}
                  >
                    <span className={`col-span-1 text-sm font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-600"}`}>
                      {medal ?? i + 1}
                    </span>
                    <div className="col-span-5">
                      <p className={`text-sm font-medium ${isMe ? "text-sage-400" : "text-zinc-200"}`}>
                        {entry.user.displayName ?? entry.user.email.split("@")[0]}
                        {isMe && <span className="ml-1.5 text-xs text-sage-600">(you)</span>}
                      </p>
                    </div>
                    <p className="col-span-3 text-xs text-zinc-500">{entry.user.university ?? "—"}</p>
                    <p className="col-span-2 text-center text-sm text-zinc-400">{labsDone}/{labSlugs.length}</p>
                    <p className="col-span-1 text-right text-sm font-semibold text-sage-500">{entry.score}</p>
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
