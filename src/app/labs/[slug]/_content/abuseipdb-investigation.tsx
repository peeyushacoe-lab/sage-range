import { db } from "@/lib/db";
import { AbuseipdbInvestigationClient } from "../_components/abuseipdb-investigation-client";

export async function AbuseipdbInvestigation({
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
  return <AbuseipdbInvestigationClient labId={labId} completedStages={completedStages} />;
}
