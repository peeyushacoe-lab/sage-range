import React from "react";
import { db } from "@/lib/db";
import { VisitorStats } from "../../../_components/visitor-stats";

/**
 * Server Component to fetch visitor analytics data
 * Renders the VisitorStats client component with data
 */
export async function VisitorStatsServer({
  portfolioId,
}: {
  portfolioId: string;
}) {
  // Fetch visitor logs from the past 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [recentVisitors, allViewsCount, uniqueVisitorsCount] = await Promise.all([
    // Get recent visitors
    db.portfolioVisitorLog.findMany({
      where: {
        portfolioId,
        viewedAt: { gte: thirtyDaysAgo },
      },
      include: {
        visitor: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: { viewedAt: "desc" },
      take: 10,
    }),
    // Count total views
    db.portfolioVisitorLog.count({
      where: {
        portfolioId,
        viewedAt: { gte: thirtyDaysAgo },
      },
    }),
    // Count unique visitors
    db.portfolioVisitorLog.findMany({
      where: {
        portfolioId,
        viewedAt: { gte: thirtyDaysAgo },
      },
      distinct: ["visitorId"],
      select: { visitorId: true },
    }),
  ]);

  return (
    <VisitorStats
      recentVisitors={recentVisitors as any}
      totalViews30d={allViewsCount}
      uniqueVisitors30d={uniqueVisitorsCount.length}
    />
  );
}
