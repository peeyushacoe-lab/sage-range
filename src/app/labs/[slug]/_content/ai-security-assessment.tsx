import { db } from "@/lib/db";
import { AiSecurityAssessmentClient } from "../_components/ai-security-assessment-client";

export async function AiSecurityAssessment({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AiSecurityAssessmentClient labId={labId} completedStages={completedStages} />;
}
