import { db } from "@/lib/db";
import { IocFeedIntegrationClient } from "../_components/ioc-feed-integration-client";

export async function IocFeedIntegration({
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
  return <IocFeedIntegrationClient labId={labId} completedStages={completedStages} />;
}
