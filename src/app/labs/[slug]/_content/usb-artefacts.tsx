import { db } from "@/lib/db";
import { UsbArtefactsClient } from "../_components/usb-artefacts-client";

export async function UsbArtefacts({
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
  return <UsbArtefactsClient labId={labId} completedStages={completedStages} />;
}
