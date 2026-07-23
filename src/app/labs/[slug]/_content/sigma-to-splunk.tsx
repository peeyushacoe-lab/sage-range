import { db } from "@/lib/db";
import { SigmaToSplunkClient } from "../_components/sigma-to-splunk-client";

export async function SigmaToSplunk({
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
  return <SigmaToSplunkClient labId={labId} completedStages={completedStages} />;
}
