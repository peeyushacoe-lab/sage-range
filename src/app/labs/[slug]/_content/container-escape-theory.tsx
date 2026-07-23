import { db } from "@/lib/db";
import { ContainerEscapeTheoryClient } from "../_components/container-escape-theory-client";

export async function ContainerEscapeTheory({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <ContainerEscapeTheoryClient labId={labId} completedStages={completedStages} />;
}
