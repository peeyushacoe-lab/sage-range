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

  let statusColor = "text-ink-2";
  let statusBg = "bg-surface-1 border-edge-strong/50";
  let progressColor = "bg-ok";

  if (status === "Completed") {
    statusColor = "text-ok";
    statusBg = "bg-ok-wash border-ok-edge";
  } else if (status === "Submitted") {
    statusColor = "text-warn";
    statusBg = "bg-warn-wash border-warn-edge";
  } else if (status === "Missed Deadline") {
    statusColor = "text-danger";
    statusBg = "bg-danger-wash border-danger-edge";
    progressColor = "bg-danger";
  } else if (isDeadlineClose && !isOnTrack) {
    progressColor = "bg-warn";
  } else if (!isOnTrack && !isDeadlineClose) {
    progressColor = "bg-warn";
  }

  return (
    <div className={`rounded-xl border p-5 ${statusBg}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">
            Season {season} · Week {weekNumber}
          </p>
          <p className="font-semibold text-ink">{caseTitle}</p>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}>
          {status}
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <p className="text-xs text-ink-3 mb-1">Evidence Board</p>
          <p className="text-lg font-bold text-ink">{evidenceScore}%</p>
        </div>
        <div>
          <p className="text-xs text-ink-3 mb-1">Report</p>
          <p className="text-lg font-bold text-ink">{report}%</p>
        </div>
        <div>
          <p className="text-xs text-ink-3 mb-1">Total Score</p>
          <p className="text-lg font-bold text-ink">{totalScore}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-ink-3">Overall Progress</p>
          <p className="text-xs text-ink-2">{totalScore}% complete</p>
        </div>
        <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
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
            <Icon name="clock" size={14} className="text-danger" />
            <span className="text-danger font-medium">
              {hoursRemaining}h remaining
            </span>
          </>
        ) : isDeadlinePassed ? (
          <>
            <Icon name="cross" size={14} className="text-danger" />
            <span className="text-danger">Deadline passed</span>
          </>
        ) : (
          <>
            <Icon name="calendar" size={14} className="text-ink-3" />
            <span className="text-ink-2">
              {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
            </span>
          </>
        )}
      </div>
    </div>
  );
}
