import { db } from "@/lib/db";
import { MemoryForensicsClient } from "../_components/memory-forensics-client";

export async function MemoryForensics({
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
  return (
    <MemoryForensicsClient labId={labId} completedStages={completedStages} />
  );
}
