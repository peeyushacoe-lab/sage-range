import { db } from "@/lib/db";
import { EventCorrelationClient } from "../_components/event-correlation-client";

export async function EventCorrelation({
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
  return <EventCorrelationClient labId={labId} completedStages={completedStages} />;
}
