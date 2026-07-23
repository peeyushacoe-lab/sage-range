import { db } from "@/lib/db";
import { IocHuntingClient } from "../_components/ioc-hunting-client";

export async function IocHunting({
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
  return <IocHuntingClient labId={labId} completedStages={completedStages} />;
}
