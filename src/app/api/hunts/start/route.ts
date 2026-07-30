import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { coinsForPoints } from "@/lib/soc-league";

const Body = z.object({
  datasetSlug: z.string().min(1),
});

const START_SESSION_BONUS = 10; // Small bonus for starting a hunt

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { datasetSlug } = parsed.data;

  // Rate limit: max 10 sessions per user per day
  const rl = await rateLimit(`hunt-start:${user.id}`, { max: 10, windowSec: 86400 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many hunt sessions. Wait 24 hours before starting another." },
      { status: 429, headers: { "Retry-After": "86400" } }
    );
  }

  // Fetch dataset
  const dataset = await db.huntDataset.findUnique({
    where: { slug: datasetSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      difficulty: true,
      expectedArtifacts: true,
    },
  });

  if (!dataset) return NextResponse.json({ error: "dataset_not_found" }, { status: 404 });

  // Check for existing active session
  const existingSession = await db.huntInvestigationSession.findFirst({
    where: {
      userId: user.id,
      datasetId: dataset.id,
      status: "ACTIVE",
    },
  });

  if (existingSession) {
    return NextResponse.json(
      { sessionId: existingSession.id, alreadyExists: true },
      { status: 200 }
    );
  }

  // Create new session
  const session = await db.huntInvestigationSession.create({
    data: {
      userId: user.id,
      datasetId: dataset.id,
      status: "ACTIVE",
      startedAt: new Date(),
    },
  });

  // Award small bonus for starting
  await db.user.update({
    where: { id: user.id },
    data: {
      coins: { increment: coinsForPoints(START_SESSION_BONUS) },
    },
  });

  audit({
    actorId: user.id,
    action: "FLAG_SUBMIT",
    target: session.id,
    req,
    meta: { datasetSlug, difficulty: dataset.difficulty },
  });

  return NextResponse.json({ sessionId: session.id, datasetName: dataset.name });
}
