import { db } from "@/lib/db";
import { BusinessEmailCompromiseClient } from "../_components/business-email-compromise-client";

export async function BusinessEmailCompromise({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <BusinessEmailCompromiseClient labId={labId} completedStages={completedStages} />;
}
