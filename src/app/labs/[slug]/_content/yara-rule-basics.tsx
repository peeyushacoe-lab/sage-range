import { db } from "@/lib/db";
import { YaraRuleBasicsClient } from "../_components/yara-rule-basics-client";

export async function YaraRuleBasics({
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
  return <YaraRuleBasicsClient labId={labId} completedStages={completedStages} />;
}
