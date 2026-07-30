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
  EASY: "text-sage-500",
  MEDIUM: "text-amber-400",
  HARD: "text-orange-400",
  INSANE: "text-red-400",
};

const DIFF_BORDER: Record<string, string> = {
  EASY: "border-sage-500/40",
  MEDIUM: "border-amber-500/40",
  HARD: "border-orange-500/40",
  INSANE: "border-red-500/40",
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

  const diffColor = DIFF_COLORS[difficulty] ?? "text-zinc-400";
  const diffBorder = DIFF_BORDER[difficulty] ?? "border-white/8";

  return (
    <Link
      href={`/labs/incidents/weekly/${caseId}`}
      className={`card-hover rounded-xl border p-6 flex flex-col gap-4 relative overflow-hidden transition-all ${diffBorder} bg-zinc-900/40 hover:bg-zinc-900/60`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            Season {season} · Week {weekNumber}
          </p>
          <h3 className="text-lg font-semibold text-white leading-snug">{title}</h3>
        </div>
        <span className={`text-sm font-bold font-mono ${diffColor}`}>{difficulty}</span>
      </div>

      {/* Description */}
      {description && (
        <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{description}</p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-zinc-600 mb-1">Participants</p>
          <p className="font-semibold text-zinc-100">{participants}</p>
        </div>
        <div>
          <p className="text-zinc-600 mb-1">Completions</p>
          <p className="font-semibold text-zinc-100">{completions}</p>
        </div>
        <div>
          <p className="text-zinc-600 mb-1">Avg Time</p>
          <p className="font-semibold text-zinc-100">
            {avgTime > 0 ? `${avgTime}m` : "—"}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/8">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">{points} points</span>
          {isDeadlineClose && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/30">
              <Icon name="clock" size={12} className="text-red-400" />
              <span className="text-xs text-red-400 font-medium">{hoursRemaining}h left</span>
            </div>
          )}
        </div>
        <Icon name="arrowRight" size={16} className="text-zinc-600 group-hover:text-zinc-400" />
      </div>
    </Link>
  );
}
