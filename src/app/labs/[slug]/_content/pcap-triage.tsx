import { db } from "@/lib/db";
import { PcapTriageClient } from "../_components/pcap-triage-client";

export async function PcapTriage({
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
  return <PcapTriageClient labId={labId} completedStages={completedStages} />;
}
