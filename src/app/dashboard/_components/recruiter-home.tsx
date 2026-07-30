import Link from "next/link";
import { db } from "@/lib/db";
import type { AppUser } from "@/lib/current-user";

function toRating(score: number) {
  if (score >= 88) return "EXCEPTIONAL";
  if (score >= 68) return "STRONG";
  if (score >= 48) return "ADEQUATE";
  return "DEVELOPING";
}

const RATING_COLOR: Record<string, string> = {
  EXCEPTIONAL: "text-sage-400 border-sage-500/40 bg-sage-500/8",
  STRONG:      "text-blue-400 border-blue-500/40 bg-blue-500/8",
  ADEQUATE:    "text-amber-400 border-amber-500/40 bg-amber-500/8",
  DEVELOPING:  "text-zinc-400 border-zinc-600 bg-zinc-800",
};

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
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Recruiter Hub</p>
          <h1 className="text-2xl font-bold text-zinc-100">{user.displayName ?? user.email.split("@")[0]}</h1>
          <p className="text-sm text-zinc-400 mt-1">Find, assess, and hire verified cybersecurity talent.</p>
        </div>
        <Link href="/recruiter"
          className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition">
          Open Full Marketplace →
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Candidates", value: candidateCount, color: "text-zinc-100" },
          { label: "Saved / Bookmarked", value: bookmarkCount, color: "text-amber-400" },
          { label: "Active Job Postings", value: activePostingCount, color: "text-sage-400" },
          { label: "Sim-Assessed", value: assessedCount, color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Saved candidates */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Saved Candidates</h2>
          <Link href="/recruiter" className="text-xs text-amber-400 hover:text-amber-300 transition">See all →</Link>
        </div>
        {bookmarkedCandidates.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-8 text-center">
            <p className="text-zinc-500 text-sm mb-3">No saved candidates yet.</p>
            <Link href="/recruiter" className="text-xs text-amber-400 hover:underline">Browse candidates →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bookmarkedCandidates.map((b) => {
              const simScore = simByUser.get(b.candidateId) ?? 0;
              const rating = simScore > 0 ? toRating(simScore) : null;
              return (
                <div key={b.candidateId} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 hover:border-white/15 transition">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-zinc-100 text-sm">{b.candidate.displayName ?? b.candidate.email.split("@")[0]}</p>
                      {b.candidate.university && <p className="text-xs text-zinc-500">{b.candidate.university}</p>}
                    </div>
                    {rating && (
                      <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 shrink-0 ${RATING_COLOR[rating]}`}>
                        {rating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>Score: <span className="text-zinc-300 font-semibold">{b.candidate.skillScore}</span></span>
                    {simScore > 0 && <span>Sim: <span className="text-sage-400 font-semibold">{simScore}</span></span>}
                  </div>
                  <Link href={`/profile/${b.candidateId}`} className="mt-3 block text-xs text-amber-400 hover:underline">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">My Job Postings</h2>
          <Link href="/recruiter" className="text-xs text-amber-400 hover:text-amber-300 transition">Manage →</Link>
        </div>
        {recentPostings.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-8 text-center">
            <p className="text-zinc-500 text-sm mb-3">No postings yet.</p>
            <Link href="/recruiter" className="text-xs text-amber-400 hover:underline">Create a job posting →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPostings.map((p) => (
              <div key={p.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${p.active ? "border-white/8 bg-zinc-900/40" : "border-white/4 opacity-50"}`}>
                <div>
                  <p className="font-semibold text-zinc-100 text-sm">{p.title}</p>
                  <p className="text-xs text-zinc-500">{p.company}</p>
                </div>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${p.active ? "bg-sage-500/15 text-sage-400" : "bg-zinc-700 text-zinc-500"}`}>
                  {p.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
