import { db } from "@/lib/db";
import { CloudIncidentResponseClient } from "../_components/cloud-incident-response-client";

export async function CloudIncidentResponse({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <CloudIncidentResponseClient labId={labId} completedStages={completedStages} />;
}
