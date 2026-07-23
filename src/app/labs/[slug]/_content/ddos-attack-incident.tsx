import { db } from "@/lib/db";
import { DdosAttackIncidentClient } from "../_components/ddos-attack-incident-client";

export async function DdosAttackIncident({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <DdosAttackIncidentClient labId={labId} completedStages={completedStages} />;
}
