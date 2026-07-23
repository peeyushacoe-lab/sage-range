import { db } from "@/lib/db";
import { GoldenTicketAttackClient } from "../_components/golden-ticket-attack-client";

export async function GoldenTicketAttack({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <GoldenTicketAttackClient labId={labId} completedStages={completedStages} />;
}
