import { db } from "@/lib/db";
import { InsiderDataTheftClient } from "../_components/insider-data-theft-client";

export async function InsiderDataTheft({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <InsiderDataTheftClient labId={labId} completedStages={completedStages} />;
}
