import { db } from "@/lib/db";
import { SigmaRuleCreationClient } from "../_components/sigma-rule-creation-client";

export async function SigmaRuleCreation({
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
  return <SigmaRuleCreationClient labId={labId} completedStages={completedStages} />;
}
