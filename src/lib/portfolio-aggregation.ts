import { db } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug-utils";

/**
 * Update portfolio aggregates for a specific user.
 * Checks for new achievements since last computation and updates portfolio stats.
 */
export async function updatePortfolioAggregates(userId: string) {
  // Get or create portfolio
  let portfolio = await db.careerPortfolio.findUnique({
    where: { userId },
  });

  if (!portfolio) {
    // Create portfolio if doesn't exist
    const user = await db.user.findUnique({ where: { id: userId } });
    // Throw rather than return undefined: the batch runner records this per
    // user, and callers can rely on always receiving a portfolio back.
    if (!user) throw new Error(`No user ${userId} to build a portfolio for`);

    const slug = await generateUniqueSlug(user.displayName || user.email);
    portfolio = await db.careerPortfolio.create({
      data: {
        userId,
        slug,
      },
    });
  }

  const lastComputedAt = portfolio.lastComputedAt || new Date(0);

  // Collect all new achievements
  const achievements: Array<{
    type: string;
    title: string;
    description: string;
    icon: string;
    relatedId: string | null;
    earnedAt: Date;
  }> = [];

  // 1. Labs solved since last computation
  const newLabsSolved = await db.attempt.findMany({
    where: {
      userId,
      status: "SOLVED",
      solvedAt: { gt: lastComputedAt },
    },
    include: { lab: true },
  });

  for (const attempt of newLabsSolved) {
    achievements.push({
      type: "LAB_SOLVED",
      title: `Solved: ${attempt.lab.title}`,
      description: `Completed ${attempt.lab.title} lab at difficulty ${attempt.lab.difficulty}`,
      icon: "⚡",
      relatedId: attempt.lab.slug,
      earnedAt: attempt.solvedAt!,
    });
  }

  // 2. Incidents completed since last computation
  const newIncidentsCompleted = await db.incidentSimProgress.findMany({
    where: {
      userId,
      completedAt: { gt: lastComputedAt },
    },
    include: { simulation: true },
    distinct: ["simulationId"],
  });

  for (const progress of newIncidentsCompleted) {
    achievements.push({
      type: "INCIDENT_COMPLETED",
      title: `Completed: ${progress.simulation.title}`,
      description: `Finished incident simulation "${progress.simulation.title}"`,
      icon: "🔥",
      relatedId: progress.simulation.slug,
      earnedAt: progress.completedAt,
    });
  }

  // 3. Weekly certificates issued since last computation
  const newWeeklyCerts = await db.weeklyIncidentCertificate.findMany({
    where: {
      issuedAt: { gt: lastComputedAt },
      case: {
        leaderboard: {
          some: {
            userId,
            completedAt: { not: null },
          },
        },
      },
    },
    include: { case: true },
  });

  for (const cert of newWeeklyCerts) {
    achievements.push({
      type: "WEEKLY_CERT",
      title: `Weekly Champion: Week ${cert.weekNumber}`,
      description: `Earned weekly incident certificate for season ${cert.season}`,
      icon: "🏆",
      relatedId: cert.id,
      earnedAt: cert.issuedAt,
    });
  }

  // 4. Competition wins since last computation
  const newCompetitionWins = await db.competitionEntry.findMany({
    where: {
      userId,
      completedAt: { gt: lastComputedAt },
    },
    include: { competition: true },
  });

  for (const entry of newCompetitionWins) {
    achievements.push({
      type: "COMPETITION_COMPLETED",
      title: `Completed: ${entry.competition.name}`,
      description: `Finished competition with score ${entry.score}`,
      icon: "🎯",
      relatedId: entry.competition.slug,
      earnedAt: entry.completedAt!,
    });
  }

  // 5. Hunt sessions completed since last computation
  const newHuntSessions = await db.huntInvestigationSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      endedAt: { gt: lastComputedAt },
    },
    include: { dataset: true },
  });

  for (const session of newHuntSessions) {
    achievements.push({
      type: "HUNT_COMPLETED",
      title: `Hunt Complete: ${session.dataset.name}`,
      description: `Found ${session.artifactsFound} artifacts in "${session.dataset.name}" hunt`,
      icon: "🔍",
      relatedId: session.dataset.slug,
      earnedAt: session.endedAt!,
    });
  }

  // 6. Detection rules shared since last computation
  const newSharedRules = await db.detectionRuleShareAcl.findMany({
    where: {
      sharedBy: userId,
      sharedAt: { gt: lastComputedAt },
    },
  });

  if (newSharedRules.length > 0) {
    achievements.push({
      type: "RULES_SHARED",
      title: `Shared ${newSharedRules.length} Detection Rule(s)`,
      description: `Published detection rules to the community`,
      icon: "📋",
      relatedId: null,
      earnedAt: newSharedRules[newSharedRules.length - 1].sharedAt,
    });
  }

  // Insert new achievements
  for (let i = 0; i < achievements.length; i++) {
    await db.careerPortfolioAchievement.create({
      data: {
        portfolioId: portfolio.id,
        type: achievements[i].type,
        title: achievements[i].title,
        description: achievements[i].description,
        icon: achievements[i].icon,
        relatedId: achievements[i].relatedId,
        earnedAt: achievements[i].earnedAt,
        displayOrder: achievements.length - i, // Most recent first
      },
    });
  }

  // Count totals
  const totalLabsSolved = await db.attempt.count({
    where: { userId, status: "SOLVED" },
  });

  // count() has no distinct — group by simulation so replays count once.
  const totalIncidentsSolved = (
    await db.incidentSimProgress.groupBy({
      by: ["simulationId"],
      where: { userId },
    })
  ).length;

  const totalWeeklyCerts = await db.weeklyIncidentLeaderboard.count({
    where: { userId, completedAt: { not: null } },
  });

  const totalCompetitionsWon = await db.competitionEntry.count({
    where: { userId, completedAt: { not: null } },
  });

  const totalRulesShared = await db.detectionRuleShareAcl.count({
    where: { sharedBy: userId },
  });

  const huntsCompleted = await db.huntInvestigationSession.count({
    where: { userId, status: "COMPLETED" },
  });

  // Compute MITRE coverage heatmap
  const mitreCoverage = await computeMitreCoverage(userId);
  const topTactics = getTopTactics(mitreCoverage);

  // Update portfolio
  const updatedPortfolio = await db.careerPortfolio.update({
    where: { id: portfolio.id },
    data: {
      totalLabsSolved,
      totalIncidentsSolved,
      totalWeeklyCerts,
      totalCompetitionsWon,
      totalRulesShared,
      huntsCompleted,
      mitreTopTactics: topTactics,
      lastComputedAt: new Date(),
    },
    include: {
      achievements: true,
      mitreCoverage: true,
    },
  });

  // Update or create MITRE coverage
  await db.careerPortfolioMitreCoverage.upsert({
    where: { portfolioId: portfolio.id },
    create: {
      portfolioId: portfolio.id,
      heatmap: mitreCoverage,
    },
    update: {
      heatmap: mitreCoverage,
    },
  });

  return updatedPortfolio;
}

/**
 * Compute MITRE ATT&CK coverage heatmap for a user
 * Returns object with tactic names as keys and counts as values
 */
async function computeMitreCoverage(userId: string) {
  const tactics: Record<string, number> = {
    INITIAL_ACCESS: 0,
    PERSISTENCE: 0,
    PRIVILEGE_ESCALATION: 0,
    LATERAL_MOVEMENT: 0,
    COMMAND_AND_CONTROL: 0,
    EXFILTRATION: 0,
    IMPACT: 0,
  };

  // Get all incidents completed by user
  const completedIncidents = await db.incidentSimProgress.findMany({
    where: { userId },
    select: { simulationId: true },
    distinct: ["simulationId"],
  });

  const simulationIds = completedIncidents.map((c) => c.simulationId);

  // Count artifacts per tactic
  if (simulationIds.length > 0) {
    const artifacts = await db.incidentSimArtifact.findMany({
      where: {
        simulationId: { in: simulationIds },
        tactic: { not: null },
      },
      select: { tactic: true },
    });

    for (const artifact of artifacts) {
      if (artifact.tactic) {
        tactics[artifact.tactic]++;
      }
    }
  }

  return tactics;
}

/**
 * Get top 5 MITRE tactics by count
 */
function getTopTactics(heatmap: Record<string, number>): string[] {
  return Object.entries(heatmap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tactic]) => tactic);
}

/**
 * Run portfolio aggregation for all users
 * Called periodically (e.g., every 5 minutes) by a cron job
 */
export async function runPortfolioAggregationBatch() {
  // Get all users
  const users = await db.user.findMany({
    select: { id: true },
  });

  const results = {
    processed: 0,
    errors: 0,
    errorDetails: [] as string[],
  };

  for (const user of users) {
    try {
      await updatePortfolioAggregates(user.id);
      results.processed++;
    } catch (error) {
      results.errors++;
      results.errorDetails.push(
        `User ${user.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  return results;
}
