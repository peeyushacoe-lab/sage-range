import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Star, ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

type HintWithQuality = {
  id: string;
  stage: string;
  text: string;
  level: number;
  quality?: {
    avgScore: number;
    totalRatings: number;
    helpfulCount: number;
    submissionRate: number;
    inferredDifficulty: string;
  };
};

async function getHintsData(labId: string) {
  const lab = await db.lab.findUnique({
    where: { id: labId },
    select: { id: true, title: true },
  });

  if (!lab) {
    notFound();
  }

  const hints = await db.labHint.findMany({
    where: { labId },
    orderBy: [{ stage: "asc" }, { level: "asc" }],
  });

  // Fetch quality stats separately
  const hintsWithQuality = await Promise.all(
    hints.map(async (hint) => {
      const quality = await db.mentorHintQuality.findUnique({
        where: { hintId: hint.id },
      });
      return {
        id: hint.id,
        stage: hint.stage,
        text: hint.text,
        level: hint.level,
        quality: quality
          ? {
              avgScore: quality.avgScore,
              totalRatings: quality.totalRatings,
              helpfulCount: quality.helpfulCount,
              submissionRate: quality.submissionRate,
              inferredDifficulty: quality.inferredDifficulty,
            }
          : undefined,
      };
    })
  );

  // Group by stage
  const byStage = new Map<string, HintWithQuality[]>();
  for (const hint of hintsWithQuality) {
    if (!byStage.has(hint.stage)) {
      byStage.set(hint.stage, []);
    }
    byStage.get(hint.stage)!.push(hint);
  }

  return { lab, hintsByStage: byStage };
}

function difficultyColor(difficulty: string) {
  switch (difficulty) {
    case "EASY":
      return "text-green-400 bg-green-500/10";
    case "MEDIUM":
      return "text-info bg-info-wash";
    case "HARD":
      return "text-sev-high bg-sev-high-wash";
    case "INSANE":
      return "text-danger bg-danger-wash";
    default:
      return "text-ink-2 bg-surface-3";
  }
}

function StageAccordion({
  stage,
  hints,
}: {
  stage: string;
  hints: HintWithQuality[];
}) {
  return (
    <details className="group border border-edge-strong rounded-lg overflow-hidden">
      <summary className="flex items-center justify-between px-4 py-3 bg-surface-1 hover:bg-surface-2 cursor-pointer transition-colors">
        <span className="font-medium text-ink">{stage}</span>
        <ChevronDown
          size={18}
          className="text-ink-3 group-open:rotate-180 transition-transform"
        />
      </summary>

      <div className="bg-black/50 border-t border-edge-strong divide-y divide-edge-strong">
        {hints.map((hint) => {
          const stars = Math.round((hint.quality?.avgScore ?? 5) / 2);
          const helpPct = hint.quality
            ? Math.round((hint.quality.helpfulCount / hint.quality.totalRatings) * 100)
            : 0;

          return (
            <div key={hint.id} className="p-4 space-y-3">
              {/* Hint Text */}
              <div>
                <p className="text-sm text-ink-2 line-clamp-3 font-mono">
                  {hint.text}
                </p>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                {/* Star Rating */}
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i < stars
                            ? "fill-warn text-warn"
                            : "text-ink-3"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-ink-3">
                    {hint.quality?.avgScore.toFixed(1) ?? "5.0"}/10 (
                    {hint.quality?.totalRatings ?? 0} ratings)
                  </span>
                </div>

                {/* Helpful % & Submission Rate */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-ink-3 mb-1">Helpful</p>
                    <div className="w-full bg-surface-2 rounded-full h-1.5">
                      <div
                        className="bg-ok h-1.5 rounded-full"
                        style={{ width: `${helpPct}%` }}
                      />
                    </div>
                    <p className="text-ink-3 mt-1">{helpPct}%</p>
                  </div>

                  <div>
                    <p className="text-ink-3 mb-1">Submission Rate</p>
                    <div className="w-full bg-surface-2 rounded-full h-1.5">
                      <div
                        className="bg-info h-1.5 rounded-full"
                        style={{ width: `${hint.quality?.submissionRate ?? 0}%` }}
                      />
                    </div>
                    <p className="text-ink-3 mt-1">
                      {hint.quality?.submissionRate.toFixed(0) ?? 0}%
                    </p>
                  </div>
                </div>

                {/* Difficulty Badge */}
                {hint.quality?.inferredDifficulty && (
                  <div>
                    <span
                      className={`inline-block text-xs px-2 py-1 rounded font-mono ${difficultyColor(
                        hint.quality.inferredDifficulty
                      )}`}
                    >
                      {hint.quality.inferredDifficulty}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}

async function HintBrowserContent({ labId }: { labId: string }) {
  const { lab, hintsByStage } = await getHintsData(labId);

  const stages = Array.from(hintsByStage.entries());

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">
            {lab.title} — Hints
          </h1>
          <p className="text-ink-2">
            Browse hints by stage. All ratings and quality metrics help improve
            the hint system.
          </p>
        </div>

        {/* Stages */}
        {stages.length > 0 ? (
          <div className="space-y-4">
            {stages.map(([stage, hints]) => (
              <StageAccordion key={stage} stage={stage} hints={hints} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-ink-3">No hints available yet for this lab.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function HintBrowserPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <HintBrowserContent labId={slug} />
    </Suspense>
  );
}
