import { db } from "@/lib/db";
import { SplunkDetectionHuntClient } from "../_components/splunk-detection-hunt-client";

export async function SplunkDetectionHunt({
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
  return <SplunkDetectionHuntClient labId={labId} completedStages={completedStages} />;
}
