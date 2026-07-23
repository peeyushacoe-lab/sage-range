import { db } from "@/lib/db";
import { CloudIamMisconfigurationClient } from "../_components/cloud-iam-misconfiguration-client";

export async function CloudIamMisconfiguration({
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
  return <CloudIamMisconfigurationClient labId={labId} completedStages={completedStages} />;
}
