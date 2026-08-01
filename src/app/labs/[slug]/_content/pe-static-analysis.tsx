import { db } from "@/lib/db";
import { PeStaticAnalysisClient } from "../_components/pe-static-analysis-client";

export async function PeStaticAnalysis({
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
  return <PeStaticAnalysisClient labId={labId} completedStages={completedStages} />;
}
