import { db } from "@/lib/db";
import { MitreAttackMappingClient } from "../_components/mitre-attack-mapping-client";

export async function MitreAttackMapping({
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
  return <MitreAttackMappingClient labId={labId} completedStages={completedStages} />;
}
