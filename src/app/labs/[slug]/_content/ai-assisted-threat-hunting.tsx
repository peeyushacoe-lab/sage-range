import { db } from "@/lib/db";
import { AiAssistedThreatHuntingClient } from "../_components/ai-assisted-threat-hunting-client";

export async function AiAssistedThreatHunting({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AiAssistedThreatHuntingClient labId={labId} completedStages={completedStages} />;
}
