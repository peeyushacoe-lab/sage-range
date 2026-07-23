import { db } from "@/lib/db";
import { WebServerLogAnalysisClient } from "../_components/web-server-log-analysis-client";

export async function WebServerLogAnalysis({
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
  return <WebServerLogAnalysisClient labId={labId} completedStages={completedStages} />;
}
