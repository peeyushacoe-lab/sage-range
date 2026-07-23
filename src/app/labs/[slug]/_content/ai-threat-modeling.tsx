import { db } from "@/lib/db";
import { AiThreatModelingClient } from "../_components/ai-threat-modeling-client";

export async function AiThreatModeling({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AiThreatModelingClient labId={labId} completedStages={completedStages} />;
}
