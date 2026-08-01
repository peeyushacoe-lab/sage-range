import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  canViewScenario,
  canRateScenario,
  canCloneScenario,
  canEditScenario,
  canReportScenario,
  summariseRatings,
  isFollowing,
  type ScenarioVisibility,
} from "@/lib/scenario-sharing";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { ScenarioActions } from "./_components/scenario-actions";
import { RateScenario } from "./_components/rate-scenario";
import { ReportScenario } from "./_components/report-scenario";

export const dynamic = "force-dynamic";

const VISIBILITY_LABEL: Record<ScenarioVisibility, string> = {
  PRIVATE: "Private",
  UNLISTED: "Unlisted",
  COMMUNITY: "Community",
};

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const scenario = await db.customScenario.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, displayName: true, email: true } },
      clonedFrom: { select: { id: true, title: true } },
      ratings: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        include: { user: { select: { displayName: true, email: true } } },
      },
      _count: { select: { clones: true } },
    },
  });
  if (!scenario) notFound();

  const viewer = { userId: user.id, isAdmin: user.role === "ADMIN" };
  const acl = {
    createdById: scenario.createdById,
    visibility: scenario.visibility as ScenarioVisibility,
    published: scenario.published,
    takenDownAt: scenario.takenDownAt,
  };

  // A scenario the viewer may not open reads as absent rather than forbidden,
  // so a private draft's existence is not disclosed by guessing ids.
  if (!canViewScenario(acl, viewer)) notFound();

  const summary = summariseRatings(scenario.ratings.map((r) => r.stars));
  const myRating = scenario.ratings.find((r) => r.userId === user.id) ?? null;
  const following = await isFollowing(user.id, scenario.createdById);

  const myReport = await db.scenarioReport.findUnique({
    where: { scenarioId_reporterId: { scenarioId: scenario.id, reporterId: user.id } },
    select: { id: true },
  });

  const isAuthor = scenario.createdById === user.id;
  const authorName =
    scenario.createdBy.displayName ?? scenario.createdBy.email.split("@")[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/scenarios"
          className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          ← Community scenarios
        </Link>

        <PageHeader
          className="mb-6 mt-3"
          title={scenario.title}
          subtitle={scenario.subtitle}
          actions={
            <div className="flex items-center gap-2">
              <Badge tone="zinc">{scenario.difficulty}</Badge>
              {scenario.visibility !== "COMMUNITY" && (
                <Badge tone="amber">
                  {VISIBILITY_LABEL[scenario.visibility as ScenarioVisibility]}
                </Badge>
              )}
            </div>
          }
        />

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            by <span className="text-zinc-300">{authorName}</span>
            {scenario.clonedFrom && (
              <>
                {" · cloned from "}
                <Link
                  href={`/scenarios/${scenario.clonedFrom.id}`}
                  className="text-emerald-400 hover:underline"
                >
                  {scenario.clonedFrom.title}
                </Link>
              </>
            )}
          </p>

          <ScenarioActions
            scenarioId={scenario.id}
            creatorId={scenario.createdById}
            isAuthor={isAuthor}
            initiallyFollowing={following}
            canClone={canCloneScenario(acl, viewer)}
            canEdit={canEditScenario(acl, viewer)}
            visibility={scenario.visibility as ScenarioVisibility}
          />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Duration" value={`${scenario.estimatedMinutes}m`} sub="estimated" />
          <StatCard
            label="Rating"
            value={summary.count === 0 ? "—" : summary.average.toFixed(1)}
            sub={summary.count === 0 ? "unrated" : `${summary.count} ratings`}
          />
          <StatCard label="Clones" value={scenario._count.clones} sub="forks" />
          <StatCard label="Objectives" value={scenario.learningObjectives.length} sub="stated" />
        </div>

        {scenario.takenDownAt && (
          <Card className="mb-8 border-red-500/40 bg-red-500/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Removed by a moderator
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {scenario.takedownReason ??
                "This scenario was removed from the community gallery."}
            </p>
            {isAuthor && (
              <p className="mt-2 text-xs text-zinc-500">
                You can still read and edit it, but it cannot be republished to the
                gallery without a moderator restoring it.
              </p>
            )}
          </Card>
        )}

        <Card className="mb-8 p-6">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Briefing
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
            {scenario.briefing}
          </p>
        </Card>

        {scenario.learningObjectives.length > 0 && (
          <Card className="mb-8 p-6">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Learning objectives
            </h2>
            <ul className="space-y-2">
              {scenario.learningObjectives.map((o, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-300">
                  <Icon name="check" size={14} />
                  {o}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {scenario.realWorldAnalogue && (
          <Card className="mb-8 p-6">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Real-world analogue
            </h2>
            <p className="text-sm text-zinc-400">{scenario.realWorldAnalogue}</p>
          </Card>
        )}

        {/* ── Ratings ── */}
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Ratings
          </h2>

          {canRateScenario(acl, viewer) ? (
            <RateScenario
              scenarioId={scenario.id}
              initialStars={myRating?.stars ?? 0}
              initialReview={myRating?.review ?? ""}
            />
          ) : (
            <Card className="mb-4 p-4">
              <p className="text-xs text-zinc-500">
                {isAuthor
                  ? "You cannot rate your own scenario."
                  : "This scenario is not open for ratings."}
              </p>
            </Card>
          )}

          {scenario.ratings.filter((r) => r.review?.trim()).length > 0 && (
            <Card className="divide-y divide-white/5 p-0">
              {scenario.ratings
                .filter((r) => r.review?.trim())
                .map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">
                        {r.user.displayName ?? r.user.email.split("@")[0]}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <Icon name="star" size={12} />
                        <span className="font-mono">{r.stars}</span>
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">{r.review}</p>
                  </div>
                ))}
            </Card>
          )}
        </section>

        {canReportScenario(acl, viewer) && (
          <div className="mt-10 border-t border-white/8 pt-6">
            <ReportScenario scenarioId={scenario.id} alreadyReported={myReport != null} />
          </div>
        )}
      </div>
    </main>
  );
}
