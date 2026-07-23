import { db } from "@/lib/db";
import { IocCorrelationClient } from "../_components/ioc-correlation-client";

export async function IocCorrelation({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <IocCorrelationClient labId={labId} completedStages={completedStages} />;
}
