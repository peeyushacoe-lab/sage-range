import { db } from "@/lib/db";
import { HydraAdvancedClient } from "../_components/hydra-advanced-client";

export async function HydraAdvanced({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <HydraAdvancedClient labId={labId} completedStages={completedStages} />;
}
