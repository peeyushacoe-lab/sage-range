import { db } from "@/lib/db";
import { SsrfAttackClient } from "../_components/ssrf-attack-client";

export async function SsrfAttack({
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
    <SsrfAttackClient labId={labId} completedStages={completedStages} />
  );
}
