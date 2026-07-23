import { db } from "@/lib/db";
import { DcsyncAttackClient } from "../_components/dcsync-attack-client";

export async function DcsyncAttack({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <DcsyncAttackClient labId={labId} completedStages={completedStages} />;
}
