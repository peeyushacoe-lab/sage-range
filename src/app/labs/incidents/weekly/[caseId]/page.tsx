import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PageHeader, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { ProgressWidget } from "../_components/progress-widget";

export const dynamic = "force-dynamic";

interface Case {
  id: string;
  weekNumber: number;
  season: number;
  incidentSlug: string;
  difficulty: string;
  releaseTime: string;
  deadlineTime: string;
  points: number;
  published: boolean;
}

interface Progress {
  completed: boolean;
  completedAt: string | null;
  score: number;
  rank: number | null;
  daysRemaining: number;
  evidenceBoardScore: number | null;
  reportScore: number | null;
}

async function getUserProgress(
  caseId: string
): Promise<{ case: Case | null; progress: Progress | null } | null> {
  try {
    const response = await fetch(
      `/api/user/incidents/weekly/progress?caseId=${caseId}`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch user progress:", error);
    return null;
  }
}

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-sage-500 border-sage-500/40",
  MEDIUM: "text-amber-400 border-amber-500/40",
  HARD: "text-orange-400 border-orange-500/40",
  INSANE: "text-red-400 border-red-500/40",
};

function getStatusBadge(
  completed: boolean,
  completedAt: string | null
): "Completed" | "Submitted" | "In Progress" | "Missed Deadline" {
  if (completed && completedAt) {
    return "Completed";
  }
  // TODO: Add more sophisticated logic when report submission is implemented
  return "In Progress";
}

export default async function CaseDetail({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const userProgressData = await getUserProgress(caseId);
  if (!userProgressData) {
    notFound();
  }

  const { case: weeklyCase, progress } = userProgressData;

  if (!weeklyCase) {
    notFound();
  }

  const diffColor = DIFF_COLORS[weeklyCase.difficulty] ?? "text-zinc-400 border-white/8";

  const deadline = new Date(weeklyCase.deadlineTime);
  const now = new Date();
  const timeRemaining = deadline.getTime() - now.getTime();
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const isDeadlineClose = hoursRemaining < 24 && hoursRemaining > 0;

  const status = getStatusBadge(progress?.completed ?? false, progress?.completedAt ?? null);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/labs/incidents/weekly" backLabel="Weekly Incidents" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <PageHeader
          className="mb-8"
          eyebrow={`Season ${weeklyCase.season} · Week ${weeklyCase.weekNumber}`}
          title="Weekly Incident Challenge"
          subtitle="Investigate the attack, categorize artifacts on the evidence board, and write your executive report to complete the challenge."
        />

        {/* Difficulty and points */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`rounded-lg border px-4 py-2 font-semibold ${diffColor}`}>
            {weeklyCase.difficulty}
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Icon name="star" size={16} className="text-amber-400" />
            <span>{weeklyCase.points} points</span>
          </div>
          {isDeadlineClose && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <Icon name="clock" size={14} className="text-red-400" />
              <span className="text-sm font-medium text-red-400">
                {hoursRemaining}h remaining
              </span>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Status"
            value={status}
            sub={
              isDeadlineClose
                ? `${hoursRemaining}h remaining`
                : `${daysRemaining} days left`
            }
          />
          <StatCard
            label="Your Score"
            value={progress?.score ?? 0}
            sub={`${progress?.evidenceBoardScore ?? 0}% + ${progress?.reportScore ?? 0}%`}
          />
          <StatCard
            label="Current Rank"
            value={progress?.rank ? `#${progress.rank}` : "—"}
            sub={progress?.rank ? "on leaderboard" : "submit to rank"}
          />
          <StatCard
            label="Time Remaining"
            value={daysRemaining}
            sub={daysRemaining === 1 ? "day" : "days"}
          />
        </div>

        {/* Progress widget */}
        {progress && (
          <div className="mb-8">
            <ProgressWidget
              caseTitle={`Incident Case - Week ${weeklyCase.weekNumber}`}
              weekNumber={weeklyCase.weekNumber}
              season={weeklyCase.season}
              evidenceBoardScore={progress.evidenceBoardScore}
              reportScore={progress.reportScore}
              deadlineTime={weeklyCase.deadlineTime}
              status={status}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href={`/incidents/${weeklyCase.incidentSlug}`}
            className="rounded-lg bg-sage-500 px-6 py-3 text-center font-semibold text-black hover:bg-sage-600 transition"
          >
            Start Investigation →
          </Link>
          <Link
            href={`/labs/incidents/weekly/${caseId}/leaderboard`}
            className="rounded-lg border border-white/20 px-6 py-3 text-center font-semibold text-white hover:border-white/40 hover:bg-white/5 transition"
          >
            View Leaderboard
          </Link>
        </div>

        {/* Certificate section */}
        <div className="mb-8">
          <Link
            href={`/labs/incidents/weekly/${caseId}/certificate`}
            className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 flex items-center justify-between hover:bg-amber-500/10 transition"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-amber-400 mb-1">
                Certificate
              </p>
              <p className="font-semibold text-white">
                {progress?.completed
                  ? "Certificate Earned"
                  : "Complete by Sunday 23:59 UTC"}
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                {progress?.completed
                  ? "Claim your certificate and share your achievement"
                  : "Finish the investigation to earn your weekly certificate"}
              </p>
            </div>
            <Icon name="arrowRight" size={20} className="text-amber-400" />
          </Link>
        </div>

        {/* Timeline info */}
        <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">
            Timeline
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-sage-500 mt-2 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-zinc-100">Released</p>
                <p className="text-xs text-zinc-500">
                  {new Date(weeklyCase.releaseTime).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${isDeadlineClose ? "bg-red-500" : "bg-zinc-600"}`} />
              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  Deadline
                  {isDeadlineClose && (
                    <span className="ml-2 text-xs text-red-400">Urgent</span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(weeklyCase.deadlineTime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
