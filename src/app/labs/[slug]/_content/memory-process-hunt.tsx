import { db } from "@/lib/db";
import { MemoryProcessHuntClient } from "../_components/memory-process-hunt-client";

export async function MemoryProcessHunt({
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
  return <MemoryProcessHuntClient labId={labId} completedStages={completedStages} />;
}
