import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PageHeader, Badge } from "@/components/ui";
import { Icon, ICON_SIZE } from "@/components/ui/icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  accuracy: number;
  speedScore: number;
  timeTaken: number;
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  currentUserRank?: number;
}

async function getLeaderboard(sessionId: string): Promise<LeaderboardResponse | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/hunts/${sessionId}/leaderboard`,
      {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getMedalIcon(rank: number) {
  if (rank === 1) return "trophy";
  if (rank === 2) return "medal";
  if (rank === 3) return "medal";
  return null;
}

const MEDAL_TONE: Record<number, "gold" | "amber" | "orange"> = {
  1: "gold",
  2: "amber",
  3: "orange",
};

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const leaderboard = await getLeaderboard(sessionId);
  if (!leaderboard) notFound();

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Leaderboard"
          subtitle="Top threat hunters ranked by score, accuracy, and speed."
          actions={
            <Link
              href={`/labs/hunts/${sessionId}`}
              className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
            >
              Back to Hunt
            </Link>
          }
        />

        {/* Current User Highlight */}
        {leaderboard.currentUserRank && (
          <div className="mb-6 p-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
            <p className="text-xs uppercase tracking-widest text-emerald-500 mb-1">You are currently</p>
            <p className="text-lg font-bold text-emerald-400">
              #{leaderboard.currentUserRank} on the leaderboard
            </p>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white/5 border-b border-white/8">
            <div className="col-span-1 text-xs uppercase tracking-widest text-zinc-500">Rank</div>
            <div className="col-span-5 text-xs uppercase tracking-widest text-zinc-500">Player</div>
            <div className="col-span-2 text-xs uppercase tracking-widest text-zinc-500 text-right">Score</div>
            <div className="col-span-2 text-xs uppercase tracking-widest text-zinc-500 text-right">Accuracy</div>
            <div className="col-span-2 text-xs uppercase tracking-widest text-zinc-500 text-right">Time</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/8">
            {leaderboard.entries.map((entry, idx) => {
              const medalIcon = getMedalIcon(entry.rank);
              const isMedal = medalIcon !== null;

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors ${
                    entry.isCurrentUser
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  {/* Rank */}
                  <div className="col-span-1">
                    {isMedal ? (
                      <div className="flex items-center gap-2">
                        <Icon
                          name={medalIcon as any}
                          size={20}
                        />
                        <span className="font-bold text-white">#{entry.rank}</span>
                      </div>
                    ) : (
                      <span className="font-semibold text-zinc-400">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Player */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {entry.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className={`font-semibold ${entry.isCurrentUser ? "text-emerald-400" : "text-white"}`}>
                        {entry.username}
                        {entry.isCurrentUser && " (You)"}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-2 text-right">
                    <span className="font-bold text-emerald-400">{entry.score}</span>
                  </div>

                  {/* Accuracy */}
                  <div className="col-span-2 text-right">
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-semibold text-white">{Math.round(entry.accuracy)}%</span>
                      <div className="w-16 h-1 bg-zinc-900/50 rounded overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${entry.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="col-span-2 text-right">
                    <span className="font-mono text-sm text-zinc-300">
                      {formatTime(entry.timeTaken)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 p-4 rounded-lg border border-white/8 bg-white/5">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Legend</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Icon name="trophy" size={16} />
              <span className="text-zinc-400">1st Place</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="medal" size={16} />
              <span className="text-zinc-400">2nd-3rd Place</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="star" size={16} />
              <span className="text-zinc-400">High Accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="energy" size={16} />
              <span className="text-zinc-400">Speed Bonus</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
