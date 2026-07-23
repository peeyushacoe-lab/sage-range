import { db } from "@/lib/db";
import { SecureAiApisClient } from "../_components/secure-ai-apis-client";

export async function SecureAiApis({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <SecureAiApisClient labId={labId} completedStages={completedStages} />;
}
