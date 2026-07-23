import { db } from "@/lib/db";
import { DetectAiGeneratedPhishingClient } from "../_components/detect-ai-generated-phishing-client";

export async function DetectAiGeneratedPhishing({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <DetectAiGeneratedPhishingClient labId={labId} completedStages={completedStages} />;
}
