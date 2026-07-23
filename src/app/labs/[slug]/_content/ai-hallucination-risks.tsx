import { db } from "@/lib/db";
import { AiHallucinationRisksClient } from "../_components/ai-hallucination-risks-client";

export async function AiHallucinationRisks({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AiHallucinationRisksClient labId={labId} completedStages={completedStages} />;
}
