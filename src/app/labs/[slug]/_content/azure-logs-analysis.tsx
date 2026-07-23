import { db } from "@/lib/db";
import { AzureLogsAnalysisClient } from "../_components/azure-logs-analysis-client";

export async function AzureLogsAnalysis({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <AzureLogsAnalysisClient labId={labId} completedStages={completedStages} />;
}
