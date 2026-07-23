import { db } from "@/lib/db";
import { InsiderThreatInvestigationClient } from "../_components/insider-threat-investigation-client";

export async function InsiderThreatInvestigation({
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
  return <InsiderThreatInvestigationClient labId={labId} completedStages={completedStages} />;
}
