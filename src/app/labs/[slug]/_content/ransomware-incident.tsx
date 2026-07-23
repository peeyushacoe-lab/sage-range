import { db } from "@/lib/db";
import { RansomwareIncidentClient } from "../_components/ransomware-incident-client";

export async function RansomwareIncident({
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
  return <RansomwareIncidentClient labId={labId} completedStages={completedStages} />;
}
