import { Icon } from "@/components/ui/icon";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  email: string;
  score: number;
  timeTakenMin: number;
  completedAt: string;
  evidenceBoardScore: number;
  reportScore: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
  page?: number;
  limit?: number;
  isLoading?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 95) return "text-ok";
  if (score >= 85) return "text-ok";
  if (score >= 75) return "text-warn";
  if (score >= 60) return "text-sev-high";
  return "text-ink-2";
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeaderboardTable({
  entries,
  currentUserId,
  page = 1,
  limit = 50,
  isLoading = false,
}: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-edge overflow-hidden bg-surface-1">
        <div className="divide-y divide-edge-subtle">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="px-6 py-4 flex items-center gap-4 animate-pulse"
            >
              <div className="w-8 h-8 rounded bg-surface-2" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-32 h-4 rounded bg-surface-2" />
                  <div className="w-24 h-4 rounded bg-surface-2" />
                </div>
                <div className="w-48 h-3 rounded bg-surface-2" />
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-4 rounded bg-surface-2" />
                <div className="w-20 h-4 rounded bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface-1 p-12 text-center">
        <Icon name="users" size={32} className="mx-auto mb-3 text-ink-3" />
        <p className="text-sm text-ink-2">No completions yet</p>
        <p className="text-xs text-ink-3 mt-1">
          Be the first to complete this weekly challenge!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge overflow-hidden bg-surface-1">
      {/* Sticky header */}
      <div className="sticky top-0 bg-surface-1 border-b border-edge px-6 py-3 z-10">
        <div className="grid grid-cols-12 gap-4 text-xs uppercase tracking-widest text-ink-3">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2 text-right">Score</div>
          <div className="col-span-2 text-right">Time</div>
          <div className="col-span-3 text-right">Completed</div>
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-edge-subtle max-h-[600px] overflow-y-auto">
        {entries.map((entry, idx) => {
          const isCurrentUser = entry.userId === currentUserId;
          const scoreColor = getScoreColor(entry.score);

          return (
            <div
              key={entry.userId}
              className={`px-6 py-4 flex items-center gap-4 transition-colors ${
                isCurrentUser
                  ? "bg-ok-wash border-l-2 border-ok-edge"
                  : "hover:bg-surface-2"
              }`}
            >
              {/* Rank with badge */}
              <div className="col-span-1 w-8">
                {entry.rank <= 3 ? (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      entry.rank === 1
                        ? "bg-warn-wash text-warn"
                        : entry.rank === 2
                        ? "bg-surface-3 text-ink-2"
                        : "bg-sev-high-wash text-sev-high"
                    }`}
                  >
                    {entry.rank === 1 && <Icon name="crown" size={16} />}
                    {entry.rank === 2 && "2"}
                    {entry.rank === 3 && "3"}
                  </div>
                ) : (
                  <span className="text-sm text-ink-3 font-mono">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Name and email */}
              <div className="col-span-4">
                <p className="text-sm font-semibold text-white">
                  {entry.displayName}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-ok">(you)</span>
                  )}
                </p>
                <p className="text-xs text-ink-3 mt-0.5">{entry.email}</p>
              </div>

              {/* Score */}
              <div className={`col-span-2 text-right text-sm font-bold ${scoreColor}`}>
                {entry.score}
                <div className="text-xs text-ink-3 mt-1">
                  E:{entry.evidenceBoardScore} R:{entry.reportScore}
                </div>
              </div>

              {/* Time taken */}
              <div className="col-span-2 text-right">
                <p className="text-sm text-ink-2 font-mono">
                  {formatTime(entry.timeTakenMin)}
                </p>
              </div>

              {/* Completed at */}
              <div className="col-span-3 text-right">
                <p className="text-xs text-ink-3">
                  {formatDate(entry.completedAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
