import { db } from "@/lib/db";
import { WhoisAnalysisClient } from "../_components/whois-analysis-client";

export async function WhoisAnalysis({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <WhoisAnalysisClient labId={labId} completedStages={completedStages} />;
}
