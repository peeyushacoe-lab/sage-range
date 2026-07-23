import { db } from "@/lib/db";
import { BrowserForensicsClient } from "../_components/browser-forensics-client";

export async function BrowserForensics({
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
  return <BrowserForensicsClient labId={labId} completedStages={completedStages} />;
}
