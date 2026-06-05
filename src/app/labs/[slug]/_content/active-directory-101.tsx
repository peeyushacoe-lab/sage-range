import { db } from "@/lib/db";
import { ActiveDirectory101Client } from "../_components/active-directory-101-client";

export async function ActiveDirectory101({
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
    <ActiveDirectory101Client labId={labId} completedStages={completedStages} />
  );
}
