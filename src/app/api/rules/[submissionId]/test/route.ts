import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { testRuleAgainstDataset } from "@/lib/detection-rules";
import { type RuleType } from "@/lib/detection-rules";

const Body = z.object({
  testDataset: z.string().min(1),
  maxResults: z.number().int().min(1).max(1000).default(100),
});

export async function POST(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { submissionId } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Get the rule
    const submission = await db.detectionSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    // Test the rule
    const startTime = Date.now();
    const result = await testRuleAgainstDataset(
      submission.rule as Record<string, unknown>,
      submission.ruleType as RuleType,
      parsed.data.testDataset,
      parsed.data.maxResults
    );
    const executionTimeMs = Date.now() - startTime;

    if (!result.success) {
      return NextResponse.json({ error: result.errors?.[0] || "Test failed" }, { status: 400 });
    }

    return NextResponse.json(
      {
        matches: result.matches,
        executionTimeMs,
        errors: result.errors || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error testing rule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
