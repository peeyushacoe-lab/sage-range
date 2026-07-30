import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { VisibilityToggle } from "./_components/visibility-toggle";

export const dynamic = "force-dynamic";

const GRADE_COLORS: Record<string, string> = {
  A: "text-sage-400 border-sage-500/40 bg-sage-500/10",
  B: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  C: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  D: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  F: "text-red-400 border-red-500/40 bg-red-500/10",
};

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const profileUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, email: true },
  });
  if (!profileUser) notFound();

  const viewer = await getOrCreateAppUser();
  const isOwnProfile = viewer?.id === userId;

  const items = await db.portfolioItem.findMany({
    where: {
      userId,
      // Non-owners only see public items
      ...(isOwnProfile ? {} : { isPublic: true }),
    },
    orderBy: { completedAt: "desc" },
    include: {
      submission: {
        include: {
          assessment: {
            include: {
              module: {
                include: {
                  path: { select: { title: true, slug: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const displayName = profileUser.displayName ?? profileUser.email;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref={`/profile/${userId}`} backLabel="Profile" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isOwnProfile ? "My Portfolio" : `${displayName}'s Portfolio`}
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              {items.length} approved assessment{items.length !== 1 ? "s" : ""}
              {!isOwnProfile && " (public only)"}
            </p>
          </div>
          {isOwnProfile && (
            <Link
              href="/paths"
              className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-sage-500/40 hover:text-sage-400 transition"
            >
              Browse Paths →
            </Link>
          )}
        </header>

        {items.length === 0 ? (
          <div className="rounded-xl border border-white/8 p-10 text-center">
            <p className="text-zinc-500 text-sm">
              {isOwnProfile
                ? "No portfolio items yet. Complete assessments in learning paths to build your portfolio."
                : "No public portfolio items yet."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const gradeColor = item.grade ? (GRADE_COLORS[item.grade] ?? "text-zinc-400 border-white/10") : null;
              const path = item.submission.assessment.module.path;
              const mod = item.submission.assessment.module;

              return (
                <div key={item.id} className="rounded-xl border border-white/8 p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-base">{item.title}</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        <Link href={`/paths/${path.slug}`} className="hover:text-zinc-300 transition">
                          {path.title}
                        </Link>
                        {" → "}
                        {mod.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.grade && gradeColor && (
                        <span className={`text-sm font-bold rounded-full border px-3 py-1 ${gradeColor}`}>
                          {item.grade}
                        </span>
                      )}
                      {isOwnProfile && (
                        <VisibilityToggle itemId={item.id} isPublic={item.isPublic} />
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">{item.description}</p>

                  {item.feedback && (
                    <div className="border-t border-white/8 pt-4">
                      <p className="text-xs uppercase tracking-widest text-zinc-600 mb-1">Mentor Feedback</p>
                      <p className="text-sm text-zinc-300 leading-relaxed">{item.feedback}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-zinc-600">
                      Completed {new Date(item.completedAt).toLocaleDateString()}
                    </p>
                    <span className="text-xs text-zinc-600 border border-white/8 rounded-full px-2 py-0.5">
                      {item.submission.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
