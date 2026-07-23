import { db } from "@/lib/db";
import { PersistenceDetectionClient } from "../_components/persistence-detection-client";

export async function PersistenceDetection({
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
  return <PersistenceDetectionClient labId={labId} completedStages={completedStages} />;
}
