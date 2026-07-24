import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const DIFF_COLORS: Record<string, string> = {
  EASY: "text-sage-500",
  MEDIUM: "text-amber-400",
  HARD: "text-orange-400",
  INSANE: "text-red-400",
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Detection Validation Engine</h1>
          <p className="text-zinc-400 mt-2 max-w-2xl">
            Write field/operator/value detection rules against a pre-labeled synthetic event log and get graded on
            precision, recall, and F1 — the same metrics a real detection engineering team lives by.
          </p>
        </header>

        {challenges.length === 0 ? (
          <p className="text-zinc-500 text-sm">No detection challenges published yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {challenges.map((c) => {
              const best = bestByChallenge.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/detection-lab/${c.slug}`}
                  className={`rounded-xl border p-5 flex flex-col gap-3 transition ${
                    best?.passed ? "border-sage-500/40 bg-sage-500/5" : "border-white/8 bg-zinc-900/60 hover:border-sage-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono ${DIFF_COLORS[c.difficulty] ?? "text-zinc-400"}`}>
                      {c.difficulty}
                    </span>
                    <span className="text-xs font-bold text-zinc-400 font-mono">{c.points} pts</span>
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {c.title}
                      {best?.passed && <span className="text-sage-500">✓</span>}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-2 line-clamp-2 leading-relaxed">{c.description}</p>
                  </div>
                  {best && (
                    <div className="text-xs font-mono text-zinc-500 mt-auto pt-1">
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
