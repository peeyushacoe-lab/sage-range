import { db } from "@/lib/db";
import { AdvancedXssClient } from "../_components/advanced-xss-client";

export async function AdvancedXss({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AdvancedXssClient labId={labId} completedStages={completedStages} />;
}
