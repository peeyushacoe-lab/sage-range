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
            i < stars ? "fill-amber-400 text-amber-400" : "text-zinc-700"
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
            <TrendingUp size={24} className="text-sage-500" />
            <h1 className="text-3xl font-bold text-zinc-100">
              Top Hints by Quality
            </h1>
          </div>
          <p className="text-zinc-400">
            The highest-rated hints across all labs, ranked by average quality
            score.
          </p>
        </div>

        {/* Table */}
        {hints.length > 0 ? (
          <div className="overflow-x-auto border border-zinc-700 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">
                    Hint
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">
                    Lab
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-300">
                    Stage
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-300">
                    Quality
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-300">
                    Ratings
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-300">
                    Helpful %
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-300">
                    Submission %
                  </th>
                </tr>
              </thead>
              <tbody>
                {hints.map((hint, i) => (
                  <tr
                    key={hint.hintId}
                    className={`border-b border-zinc-800 hover:bg-zinc-900/30 transition-colors ${
                      i % 2 === 0 ? "bg-black/50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sage-500/20 text-sage-300 font-mono text-xs font-semibold">
                        {hint.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-zinc-300 truncate font-mono text-xs">
                        {hint.text}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-400 text-xs">{hint.labTitle}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500 font-mono">
                        {hint.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <StarRating score={hint.avgScore} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-zinc-400 font-mono">
                        {hint.avgScore.toFixed(1)}/10
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-zinc-400 font-mono">
                        {hint.helpfulCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-zinc-400 font-mono">
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
            <p className="text-zinc-500">No hints available yet.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 p-4 bg-zinc-900/30 rounded border border-zinc-800">
          <p className="text-xs text-zinc-500">
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
            <div className="h-10 bg-zinc-900 rounded animate-pulse mb-8" />
          </div>
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
