import { db } from "@/lib/db";
import { ThirdPartyVendorCompromiseClient } from "../_components/third-party-vendor-compromise-client";

export async function ThirdPartyVendorCompromise({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <ThirdPartyVendorCompromiseClient labId={labId} completedStages={completedStages} />;
}
