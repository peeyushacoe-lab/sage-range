import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface CaseCardProps {
  caseId: string;
  title: string;
  weekNumber: number;
  season: number;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  description?: string;
  releaseTime: string;
  deadlineTime: string;
  points: number;
  participants?: number;
  completions?: number;
  avgTime?: number;
}

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-ok",
  MEDIUM: "text-warn",
  HARD: "text-sev-high",
  INSANE: "text-danger",
};

const DIFF_BORDER: Record<string, string> = {
  EASY: "border-ok-edge",
  MEDIUM: "border-warn-edge",
  HARD: "border-sev-high-edge",
  INSANE: "border-danger-edge",
};

export function CaseCard({
  caseId,
  title,
  weekNumber,
  season,
  difficulty,
  description,
  releaseTime,
  deadlineTime,
  points,
  participants = 0,
  completions = 0,
  avgTime = 0,
}: CaseCardProps) {
  const deadline = new Date(deadlineTime);
  const now = new Date();
  const timeRemaining = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const isDeadlineClose = hoursRemaining < 24 && hoursRemaining > 0;

  const diffColor = DIFF_COLORS[difficulty] ?? "text-ink-2";
  const diffBorder = DIFF_BORDER[difficulty] ?? "border-edge";

  return (
    <Link
      href={`/labs/incidents/weekly/${caseId}`}
      className={`card-hover rounded-xl border p-6 flex flex-col gap-4 relative overflow-hidden transition-all ${diffBorder} bg-surface-1 hover:bg-surface-1`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">
            Season {season} · Week {weekNumber}
          </p>
          <h3 className="text-lg font-semibold text-white leading-snug">{title}</h3>
        </div>
        <span className={`text-sm font-bold font-mono ${diffColor}`}>{difficulty}</span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-ink-2 line-clamp-2 leading-relaxed">{description}</p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-ink-3 mb-1">Participants</p>
          <p className="font-semibold text-ink">{participants}</p>
        </div>
        <div>
          <p className="text-ink-3 mb-1">Completions</p>
          <p className="font-semibold text-ink">{completions}</p>
        </div>
        <div>
          <p className="text-ink-3 mb-1">Avg Time</p>
          <p className="font-semibold text-ink">
            {avgTime > 0 ? `${avgTime}m` : "—"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-edge">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-ink-2">{points} points</span>
          {isDeadlineClose && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-full bg-danger-wash border border-danger-edge">
              <Icon name="clock" size={12} className="text-danger" />
              <span className="text-xs text-danger font-medium">{hoursRemaining}h left</span>
            </div>
          )}
        </div>
        <Icon name="arrowRight" size={16} className="text-ink-3 group-hover:text-ink-2" />
      </div>
    </Link>
  );
}
