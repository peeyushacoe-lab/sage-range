import { db } from "@/lib/db";
import { EmailHeaderForensicsClient } from "../_components/email-header-forensics-client";

export async function EmailHeaderForensics({
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
  return <EmailHeaderForensicsClient labId={labId} completedStages={completedStages} />;
}
