import Link from "next/link";
import { db } from "@/lib/db";
import type { AppUser } from "@/lib/current-user";
import { Badge, Button, StatCard } from "@/components/ui";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

// A quality tier, not a severity — higher is better, so it never touches the
// danger/critical hues (those mean "bad" everywhere else in the app).
const RATING_TONE = {
  EXCEPTIONAL: "ok",
  STRONG: "info",
  ADEQUATE: "warn",
  DEVELOPING: "neutral",
} as const;

export async function RecruiterHome({ user }: { user: AppUser }) {
  const [candidateCount, bookmarkCount, activePostingCount, simGroups, bookmarkedCandidates, recentPostings] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.candidateBookmark.count({ where: { recruiterId: user.id } }),
    db.jobPosting.count({ where: { recruiterId: user.id, active: true } }),
    db.simulationSession.groupBy({
      by: ["userId"],
      where: { status: { in: ["CONTAINED", "BREACHED"] } },
    }),
    db.candidateBookmark.findMany({
      where: { recruiterId: user.id },
      include: { candidate: { select: { id: true, displayName: true, email: true, skillScore: true, university: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.jobPosting.findMany({
      where: { recruiterId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
  ]);

  const assessedCount = simGroups.length;

  // Get best sim scores for bookmarked candidates
  const bookmarkedIds = bookmarkedCandidates.map((b) => b.candidateId);
  const simScores = bookmarkedIds.length > 0
    ? await db.simulationSession.groupBy({
        by: ["userId"],
        where: { userId: { in: bookmarkedIds }, status: { in: ["CONTAINED", "BREACHED"] } },
        _max: { score: true },
      })
    : [];
  const simByUser = new Map(simScores.map((s) => [s.userId, s._max.score ?? 0]));

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-0.5 font-mono text-xs uppercase tracking-[0.14em] text-ink-3">Recruiter Hub</p>
          <h1 className="text-2xl font-medium text-ink">{user.displayName ?? user.email.split("@")[0]}</h1>
          <p className="mt-1 text-sm text-ink-2">Find, assess, and hire verified cybersecurity talent.</p>
        </div>
        <Link href="/recruiter"><Button variant="primary">Open Full Marketplace →</Button></Link>
      </div>

      {/* Stats — four counts, no shared meaning, so none of them borrow status colour */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total candidates" value={candidateCount} />
        <StatCard label="Saved / bookmarked" value={bookmarkCount} />
        <StatCard label="Active job postings" value={activePostingCount} />
        <StatCard label="Sim-assessed" value={assessedCount} />
      </div>

      {/* Saved candidates */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">Saved candidates</h2>
          <Link href="/recruiter" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">See all →</Link>
        </div>
        {bookmarkedCandidates.length === 0 ? (
          <div className="rounded-lg border border-edge bg-surface-1 p-8 text-center">
            <p className="mb-3 text-sm text-ink-3">No saved candidates yet.</p>
            <Link href="/recruiter" className="text-xs text-accent hover:underline">Browse candidates →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarkedCandidates.map((b) => {
              const simScore = simByUser.get(b.candidateId) ?? 0;
              const rating = simScore > 0 ? toRating(simScore) : null;
              return (
                <div key={b.candidateId} className="rounded-lg border border-edge bg-surface-1 p-4 transition-colors duration-fast hover:border-edge-strong">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{b.candidate.displayName ?? b.candidate.email.split("@")[0]}</p>
                      {b.candidate.university && <p className="text-xs text-ink-3">{b.candidate.university}</p>}
                    </div>
                    {rating && <Badge tone={RATING_TONE[rating]} className="shrink-0">{rating}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-3">
                    <span>Score: <span className="font-medium text-ink-2">{b.candidate.skillScore}</span></span>
                    {simScore > 0 && <span>Sim: <span className="font-medium text-ok">{simScore}</span></span>}
                  </div>
                  <Link href={`/profile/${b.candidateId}`} className="mt-3 block text-xs text-accent hover:underline">
                    View profile →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Job postings */}
      <section className="pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-2">My job postings</h2>
          <Link href="/recruiter" className="text-xs text-accent transition-colors duration-fast hover:text-accent-hover">Manage →</Link>
        </div>
        {recentPostings.length === 0 ? (
          <div className="rounded-lg border border-edge bg-surface-1 p-8 text-center">
            <p className="mb-3 text-sm text-ink-3">No postings yet.</p>
            <Link href="/recruiter" className="text-xs text-accent hover:underline">Create a job posting →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPostings.map((p) => (
              <div key={p.id} className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${p.active ? "border-edge bg-surface-1" : "border-edge-subtle opacity-50"}`}>
                <div>
                  <p className="text-sm font-medium text-ink">{p.title}</p>
                  <p className="text-xs text-ink-3">{p.company}</p>
                </div>
                <Badge tone={p.active ? "ok" : "neutral"}>{p.active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
