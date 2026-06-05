import { db } from "@/lib/db";
import { XssFundamentalsClient } from "../_components/xss-fundamentals-client";

export async function XssFundamentals({
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
    <XssFundamentalsClient labId={labId} completedStages={completedStages} />
  );
}
