import { db } from "@/lib/db";
import { AzureRbacMisconfigurationClient } from "../_components/azure-rbac-misconfiguration-client";

export async function AzureRbacMisconfiguration({
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
  return <AzureRbacMisconfigurationClient labId={labId} completedStages={completedStages} />;
}
