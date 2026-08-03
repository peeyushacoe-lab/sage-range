import { redirect } from "next/navigation";
import Link from "next/link";

import { getOrCreateAppUser } from "@/lib/current-user";
import { getSession } from "@/lib/academy-review";
import { Navbar } from "@/components/navbar";
import { ReviewClient } from "./_components/review-client";

export const dynamic = "force-dynamic";

export default async function AcademyReviewPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in?next=/academy/review");

  const { cards, stats, nextDueAt } = await getSession(user.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <header className="border-b border-white/8 bg-zinc-900/40">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <Link
              href="/academy"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              ← Academy
            </Link>
            <h1 className="text-xl font-bold mt-1">Review</h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cards resurface just before you would have forgotten them.
            </p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-2xl font-bold text-emerald-400 tabular-nums">{stats.due}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">due now</p>
          </div>
        </div>
      </header>

      <ReviewClient
        initialCards={cards.map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          lessonId: c.lessonId,
          lessonTitle: c.lessonTitle,
          courseSlug: c.courseSlug,
          courseTitle: c.courseTitle,
          state: {
            repetitions: c.state.repetitions,
            intervalDays: c.state.intervalDays,
            easeFactor: c.state.easeFactor,
            dueAt: c.state.dueAt.toISOString(),
            lapses: c.state.lapses,
            reviews: c.state.reviews,
          },
        }))}
        initialStats={stats}
        nextDueAt={nextDueAt?.toISOString() ?? null}
      />
    </div>
  );
}
