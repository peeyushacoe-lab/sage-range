import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinCompetitionBtn } from "../_components/join-btn";
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

  // Count completed labs per entry: fetch LabResponses for all entrant users in this competition
  const entrantIds = competition.entries.map((e) => e.userId);

  // Build a map of userId -> completed labs count
  const labCompletions = await db.labResponse.findMany({
    where: { userId: { in: entrantIds }, lab: { slug: { in: labSlugs } } },
    select: { userId: true, labId: true },
    distinct: ["userId", "labId"],
  });

  const completionsByUser = new Map<string, number>();
  for (const lc of labCompletions) {
    completionsByUser.set(lc.userId, (completionsByUser.get(lc.userId) ?? 0) + 1);
  }

  return (
    <main className="min-h-screen">
      <Navbar backHref="/competitions" backLabel="Competitions" />
      <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mt-5 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${statusBadge(status)}`}
          >
            {status}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{competition.name}</h1>
        <p className="text-zinc-400 mt-2">{competition.description}</p>
        <div className="flex gap-6 mt-3 text-xs text-zinc-500">
          <span>Start: {competition.startDate.toISOString().slice(0, 10)}</span>
          <span>End: {competition.endDate.toISOString().slice(0, 10)}</span>
          <span>{labSlugs.length} lab{labSlugs.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* Scoring explanation for active */}
      {status === "Active" && (
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 mb-8">
          <h2 className="text-sm font-semibold text-zinc-300 mb-2">How Scoring Works</h2>
          <ul className="space-y-1 text-sm text-zinc-400">
            <li className="flex gap-2"><span className="text-sage-500">+10 pts</span> for each lab stage completed</li>
            <li className="flex gap-2"><span className="text-sage-500">+50 pts</span> bonus for completing a full lab</li>
          </ul>
          <p className="text-xs text-zinc-500 mt-3">
            Assigned labs: {labSlugs.join(", ")}
          </p>
        </div>
      )}

      {/* Enter competition CTA */}
      {status === "Active" && !userEntry && (
        <div className="rounded-xl border border-sage-500/30 bg-sage-500/5 p-5 mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sage-400">Join this Competition</p>
            <p className="text-sm text-zinc-400 mt-1">
              Enter to appear on the leaderboard and compete for the top spot.
            </p>
          </div>
          <JoinCompetitionBtn slug={slug} label="Enter Competition" />
        </div>
      )}

      {/* User rank if entered */}
      {userEntry && (
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 mb-8 flex items-center gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Your Score</p>
            <p className="text-2xl font-bold text-sage-500">{userEntry.score} pts</p>
          </div>
          <div className="ml-4">
            <p className="text-xs text-zinc-500 mb-0.5">Your Rank</p>
            <p className="text-2xl font-bold">
              #{competition.entries.findIndex((e) => e.userId === user.id) + 1}
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-4">Leaderboard</h2>
        {competition.entries.length === 0 ? (
          <p className="text-zinc-500 text-sm">No participants yet. Be the first to enter!</p>
        ) : (
          <div className="rounded-lg border border-white/10 divide-y divide-white/10">
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
              return (
                <div
                  key={entry.id}
                  className={`grid grid-cols-12 items-center px-4 py-3 ${isMe ? "bg-sage-500/5 border-l-2 border-sage-500" : "hover:bg-white/3"}`}
                >
                  <span
                    className={`col-span-1 text-sm font-bold ${i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-600"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="col-span-5">
                    <p className={`text-sm font-medium ${isMe ? "text-sage-400" : "text-zinc-200"}`}>
                      {entry.user.displayName ?? entry.user.email.split("@")[0]}
                      {isMe && <span className="ml-1.5 text-xs text-sage-600">(you)</span>}
                    </p>
                  </div>
                  <p className="col-span-3 text-xs text-zinc-500">
                    {entry.user.university ?? "—"}
                  </p>
                  <p className="col-span-2 text-center text-sm text-zinc-400">{labsDone}</p>
                  <p className="col-span-1 text-right text-sm font-semibold text-sage-500">
                    {entry.score}
                  </p>
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
