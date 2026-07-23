import { db } from "@/lib/db";
import { BurpSuiteWorkflowClient } from "../_components/burp-suite-workflow-client";

export async function BurpSuiteWorkflow({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <BurpSuiteWorkflowClient labId={labId} completedStages={completedStages} />;
}
