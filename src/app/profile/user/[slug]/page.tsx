import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { Icon } from "@/components/ui/icon";
import { StatsCards } from "../../_components/stats-cards";
import { MitreHeatmap } from "../../_components/mitre-heatmap";
import { AchievementGrid } from "../../_components/achievement-grid";
import { PortfolioEditorClient } from "./_components/portfolio-editor-client";
import { VisitorStatsServer } from "./_components/visitor-stats-server";

export const dynamic = "force-dynamic";

/**
 * Career Portfolio Display Page
 * Displays user's career portfolio with achievements, MITRE coverage, and stats
 * Supports public, private, and recruiter-only visibility
 */
export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const currentUser = await getOrCreateAppUser();

  // Fetch portfolio by slug
  const portfolio = await db.careerPortfolio.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          role: true,
          university: true,
          company: true,
          jobTitle: true,
          linkedIn: true,
          github: true,
          website: true,
        },
      },
      achievements: {
        orderBy: [{ displayOrder: "desc" }, { earnedAt: "desc" }],
      },
      mitreCoverage: true,
    },
  });

  if (!portfolio) {
    notFound();
  }

  // Check visibility
  if (portfolio.visibility === "PRIVATE") {
    if (!currentUser || currentUser.id !== portfolio.userId) {
      notFound();
    }
  } else if (portfolio.visibility === "RECRUITER_ONLY") {
    if (!currentUser || currentUser.role !== "RECRUITER") {
      notFound();
    }
  }

  const isOwnProfile = currentUser?.id === portfolio.userId;
  const user = portfolio.user;

  // Parse MITRE heatmap data
  const mitreData = (portfolio.mitreCoverage?.heatmap as Record<string, number>) || {};

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user.displayName || user.email.split("@")[0]}
            </h1>
            <p className="text-ink-2 text-sm mt-1">{user.email}</p>
            {user.university && (
              <p className="text-ink-3 text-sm mt-0.5">{user.university}</p>
            )}
            {user.jobTitle && (
              <p className="text-ink-2 text-sm mt-0.5">
                {user.jobTitle}
                {user.company ? ` · ${user.company}` : ""}
              </p>
            )}
          </div>

          {isOwnProfile && <PortfolioEditorClient portfolio={portfolio} />}
        </div>

        {/* Two-column layout: desktop, single column: mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left Column (60%) */}
          <div className="space-y-8">
            {/* Bio */}
            {portfolio.bio && (
              <div className="rounded-xl border border-edge bg-surface-1 p-6">
                <p className="text-sm text-ink-2 leading-relaxed">
                  {portfolio.bio}
                </p>
              </div>
            )}

            {/* Stats */}
            <div>
              <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-4">
                Career Summary
              </h2>
              <StatsCards
                stats={{
                  totalLabsSolved: portfolio.totalLabsSolved,
                  totalIncidentsSolved: portfolio.totalIncidentsSolved,
                  totalWeeklyCerts: portfolio.totalWeeklyCerts,
                  totalCompetitionsWon: portfolio.totalCompetitionsWon,
                  totalRulesShared: portfolio.totalRulesShared,
                  huntsCompleted: portfolio.huntsCompleted,
                }}
              />
            </div>

            {/* MITRE Heatmap */}
            <div>
              <MitreHeatmap
                data={mitreData}
                topTactics={portfolio.mitreTopTactics}
              />
            </div>

            {/* Achievements */}
            <div>
              <AchievementGrid achievements={portfolio.achievements as any} />
            </div>
          </div>

          {/* Right Column (40%) */}
          <div className="space-y-6">
            {/* Visibility badge */}
            {isOwnProfile && (
              <div className="rounded-xl border border-edge bg-surface-1 p-4">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">
                  Visibility
                </p>
                <div className="flex items-center gap-2">
                  <Icon
                    name={
                      portfolio.visibility === "PRIVATE"
                        ? "lock"
                        : portfolio.visibility === "RECRUITER_ONLY"
                        ? "eye"
                        : "globe"
                    }
                    size={16}
                    variant="current"
                    className="text-ink-3"
                  />
                  <span className="text-sm font-medium text-ink-2">
                    {portfolio.visibility === "PRIVATE"
                      ? "Private"
                      : portfolio.visibility === "RECRUITER_ONLY"
                      ? "Recruiters Only"
                      : "Public"}
                  </span>
                </div>
                <p className="text-xs text-ink-3 mt-2">
                  {portfolio.visibility === "PRIVATE"
                    ? "Only you can see this portfolio"
                    : portfolio.visibility === "RECRUITER_ONLY"
                    ? "Only verified recruiters can see this"
                    : "Anyone can view this portfolio"}
                </p>
              </div>
            )}

            {/* Links */}
            {(user.linkedIn || user.github || user.website) && (
              <div className="rounded-xl border border-edge bg-surface-1 p-4">
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">
                  Connect
                </p>
                <div className="flex flex-col gap-2">
                  {user.linkedIn && (
                    <a
                      href={user.linkedIn}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-info hover:text-info transition flex items-center gap-2"
                    >
                      <Icon name="users" size={16} variant="current" />
                      LinkedIn
                    </a>
                  )}
                  {user.github && (
                    <a
                      href={user.github}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-ink-2 hover:text-ink-2 transition flex items-center gap-2"
                    >
                      <Icon name="link" size={16} variant="current" />
                      GitHub
                    </a>
                  )}
                  {user.website && (
                    <a
                      href={user.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-ok hover:text-ok transition flex items-center gap-2"
                    >
                      <Icon name="globe" size={16} variant="current" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Visitor Analytics - only for own profile */}
            {isOwnProfile && (
              <VisitorStatsServer portfolioId={portfolio.id} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
