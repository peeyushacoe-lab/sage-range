import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

const Body = z.object({
  artifactId: z.string().min(1), // Must match one from expectedArtifacts
  type: z.enum(["IP", "DOMAIN", "PROCESS", "FILE", "REGISTRY", "HASH", "USER", "EMAIL", "PORT"]),
  value: z.string().min(1).max(500),
  confidence: z.number().int().min(0).max(100), // User's confidence 0-100
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
  const { artifactId, type, value, confidence } = parsed.data;

  // Rate limit: max 50 artifact submissions per session per day
  const rl = await rateLimit(`hunt-artifact:${sessionId}`, { max: 50, windowSec: 86400 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many artifact submissions." },
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

  // Validate artifact matches one in expectedArtifacts
  const expectedFormat = `${type}:${value}`;
  const isValidArtifact = session.dataset.expectedArtifacts.some(
    (artifact) => artifact.toLowerCase() === expectedFormat.toLowerCase() || artifact === artifactId
  );

  if (!isValidArtifact) {
    return NextResponse.json(
      {
        error: "invalid_artifact",
        message: "This artifact does not match the expected findings for this dataset.",
        isCorrect: false,
      },
      { status: 400 }
    );
  }

  // Check if artifact already submitted in this session
  const existing = await db.huntArtifact.findUnique({
    where: { sessionId_artifactId: { sessionId, artifactId } },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: "duplicate_artifact",
        message: "This artifact has already been submitted in this session.",
        isCorrect: true,
      },
      { status: 409 }
    );
  }

  // Create artifact record
  const artifact = await db.huntArtifact.create({
    data: {
      sessionId,
      artifactId,
      type,
      value,
      confidence,
      foundAt: new Date(),
    },
  });

  // Update session artifact count
  await db.huntInvestigationSession.update({
    where: { id: sessionId },
    data: { artifactsFound: { increment: 1 } },
  });

  // Log audit trail
  audit({
    actorId: user.id,
    action: "FLAG_SUBMIT",
    target: sessionId,
    req,
    meta: { artifactId, type, confidence },
  });

  return NextResponse.json({
    id: artifact.id,
    isCorrect: true,
    message: "Artifact successfully submitted!",
    artifact: {
      id: artifact.id,
      artifactId: artifact.artifactId,
      type: artifact.type,
      value: artifact.value,
      confidence: artifact.confidence,
      foundAt: artifact.foundAt,
    },
  });
}
