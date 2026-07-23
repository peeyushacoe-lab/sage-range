import { db } from "@/lib/db";
import { LinuxAuthInvestigationClient } from "../_components/linux-auth-investigation-client";

export async function LinuxAuthInvestigation({
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
  return <LinuxAuthInvestigationClient labId={labId} completedStages={completedStages} />;
}
