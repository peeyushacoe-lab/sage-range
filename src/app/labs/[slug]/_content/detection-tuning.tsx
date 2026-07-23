import { db } from "@/lib/db";
import { DetectionTuningClient } from "../_components/detection-tuning-client";

export async function DetectionTuning({
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
  return <DetectionTuningClient labId={labId} completedStages={completedStages} />;
}
