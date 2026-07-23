import { db } from "@/lib/db";
import { DetectionLogicBuildingClient } from "../_components/detection-logic-building-client";

export async function DetectionLogicBuilding({
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
  return <DetectionLogicBuildingClient labId={labId} completedStages={completedStages} />;
}
