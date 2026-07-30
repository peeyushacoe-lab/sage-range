import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { executeHuntQuery, maskSensitiveData } from "@/lib/hunt-utils";

const Body = z.object({
  query: z.string().min(1).max(10000),
  language: z.enum(["GREP", "REGEX", "KQL", "SQL_LITE", "NATURAL_LANGUAGE"]),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = await params;
  const { query, language } = parsed.data;

  // Rate limit: max 100 queries per session per day
  const rl = await rateLimit(`hunt-query:${sessionId}`, { max: 100, windowSec: 86400 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many queries in this session." },
      { status: 429, headers: { "Retry-After": "3600" } }
    );
  }

  // Fetch session
  const session = await db.huntInvestigationSession.findUnique({
    where: { id: sessionId },
    include: { dataset: true },
  });

  if (!session) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }

  // Ensure user owns this session
  if (session.userId !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Ensure session is active
  if (session.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "session_inactive", message: "This session is no longer active." },
      { status: 400 }
    );
  }

  try {
    // Execute query against dataset
    const result = await executeHuntQuery(
      session.datasetId,
      query,
      language,
      session.dataset.expectedArtifacts
    );

    // Mask sensitive data in results
    const maskedResults = result.sampleResults.map((r) => ({
      ...r,
      content: maskSensitiveData(r.content),
    }));

    // Store query in database
    const huntQuery = await db.huntQuery.create({
      data: {
        sessionId: session.id,
        query,
        language,
        resultCount: result.resultCount,
        matchedIocs: result.matchedIocs,
        isEffective: result.matchedIocs.length > 0,
      },
    });

    // Update session with query count and matched IoCscount
    await db.huntInvestigationSession.update({
      where: { id: session.id },
      data: {
        queriesCount: { increment: 1 },
      },
    });

    // Log audit trail
    audit({
      actorId: user.id,
      action: "FLAG_SUBMIT",
      target: session.id,
      req,
      meta: {
        language,
        resultCount: result.resultCount,
        matchedCount: result.matchedIocs.length,
      },
    });

    return NextResponse.json({
      queryId: huntQuery.id,
      resultCount: result.resultCount,
      matchedIocs: result.matchedIocs,
      results: maskedResults,
      isEffective: result.matchedIocs.length > 0,
      executedAt: huntQuery.executedAt,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Query execution failed";

    return NextResponse.json(
      { error: "query_error", message: errorMessage },
      { status: 400 }
    );
  }
}
