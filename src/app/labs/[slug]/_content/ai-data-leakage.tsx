import { db } from "@/lib/db";
import { AiDataLeakageClient } from "../_components/ai-data-leakage-client";

export async function AiDataLeakage({
  labId,
  userId,
}: {
  labId: string;
  userId: string;
}) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AiDataLeakageClient labId={labId} completedStages={completedStages} />;
}
