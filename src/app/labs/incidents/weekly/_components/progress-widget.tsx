import { Icon } from "@/components/ui/icon";

interface ProgressWidgetProps {
  caseTitle: string;
  weekNumber: number;
  season: number;
  evidenceBoardScore: number | null;
  reportScore: number | null;
  deadlineTime: string;
  status: "In Progress" | "Submitted" | "Completed" | "Missed Deadline";
}

export function ProgressWidget({
  caseTitle,
  weekNumber,
  season,
  evidenceBoardScore,
  reportScore,
  deadlineTime,
  status,
}: ProgressWidgetProps) {
  const deadline = new Date(deadlineTime);
  const now = new Date();
  const timeRemaining = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));

  const evidenceScore = evidenceBoardScore ?? 0;
  const report = reportScore ?? 0;
  const totalScore = evidenceScore + report;

  const isDeadlineClose = hoursRemaining < 24 && hoursRemaining > 0;
  const isDeadlinePassed = timeRemaining < 0;
  const isOnTrack = totalScore >= 75;

  let statusColor = "text-zinc-400";
  let statusBg = "bg-zinc-900/50 border-zinc-700/50";
  let progressColor = "bg-emerald-500";

  if (status === "Completed") {
    statusColor = "text-sage-500";
    statusBg = "bg-sage-500/10 border-sage-500/30";
  } else if (status === "Submitted") {
    statusColor = "text-amber-400";
    statusBg = "bg-amber-500/10 border-amber-500/30";
  } else if (status === "Missed Deadline") {
    statusColor = "text-red-400";
    statusBg = "bg-red-500/10 border-red-500/30";
    progressColor = "bg-red-500";
  } else if (isDeadlineClose && !isOnTrack) {
    progressColor = "bg-amber-500";
  } else if (!isOnTrack && !isDeadlineClose) {
    progressColor = "bg-amber-500";
  }

  return (
    <div className={`rounded-xl border p-5 ${statusBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Season {season} · Week {weekNumber}
          </p>
          <p className="font-semibold text-zinc-100">{caseTitle}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
          {status}
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Evidence Board</p>
          <p className="text-lg font-bold text-zinc-100">{evidenceScore}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Report</p>
          <p className="text-lg font-bold text-zinc-100">{report}%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Total Score</p>
          <p className="text-lg font-bold text-zinc-100">{totalScore}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">Overall Progress</p>
          <p className="text-xs text-zinc-400">{totalScore}% complete</p>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${Math.min(totalScore, 100)}%` }}
          />
        </div>
      </div>

      {/* Deadline info */}
      <div className="flex items-center gap-2 text-xs">
        {isDeadlineClose ? (
          <>
            <Icon name="clock" size={14} className="text-red-400" />
            <span className="text-red-400 font-medium">
              {hoursRemaining}h remaining
            </span>
          </>
        ) : isDeadlinePassed ? (
          <>
            <Icon name="cross" size={14} className="text-red-400" />
            <span className="text-red-400">Deadline passed</span>
          </>
        ) : (
          <>
            <Icon name="calendar" size={14} className="text-zinc-500" />
            <span className="text-zinc-400">
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
            </span>
          </>
        )}
      </div>
    </div>
  );
}
