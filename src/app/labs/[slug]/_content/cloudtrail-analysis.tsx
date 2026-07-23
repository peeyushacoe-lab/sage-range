import { db } from "@/lib/db";
import { CloudtrailAnalysisClient } from "../_components/cloudtrail-analysis-client";

export async function CloudtrailAnalysis({
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
  return <CloudtrailAnalysisClient labId={labId} completedStages={completedStages} />;
}
