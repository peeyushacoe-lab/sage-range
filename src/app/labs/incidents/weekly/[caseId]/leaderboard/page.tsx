import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PageHeader, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { LeaderboardTable } from "../../_components/leaderboard-table";

export const dynamic = "force-dynamic";

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

interface Case {
  id: string;
  weekNumber: number;
  season: number;
  difficulty: string;
  deadlineTime: string;
}

async function getLeaderboard(
  caseId: string,
  limit: number = 100
): Promise<{ case: Case; leaderboard: LeaderboardEntry[] } | null> {
  try {
    const response = await fetch(
      `/api/incidents/weekly/${caseId}/leaderboard?limit=${limit}`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch leaderboard:", error);
    return null;
  }
}

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-ok border-ok-edge",
  MEDIUM: "text-warn border-warn-edge",
  HARD: "text-sev-high border-sev-high-edge",
  INSANE: "text-danger border-danger-edge",
};

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { caseId } = await params;
  const { page = "1", sort = "score" } = await searchParams;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const leaderboardData = await getLeaderboard(caseId, 100);
  if (!leaderboardData) {
    notFound();
  }

  const { case: weeklyCase, leaderboard } = leaderboardData;
  const diffColor = DIFF_COLORS[weeklyCase.difficulty] ?? "text-ink-2";

  // Sort entries based on query parameter
  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (sort === "time") {
      return a.timeTakenMin - b.timeTakenMin;
    }
    return b.score - a.score;
  });

  // Pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limit = 50;
  const start = (pageNum - 1) * limit;
  const paginatedLeaderboard = sortedLeaderboard.slice(start, start + limit);
  const totalPages = Math.ceil(sortedLeaderboard.length / limit);

  // Find current user's rank
  const userRank = sortedLeaderboard.find((e) => e.userId === user.id);

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar
        backHref={`/labs/incidents/weekly/${caseId}`}
        backLabel="Back to Case"
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <PageHeader
          className="mb-8"
          eyebrow={`Season ${weeklyCase.season} · Week ${weeklyCase.weekNumber}`}
          title="Leaderboard"
          subtitle="Top performers ranked by score (with speed as tiebreaker). Complete the weekly challenge to earn your spot."
        />

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Difficulty"
            value={weeklyCase.difficulty}
            sub="challenge level"
          />
          <StatCard
            label="Total Completions"
            value={leaderboard.length}
            sub="participants ranked"
          />
          <StatCard
            label="Your Rank"
            value={userRank ? `#${userRank.rank}` : "—"}
            sub={userRank ? `${userRank.score}% score` : "submit to rank"}
          />
          <StatCard
            label="Top Score"
            value={leaderboard.length > 0 ? leaderboard[0].score : "—"}
            sub="highest score"
          />
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-ink-3 uppercase tracking-widest">
            Sort by:
          </span>
          <div className="flex gap-2">
            <Link
              href={`?sort=score&page=1`}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                sort === "score"
                  ? "bg-accent-fill text-white"
                  : "border border-edge text-ink-2 hover:text-white hover:border-edge-strong"
              }`}
            >
              Score
            </Link>
            <Link
              href={`?sort=time&page=1`}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition ${
                sort === "time"
                  ? "bg-accent-fill text-white"
                  : "border border-edge text-ink-2 hover:text-white hover:border-edge-strong"
              }`}
            >
              Speed
            </Link>
          </div>
        </div>

        {/* Leaderboard table */}
        <LeaderboardTable
          entries={paginatedLeaderboard}
          currentUserId={user.id}
          page={pageNum}
          limit={limit}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {pageNum > 1 && (
              <Link
                href={`?sort=${sort}&page=${pageNum - 1}`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-edge text-ink-2 hover:text-white hover:border-edge-strong transition"
              >
                <Icon name="chevronLeft" size={14} />
                Previous
              </Link>
            )}

            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let page = i + 1;
              if (pageNum > 3) {
                page = pageNum - 2 + i;
              }
              if (page > totalPages) return null;

              return (
                <Link
                  key={page}
                  href={`?sort=${sort}&page=${page}`}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition ${
                    pageNum === page
                      ? "bg-accent-fill text-white"
                      : "border border-edge text-ink-2 hover:text-white hover:border-edge-strong"
                  }`}
                >
                  {page}
                </Link>
              );
            })}

            {pageNum < totalPages && (
              <Link
                href={`?sort=${sort}&page=${pageNum + 1}`}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-edge text-ink-2 hover:text-white hover:border-edge-strong transition"
              >
                Next
                <Icon name="chevronRight" size={14} />
              </Link>
            )}
          </div>
        )}

        {/* Info box */}
        <div className="mt-8 rounded-lg border border-edge bg-surface-1 p-6">
          <div className="flex gap-3">
            <Icon name="info" size={20} className="text-ink-3 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ink mb-2">
                How Rankings Work
              </p>
              <ul className="text-xs text-ink-2 space-y-1">
                <li>
                  • <strong>Primary:</strong> Total score (evidence board +
                  report)
                </li>
                <li>
                  • <strong>Tiebreaker:</strong> Time taken (faster is better)
                </li>
                <li>
                  • <strong>Deadline:</strong> Must complete by Sunday 23:59 UTC
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
