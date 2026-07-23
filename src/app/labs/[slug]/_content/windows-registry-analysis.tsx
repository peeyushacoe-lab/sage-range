import { db } from "@/lib/db";
import { WindowsRegistryAnalysisClient } from "../_components/windows-registry-analysis-client";

export async function WindowsRegistryAnalysis({
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
  return <WindowsRegistryAnalysisClient labId={labId} completedStages={completedStages} />;
}
