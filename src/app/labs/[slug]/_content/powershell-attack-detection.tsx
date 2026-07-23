import { db } from "@/lib/db";
import { PowershellAttackDetectionClient } from "../_components/powershell-attack-detection-client";

export async function PowershellAttackDetection({
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
  return <PowershellAttackDetectionClient labId={labId} completedStages={completedStages} />;
}
