import { db } from "@/lib/db";
import { PhishingAnalysisClient } from "../_components/phishing-analysis-client";

export async function PhishingAnalysis({
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
    <PhishingAnalysisClient labId={labId} completedStages={completedStages} />
  );
}
