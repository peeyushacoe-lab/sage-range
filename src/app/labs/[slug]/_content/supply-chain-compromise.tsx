import { db } from "@/lib/db";
import { SupplyChainCompromiseClient } from "../_components/supply-chain-compromise-client";

export async function SupplyChainCompromise({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <SupplyChainCompromiseClient labId={labId} completedStages={completedStages} />;
}
