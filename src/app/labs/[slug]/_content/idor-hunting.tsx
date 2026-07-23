import { db } from "@/lib/db";
import { IdorHuntingClient } from "../_components/idor-hunting-client";

export async function IdorHunting({
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
  return <IdorHuntingClient labId={labId} completedStages={completedStages} />;
}
