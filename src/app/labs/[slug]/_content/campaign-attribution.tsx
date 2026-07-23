import { db } from "@/lib/db";
import { CampaignAttributionClient } from "../_components/campaign-attribution-client";

export async function CampaignAttribution({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <CampaignAttributionClient labId={labId} completedStages={completedStages} />;
}
