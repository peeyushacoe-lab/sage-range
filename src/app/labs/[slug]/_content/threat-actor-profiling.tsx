import { db } from "@/lib/db";
import { ThreatActorProfilingClient } from "../_components/threat-actor-profiling-client";

export async function ThreatActorProfiling({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <ThreatActorProfilingClient labId={labId} completedStages={completedStages} />;
}
