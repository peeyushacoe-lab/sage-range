import { db } from "@/lib/db";
import { PhishingClickIncidentClient } from "../_components/phishing-click-incident-client";

export async function PhishingClickIncident({
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
  return <PhishingClickIncidentClient labId={labId} completedStages={completedStages} />;
}
