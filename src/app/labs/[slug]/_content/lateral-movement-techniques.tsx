import { db } from "@/lib/db";
import { LateralMovementTechniquesClient } from "../_components/lateral-movement-techniques-client";

export async function LateralMovementTechniques({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <LateralMovementTechniquesClient labId={labId} completedStages={completedStages} />;
}
