import { db } from "@/lib/db";
import { LinuxPersistenceHuntClient } from "../_components/linux-persistence-hunt-client";

export async function LinuxPersistenceHunt({
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
  return <LinuxPersistenceHuntClient labId={labId} completedStages={completedStages} />;
}
