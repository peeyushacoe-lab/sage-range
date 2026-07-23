import { db } from "@/lib/db";
import { SigmaToSentinelClient } from "../_components/sigma-to-sentinel-client";

export async function SigmaToSentinel({
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
  return <SigmaToSentinelClient labId={labId} completedStages={completedStages} />;
}
