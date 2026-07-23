import { db } from "@/lib/db";
import { FileUploadBypassClient } from "../_components/file-upload-bypass-client";

export async function FileUploadBypass({
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
  return <FileUploadBypassClient labId={labId} completedStages={completedStages} />;
}
