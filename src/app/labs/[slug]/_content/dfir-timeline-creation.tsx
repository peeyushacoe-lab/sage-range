import { db } from "@/lib/db";
import { DfirTimelineCreationClient } from "../_components/dfir-timeline-creation-client";

export async function DfirTimelineCreation({
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
  return <DfirTimelineCreationClient labId={labId} completedStages={completedStages} />;
}
