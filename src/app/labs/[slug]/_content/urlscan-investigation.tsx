import { db } from "@/lib/db";
import { UrlscanInvestigationClient } from "../_components/urlscan-investigation-client";

export async function UrlscanInvestigation({
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
  return <UrlscanInvestigationClient labId={labId} completedStages={completedStages} />;
}
