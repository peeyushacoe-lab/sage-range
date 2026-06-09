import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getActivityFeed, timeAgo } from "@/lib/activity-feed";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const DIFF_COLOR: Record<string, string> = {
  EASY:   "text-emerald-400 bg-emerald-500/8 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/8 border-amber-500/20",
  HARD:   "text-red-400 bg-red-500/8 border-red-500/20",
  INSANE: "text-purple-400 bg-purple-500/8 border-purple-500/20",
};

const TYPE_ICON: Record<string, string> = {
  CTF:       "🚩",
  BLUE_TEAM: "🛡️",
  RED_TEAM:  "⚔️",
};

function simRating(score: number) {
  if (score >= 88) return { label: "EXCEPTIONAL", color: "text-emerald-400" };
  if (score >= 68) return { label: "STRONG",      color: "text-blue-400" };
  if (score >= 48) return { label: "ADEQUATE",    color: "text-amber-400" };
  return                  { label: "DEVELOPING",  color: "text-zinc-500" };
}

export default async function FeedPage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const feed = await getActivityFeed({ limit: 60 });

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Community Feed</h1>
            <p className="text-zinc-500 text-sm mt-1">Verified activity across the platform</p>
          </div>
          <Link
            href={`/profile/${me.id}`}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-white/8 rounded-lg px-3 py-2 transition-colors"
          >
            My Profile →
          </Link>
        </div>

        {feed.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-12 text-center">
            <p className="text-zinc-500 text-sm">No activity yet.</p>
            <p className="text-zinc-700 text-xs mt-1">Complete a lab or simulation to appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {feed.map((entry) => {
              const name = entry.displayName ?? entry.email.split("@")[0];
              const initial = name[0].toUpperCase();

              if (entry.type === "lab_solved") {
                return (
                  <div key={entry.id} className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <Link href={`/profile/${entry.userId}`} className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400 shrink-0 hover:bg-emerald-500/20 transition-colors">
                        {initial}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-zinc-200">
                            <Link href={`/profile/${entry.userId}`} className="font-semibold hover:text-white transition-colors">
                              {name}
                            </Link>
                            <span className="text-zinc-500"> solved </span>
                            <span className="font-medium text-zinc-100">{entry.labTitle}</span>
                          </p>
                          <span className="text-[11px] text-zinc-600 shrink-0 mt-0.5">{timeAgo(entry.solvedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm">{TYPE_ICON[entry.labType] ?? "🔬"}</span>
                          <span className="text-xs text-zinc-500">{entry.labType.replace("_", " ")}</span>
                          <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${DIFF_COLOR[entry.labDifficulty]}`}>
                            {entry.labDifficulty}
                          </span>
                          {entry.score > 0 && (
                            <span className="text-xs text-emerald-400 font-semibold">+{entry.score} XP</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const rating = simRating(entry.simScore);
              return (
                <div key={entry.id} className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <Link href={`/profile/${entry.userId}`} className="h-9 w-9 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0 hover:bg-blue-500/20 transition-colors">
                      {initial}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-200">
                          <Link href={`/profile/${entry.userId}`} className="font-semibold hover:text-white transition-colors">
                            {name}
                          </Link>
                          <span className="text-zinc-500"> completed </span>
                          <span className="font-medium text-zinc-100">{entry.scenarioName}</span>
                        </p>
                        <span className="text-[11px] text-zinc-600 shrink-0 mt-0.5">{timeAgo(entry.completedAt)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm">⚡</span>
                        <span className="text-xs text-zinc-500">Simulation</span>
                        <span className="text-xs font-bold text-zinc-200">{entry.simScore}/100</span>
                        <span className={`text-xs font-bold ${rating.color}`}>{rating.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
