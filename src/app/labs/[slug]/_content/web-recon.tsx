import { db } from "@/lib/db";
import { WebReconClient } from "../_components/web-recon-client";

export async function WebRecon({
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
  return (
    <WebReconClient labId={labId} completedStages={completedStages} />
  );
}
