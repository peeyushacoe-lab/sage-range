import { db } from "@/lib/db";
import { AdvancedSqlInjectionClient } from "../_components/advanced-sql-injection-client";

export async function AdvancedSqlInjection({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AdvancedSqlInjectionClient labId={labId} completedStages={completedStages} />;
}
