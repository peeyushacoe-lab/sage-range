import { db } from "@/lib/db";
import { WindowsLogAnalysisClient } from "../_components/windows-log-analysis-client";

export async function WindowsLogAnalysis({
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
  return (
    <WindowsLogAnalysisClient labId={labId} completedStages={completedStages} />
  );
}
