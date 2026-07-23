import { db } from "@/lib/db";
import { GcpIamPermissionsClient } from "../_components/gcp-iam-permissions-client";

export async function GcpIamPermissions({
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
  return <GcpIamPermissionsClient labId={labId} completedStages={completedStages} />;
}
