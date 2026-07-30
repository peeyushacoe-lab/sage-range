import { Suspense } from "react";
import { Star, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

type TopHint = {
  rank: number;
  hintId: string;
  text: string;
  labTitle: string;
  stage: string;
  avgScore: number;
  f1Score?: number;
  helpfulCount: number;
  submissionRate: number;
};

async function getTopQualityHints(): Promise<TopHint[]> {
  const qualities = await db.mentorHintQuality.findMany({
    take: 50,
    orderBy: { avgScore: "desc" },
  });

  const hints = await Promise.all(
    qualities.map(async (q) => {
      const hint = await db.labHint.findUnique({
        where: { id: q.hintId },
        include: { lab: { select: { title: true } } },
      });
      return {
        rank: 0,
        hintId: q.hintId,
        text: hint?.text ?? "Unknown",
        labTitle: hint?.lab.title ?? "Unknown",
        stage: hint?.stage ?? "unknown",
        avgScore: q.avgScore,
        helpfulCount: q.helpfulCount,
        submissionRate: q.submissionRate,
      };
    })
  );

  return hints.map((h, i) => ({ ...h, rank: i + 1 }));
}

function StarRating({ score }: { score: number }) {
  const stars = Math.round(score / 2);
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={
            i < stars ? "fill-warn text-warn" : "text-ink-3"
          }
        />
      ))}
    </div>
  );
}

async function LeaderboardContent() {
  const hints = await getTopQualityHints();

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={24} className="text-ok" />
            <h1 className="text-3xl font-bold text-ink">
              Top Hints by Quality
            </h1>
          </div>
          <p className="text-ink-2">
            The highest-rated hints across all labs, ranked by average quality
            score.
          </p>
        </div>

        {/* Table */}
        {hints.length > 0 ? (
          <div className="overflow-x-auto border border-edge-strong rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge-strong bg-surface-1">
                  <th className="px-4 py-3 text-left font-semibold text-ink-2">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-2">
                    Hint
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-2">
                    Lab
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-2">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-ink-2">
                    Quality
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-ink-2">
                    Ratings
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-ink-2">
                    Helpful %
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-ink-2">
                    Submission %
                  </th>
                </tr>
              </thead>
              <tbody>
                {hints.map((hint, i) => (
                  <tr
                    key={hint.hintId}
                    className={`border-b border-edge-strong hover:bg-surface-1 transition-colors ${
                      i % 2 === 0 ? "bg-black/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-ok-wash text-ok font-mono text-xs font-semibold">
                        {hint.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-ink-2 truncate font-mono text-xs">
                        {hint.text}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-ink-2 text-xs">{hint.labTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-ink-3 font-mono">
                        {hint.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StarRating score={hint.avgScore} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-ink-2 font-mono">
                        {hint.avgScore.toFixed(1)}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-ink-2 font-mono">
                        {hint.helpfulCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-ink-2 font-mono">
                        {hint.submissionRate.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-ink-3">No hints available yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 p-4 bg-surface-1 rounded border border-edge-strong">
          <p className="text-xs text-ink-3">
            Metrics are updated in real-time as users rate hints. Quality scores
            range from 0-10, and submission rate shows the percentage of users
            who solved the lab after viewing a hint.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function QualityLeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="h-10 bg-surface-1 rounded animate-pulse mb-8" />
          </div>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
