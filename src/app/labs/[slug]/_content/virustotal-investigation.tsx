import { db } from "@/lib/db";
import { VirustotalInvestigationClient } from "../_components/virustotal-investigation-client";

export async function VirustotalInvestigation({
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
  return <VirustotalInvestigationClient labId={labId} completedStages={completedStages} />;
}
