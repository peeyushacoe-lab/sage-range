import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { calculateHuntScore } from "@/lib/hunt-utils";

const QueryParams = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(["score", "speed", "accuracy", "time"]).default("score"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  // Parse query parameters
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = QueryParams.safeParse(queryParams);

  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { limit, sortBy } = parsed.data;

  // Fetch the session
  const session = await db.huntInvestigationSession.findUnique({
    where: { id: sessionId },
    include: { dataset: true },
  });

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Fetch all completed sessions for this dataset (across all users)
  const sessions = await db.huntInvestigationSession.findMany({
    where: {
      datasetId: session.datasetId,
      status: "COMPLETED",
    },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
      artifacts: true,
      queries: true,
    },
  });

  // Calculate scores for each session
  const leaderboard = sessions
    .map((s) => {
      const expectedCount = session.dataset.expectedArtifacts.length;
      const foundCount = s.artifacts.length;
      const accuracy = expectedCount > 0 ? Math.round((foundCount / expectedCount) * 100) : 0;
      const durationSeconds = s.duration || 0;
      const score = calculateHuntScore(accuracy, s.queriesCount, durationSeconds);

      return {
        rank: 0, // Will be assigned after sorting
        userId: s.user.id,
        userName: s.user.displayName || s.user.email.split("@")[0],
        score,
        accuracy,
        queriesUsed: s.queriesCount,
        artifactsFound: foundCount,
        expectedArtifacts: expectedCount,
        duration: durationSeconds,
        completedAt: s.endedAt,
      };
    })
    .sort((a, b) => {
      // Sort by selected criteria
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "accuracy") return b.accuracy - a.accuracy;
      if (sortBy === "speed") return a.queriesUsed - b.queriesUsed; // Fewer queries = faster
      if (sortBy === "time") return a.duration - b.duration; // Less time = faster
      return b.score - a.score;
    })
    .slice(0, limit)
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

  // Find current user's rank if they have a completed session
  const userSession = sessions.find((s) => s.userId === user.id);
  let userRank: (typeof leaderboard[0]) | null = null;

  if (userSession) {
    const expectedCount = session.dataset.expectedArtifacts.length;
    const foundCount = userSession.artifacts.length;
    const accuracy = expectedCount > 0 ? Math.round((foundCount / expectedCount) * 100) : 0;
    const durationSeconds = userSession.duration || 0;
    const score = calculateHuntScore(accuracy, userSession.queriesCount, durationSeconds);

    userRank = {
      rank: leaderboard.findIndex((e) => e.userId === user.id) + 1,
      userId: user.id,
      userName: user.displayName || user.email.split("@")[0],
      score,
      accuracy,
      queriesUsed: userSession.queriesCount,
      artifactsFound: foundCount,
      expectedArtifacts: expectedCount,
      duration: durationSeconds,
      completedAt: userSession.endedAt,
    };
  }

  return NextResponse.json({
    leaderboard,
    metadata: {
      total: leaderboard.length,
      sortedBy: sortBy,
      userRank,
    },
  });
}
