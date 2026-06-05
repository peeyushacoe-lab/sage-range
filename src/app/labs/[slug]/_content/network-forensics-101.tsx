import { db } from "@/lib/db";
import { NetworkForensics101Client } from "../_components/network-forensics-101-client";

export async function NetworkForensics101({
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
  return (
    <NetworkForensics101Client labId={labId} completedStages={completedStages} />
  );
}
