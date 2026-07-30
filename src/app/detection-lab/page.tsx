import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-ok",
  MEDIUM: "text-warn",
  HARD: "text-sev-high",
  INSANE: "text-danger",
};

export default async function DetectionLabIndex() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const challenges = await db.detectionChallenge.findMany({
    where: { published: true },
    orderBy: { difficulty: "asc" },
  });

  const bestByChallenge = new Map<string, { precision: number; recall: number; f1: number; passed: boolean }>();
  const submissions = await db.detectionSubmission.findMany({
    where: { userId: user.id, challengeId: { in: challenges.map((c) => c.id) } },
    orderBy: { f1: "desc" },
  });
  for (const s of submissions) {
    if (!bestByChallenge.has(s.challengeId)) {
      bestByChallenge.set(s.challengeId, { precision: s.precision, recall: s.recall, f1: s.f1, passed: s.passed });
    }
  }

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Detection Validation Engine"
          subtitle="Write field/operator/value detection rules against a pre-labeled synthetic event log and get graded on precision, recall, and F1 — the same metrics a real detection engineering team lives by."
        />

        {challenges.length === 0 ? (
          <EmptyState icon="simulations" title="No detection challenges published yet" description="Check back soon for a new dataset to hunt through." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((c) => {
              const best = bestByChallenge.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/detection-lab/${c.slug}`}
                  className={`rounded-xl border p-5 flex flex-col gap-3 transition ${
                    best?.passed ? "border-ok-edge bg-ok-wash" : "border-edge bg-surface-1 hover:border-ok-edge"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${DIFF_COLORS[c.difficulty] ?? "text-ink-2"}`}>
                      {c.difficulty}
                    </span>
                    <span className="text-xs font-bold text-ink-2 font-mono">{c.points} pts</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {c.title}
                      {best?.passed && <span className="text-ok"><Icon name="check" size={14} className="inline-block shrink-0" /></span>}
                    </h3>
                    <p className="text-sm text-ink-2 mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
                  </div>
                  {best && (
                    <div className="text-xs font-mono text-ink-3 mt-auto pt-1">
                      Best: {Math.round(best.precision * 100)}% precision · {Math.round(best.recall * 100)}% recall · F1 {best.f1.toFixed(2)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
