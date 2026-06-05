import { db } from "@/lib/db";
import { PrivilegeEscalationClient } from "../_components/privilege-escalation-client";

export async function PrivilegeEscalation({
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
    <PrivilegeEscalationClient labId={labId} completedStages={completedStages} />
  );
}
