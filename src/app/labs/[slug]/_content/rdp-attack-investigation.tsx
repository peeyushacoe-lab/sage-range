import { db } from "@/lib/db";
import { RdpAttackInvestigationClient } from "../_components/rdp-attack-investigation-client";

export async function RdpAttackInvestigation({
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
  return <RdpAttackInvestigationClient labId={labId} completedStages={completedStages} />;
}
