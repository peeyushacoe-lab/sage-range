import { db } from "@/lib/db";
import { MftAnalysisClient } from "../_components/mft-analysis-client";

export async function MftAnalysis({
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
  return <MftAnalysisClient labId={labId} completedStages={completedStages} />;
}
