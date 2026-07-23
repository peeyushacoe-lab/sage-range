import { db } from "@/lib/db";
import { LlmJailbreakingClient } from "../_components/llm-jailbreaking-client";

export async function LlmJailbreaking({
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
  return <LlmJailbreakingClient labId={labId} completedStages={completedStages} />;
}
