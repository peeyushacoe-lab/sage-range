import { db } from "@/lib/db";
import { KerberoastingClient } from "../_components/kerberoasting-client";

export async function Kerberoasting({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <KerberoastingClient labId={labId} completedStages={completedStages} />;
}
