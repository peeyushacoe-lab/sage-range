import { db } from "@/lib/db";
import { RogueWirelessApClient } from "../_components/rogue-wireless-ap-client";

export async function RogueWirelessAp({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <RogueWirelessApClient labId={labId} completedStages={completedStages} />;
}
