import { db } from "@/lib/db";
import { AiDetectionEvaluationClient } from "../_components/ai-detection-evaluation-client";

export async function AiDetectionEvaluation({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AiDetectionEvaluationClient labId={labId} completedStages={completedStages} />;
}
