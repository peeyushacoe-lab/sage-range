import { db } from "@/lib/db";
import { PromptInjectionClient } from "../_components/prompt-injection-client";

export async function PromptInjection({
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
  return <PromptInjectionClient labId={labId} completedStages={completedStages} />;
}
