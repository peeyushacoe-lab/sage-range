import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import {
  createDetectionRule,
  updateDetectionRule,
  validateRuleSyntax,
  type RuleType,
} from "@/lib/detection-rules";

const Body = z.object({
  challengeId: z.string().optional(),
  name: z.string().min(1).max(256).optional(),
  description: z.string().max(1000).optional(),
  ruleType: z.enum(["SIGMA", "KQL", "SPLUNK", "ELASTIC", "YARA"]),
  rule: z.record(z.unknown()),
  testDataset: z.string().optional(),
  submissionId: z.string().optional(), // For updates
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body", details: parsed.error }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`rules-submit:${user.id}`, { max: 50, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  try {
    const { submissionId, challengeId, name, description, ruleType, rule, testDataset, notes } = parsed.data;

    // If updating an existing rule
    if (submissionId) {
      const submission = await db.detectionSubmission.findUnique({
        where: { id: submissionId },
      });

      if (!submission) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      if (submission.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const result = await updateDetectionRule(submissionId, rule, ruleType as RuleType, notes);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error,
            validationErrors: (result as any).validationErrors || [],
          },
          { status: 400 }
        );
      }

      audit({
        actorId: user.id,
        action: "DETECTION_CHALLENGE_SUBMIT",
        target: submissionId,
        req,
        meta: { ruleType, version: (result as any).version },
      });

      return NextResponse.json(
        {
          submissionId: (result as any).submissionId,
          version: (result as any).version,
          f1Score: (result as any).f1Score,
          validationErrors: (result as any).validationErrors || [],
        },
        { status: 200 }
      );
    }

    // New submission
    if (!challengeId || !name || !description) {
      return NextResponse.json(
        { error: "Missing required fields: challengeId, name, description" },
        { status: 400 }
      );
    }

    const challenge = await db.detectionChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    const result = await createDetectionRule(user.id, challengeId, name, description, ruleType as RuleType, rule, testDataset);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          validationErrors: (result as any).validationErrors || [],
        },
        { status: 400 }
      );
    }

    audit({
      actorId: user.id,
      action: "DETECTION_CHALLENGE_SUBMIT",
      target: challengeId,
      req,
      meta: { ruleType, submissionId: (result as any).submissionId },
    });

    return NextResponse.json(
      {
        submissionId: (result as any).submissionId,
        version: (result as any).version,
        f1Score: (result as any).f1Score,
        validationErrors: (result as any).validationErrors || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting rule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
