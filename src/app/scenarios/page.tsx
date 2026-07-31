import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  galleryFilter,
  ratingSummariesFor,
  followedCreatorIds,
  rankingScore,
} from "@/lib/scenario-sharing";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community Scenarios · Sage Vault" };

function Stars({ average, count }: { average: number; count: number }) {
  if (count === 0) {
    return <span className="text-xs text-zinc-600">No ratings yet</span>;
  }
  return (
    <span className="flex items-center gap-1 text-xs text-amber-400">
      <Icon name="star" size={12} />
      <span className="font-mono font-semibold">{average.toFixed(1)}</span>
      <span className="text-zinc-600">({count})</span>
    </span>
  );
}

export default async function ScenarioGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const following = await followedCreatorIds(user.id);
  const followingOnly = filter === "following";

  const scenarios = await db.customScenario.findMany({
    where: {
      ...galleryFilter(),
      ...(followingOnly ? { createdById: { in: following } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      subtitle: true,
      difficulty: true,
      estimatedMinutes: true,
      tags: true,
      createdAt: true,
      createdById: true,
      clonedFromId: true,
      createdBy: { select: { id: true, displayName: true, email: true } },
      _count: { select: { clones: true } },
    },
  });

  const summaries = await ratingSummariesFor(scenarios.map((s) => s.id));

  // Rank by the weighted score so one five-star rating cannot top the gallery,
  // while keeping recency as the tie-break.
  const ranked = [...scenarios].sort((a, b) => {
    const sa = rankingScore(summaries.get(a.id)!);
    const sb = rankingScore(summaries.get(b.id)!);
    if (sb !== sa) return sb - sa;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const mine = await db.customScenario.count({ where: { createdById: user.id } });

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Community Scenarios"
          subtitle="Incidents written by other people on the platform. Run one, rate it, or clone it into a draft of your own."
          actions={
            <Link
              href="/scenarios/builder"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Build one
            </Link>
          }
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Published" value={scenarios.length} sub="in the gallery" />
          <StatCard label="Yours" value={mine} sub="authored" />
          <StatCard label="Following" value={following.length} sub="creators" />
          <StatCard
            label="Rated"
            value={[...summaries.values()].filter((s) => s.count > 0).length}
            sub="have feedback"
          />
        </div>

        <div className="mb-6 flex gap-2">
          <Link
            href="/scenarios"
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              !followingOnly
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 text-zinc-400 hover:border-white/25"
            }`}
          >
            All
          </Link>
          <Link
            href="/scenarios?filter=following"
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              followingOnly
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 text-zinc-400 hover:border-white/25"
            }`}
          >
            From creators you follow
          </Link>
        </div>

        {ranked.length === 0 ? (
          <EmptyState
            icon="layers"
            title={
              followingOnly
                ? "Nobody you follow has published yet"
                : "No community scenarios yet"
            }
            description={
              followingOnly
                ? "Follow a creator from any scenario page and their published work will appear here."
                : "Be the first to publish one. Anything you build starts private until you choose to share it."
            }
            action={{ label: "Open the builder", href: "/scenarios/builder" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ranked.map((s) => {
              const summary = summaries.get(s.id)!;
              return (
                <Card key={s.id} className="flex flex-col gap-2 p-5" interactive>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/scenarios/${s.id}`}
                      className="text-base font-semibold hover:text-emerald-400"
                    >
                      {s.title}
                    </Link>
                    <Badge tone="zinc">{s.difficulty}</Badge>
                  </div>

                  <p className="line-clamp-2 text-sm text-zinc-400">{s.subtitle}</p>

                  {s.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {s.tags.slice(0, 4).map((t) => (
                        <span
                          key={t}
                          className="rounded border border-white/8 px-1.5 py-0.5 text-[10px] text-zinc-500"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <span className="truncate text-xs text-zinc-600">
                      by {s.createdBy.displayName ?? s.createdBy.email.split("@")[0]}
                    </span>
                    <Stars average={summary.average} count={summary.count} />
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-zinc-700">
                    <span>{s.estimatedMinutes} min</span>
                    {s._count.clones > 0 && <span>{s._count.clones} clones</span>}
                    {s.clonedFromId && <span>cloned</span>}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
