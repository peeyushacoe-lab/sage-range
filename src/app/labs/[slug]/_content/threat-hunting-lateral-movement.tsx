import { db } from "@/lib/db";
import { ThreatHuntingLateralMovementClient } from "../_components/threat-hunting-lateral-movement-client";

export async function ThreatHuntingLateralMovement({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <ThreatHuntingLateralMovementClient labId={labId} completedStages={completedStages} />;
}
