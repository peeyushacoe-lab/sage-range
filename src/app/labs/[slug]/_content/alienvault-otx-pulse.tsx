import { db } from "@/lib/db";
import { AlienvaultOtxPulseClient } from "../_components/alienvault-otx-pulse-client";

export async function AlienvaultOtxPulse({
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
  return <AlienvaultOtxPulseClient labId={labId} completedStages={completedStages} />;
}
