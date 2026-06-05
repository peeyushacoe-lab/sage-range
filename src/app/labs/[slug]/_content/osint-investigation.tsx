import { db } from "@/lib/db";
import { OsintInvestigationClient } from "../_components/osint-investigation-client";

export async function OsintInvestigation({
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
    <OsintInvestigationClient labId={labId} completedStages={completedStages} />
  );
}
