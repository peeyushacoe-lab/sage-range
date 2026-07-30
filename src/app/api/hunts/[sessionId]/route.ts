import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;

  const session = await db.huntInvestigationSession.findUnique({
    where: { id: sessionId },
    include: {
      dataset: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          difficulty: true,
          category: true,
          logCount: true,
          expectedArtifacts: true,
        },
      },
      queries: {
        select: {
          id: true,
          query: true,
          language: true,
          resultCount: true,
          matchedIocs: true,
          executedAt: true,
        },
        orderBy: { executedAt: "desc" },
        take: 20, // Last 20 queries
      },
      artifacts: {
        select: {
          id: true,
          artifactId: true,
          type: true,
          value: true,
          confidence: true,
          foundAt: true,
        },
        orderBy: { foundAt: "desc" },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Ensure user owns this session
  if (session.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Calculate accuracy
  const expectedCount = session.dataset.expectedArtifacts.length;
  const foundCount = session.artifacts.length;
  const accuracy = expectedCount > 0 ? Math.round((foundCount / expectedCount) * 100) : 0;

  // Calculate duration
  const now = new Date();
  const duration = session.endedAt
    ? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
    : Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      duration,
      score: session.score,
    },
    dataset: session.dataset,
    progress: {
      queriesCount: session.queriesCount,
      artifactsFound: foundCount,
      expectedArtifacts: expectedCount,
      accuracy,
    },
    recentQueries: session.queries,
    artifacts: session.artifacts,
  });
}
