import { db } from "@/lib/db";
import { CloudDataBreachClient } from "../_components/cloud-data-breach-client";

export async function CloudDataBreach({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <CloudDataBreachClient labId={labId} completedStages={completedStages} />;
}
