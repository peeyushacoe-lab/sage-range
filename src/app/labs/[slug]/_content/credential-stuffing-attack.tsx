import { db } from "@/lib/db";
import { CredentialStuffingAttackClient } from "../_components/credential-stuffing-attack-client";

export async function CredentialStuffingAttack({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <CredentialStuffingAttackClient labId={labId} completedStages={completedStages} />;
}
