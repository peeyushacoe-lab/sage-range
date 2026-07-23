import { db } from "@/lib/db";
import { UsbForensicsClient } from "../_components/usb-forensics-client";

export async function UsbForensics({
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
  return <UsbForensicsClient labId={labId} completedStages={completedStages} />;
}
