import { Suspense } from "react";
import { redirect } from "next/navigation";
import { RotateCcw, Calendar } from "lucide-react";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";

type EligibleLab = {
  labId: string;
  labTitle: string;
  lastHintShownAt: Date;
  stage: string;
  hintCount: number;
};

async function getEligibleLabs(): Promise<EligibleLab[]> {
  const user = await getOrCreateAppUser();
  if (!user) {
    redirect("/sign-in");
  }

  const sequences = await db.mentorHintSequence.findMany({
    where: {
      userId: user.id,
      expiresAt: {
        gt: new Date(), // Not expired
      },
    },
    include: {
      lab: {
        select: { id: true, title: true },
      },
    },
  });

  // Group by lab
  const byLab = new Map<string, EligibleLab>();

  for (const seq of sequences) {
    const key = seq.labId;
    if (!byLab.has(key)) {
      byLab.set(key, {
        labId: seq.labId,
        labTitle: seq.lab.title,
        lastHintShownAt: seq.lastShownAt,
        stage: seq.stage,
        hintCount: seq.shownHints.length,
      });
    }
  }

  return Array.from(byLab.values()).sort(
    (a, b) => b.lastHintShownAt.getTime() - a.lastHintShownAt.getTime()
  );
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

async function ReplayContent() {
  const labs = await getEligibleLabs();

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <RotateCcw size={24} className="text-ok" />
            <h1 className="text-3xl font-bold text-ink">Replay Eligible</h1>
          </div>
          <p className="text-ink-2 max-w-2xl">
            These labs have hints you can re-learn without penalty. Replay labs
            to reinforce key concepts or prepare for advanced challenges. Hints
            remain accessible for 90 days from first use.
          </p>
        </div>

        {/* Labs Grid */}
        {labs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labs.map((lab) => (
              <div
                key={lab.labId}
                className="border border-edge-strong rounded-lg p-5 hover:border-ok-edge hover:bg-black/50 transition-all"
              >
                <div className="space-y-4">
                  {/* Lab Title */}
                  <div>
                    <h3 className="text-lg font-semibold text-ink mb-1">
                      {lab.labTitle}
                    </h3>
                    <p className="text-xs text-ink-3 font-mono">
                      Lab ID: {lab.labId}
                    </p>
                  </div>

                  {/* Last Hint Info */}
                  <div className="space-y-2 text-xs text-ink-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-ink-3" />
                      <span>
                        Last hint:{" "}
                        <span className="text-ink-2">
                          {formatDate(lab.lastHintShownAt)}
                        </span>
                      </span>
                    </div>
                    <p>
                      Hints learned:{" "}
                      <span className="text-ink-2 font-mono">
                        {lab.hintCount}
                      </span>
                    </p>
                    <p>
                      Current stage:{" "}
                      <span className="text-ink-2 font-mono">
                        {lab.stage}
                      </span>
                    </p>
                  </div>

                  {/* Action */}
                  <a
                    href={`/labs/${lab.labId}/hints`}
                    className="inline-block w-full text-center px-4 py-2 bg-ok-wash hover:bg-ok-wash border border-ok-edge hover:border-ok-edge rounded text-sm font-medium text-ok transition-colors mt-2"
                  >
                    View Hints
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <RotateCcw size={48} className="text-ink-3 mx-auto mb-4" />
            <p className="text-ink-3 text-lg mb-2">
              No labs available for replay yet
            </p>
            <p className="text-ink-3 text-sm">
              Complete labs and use hints to unlock replay eligibility
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 p-4 bg-surface-1 rounded border border-edge-strong">
          <p className="text-xs text-ink-3">
            Hint replay is available for 90 days from when you first request a
            hint in a lab. This allows you to revisit key concepts and practice
            advanced techniques without using lab attempts.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function ReplayEligibilityPage() {
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
      <ReplayContent />
    </Suspense>
  );
}
