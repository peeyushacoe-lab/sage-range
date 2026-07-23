import { db } from "@/lib/db";
import { KubernetesBasicsClient } from "../_components/kubernetes-basics-client";

export async function KubernetesBasics({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <KubernetesBasicsClient labId={labId} completedStages={completedStages} />;
}
