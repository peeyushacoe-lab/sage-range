import { db } from "@/lib/db";
import { DnsExfiltrationDetectionClient } from "../_components/dns-exfiltration-detection-client";

export async function DnsExfiltrationDetection({
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
  return <DnsExfiltrationDetectionClient labId={labId} completedStages={completedStages} />;
}
