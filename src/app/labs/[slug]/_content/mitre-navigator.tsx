import { db } from "@/lib/db";
import { MitreNavigatorClient } from "../_components/mitre-navigator-client";

export async function MitreNavigator({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <MitreNavigatorClient labId={labId} completedStages={completedStages} />;
}
