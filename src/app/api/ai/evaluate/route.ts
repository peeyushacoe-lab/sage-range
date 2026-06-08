import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { evaluateIncidentSummary } from "@/lib/ai";

const Body = z.object({ labResponseId: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const labResponse = await db.labResponse.findUnique({
    where: { id: parsed.data.labResponseId },
  });
  if (!labResponse || labResponse.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await db.aIEvaluation.findUnique({
    where: { labResponseId: parsed.data.labResponseId },
  });
  if (existing) return NextResponse.json({ evaluation: existing });

  const result = await evaluateIncidentSummary(labResponse.response);
  if (!result) {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  const evaluation = await db.aIEvaluation.create({
    data: {
      userId: user.id,
      labId: labResponse.labId,
      labResponseId: labResponse.id,
      accuracyScore: result.accuracyScore,
      clarityScore: result.clarityScore,
      completenessScore: result.completenessScore,
      recommendation: result.recommendation,
      feedback: result.feedback,
    },
  });

  return NextResponse.json({ evaluation });
}
