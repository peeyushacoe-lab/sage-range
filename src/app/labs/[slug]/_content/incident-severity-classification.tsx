import { db } from "@/lib/db";
import { IncidentSeverityClassificationClient } from "../_components/incident-severity-classification-client";

export async function IncidentSeverityClassification({
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
  return <IncidentSeverityClassificationClient labId={labId} completedStages={completedStages} />;
}
