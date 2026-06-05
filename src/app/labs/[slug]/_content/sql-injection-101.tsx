import { db } from "@/lib/db";
import { SqlInjection101Client } from "../_components/sql-injection-101-client";

export async function SqlInjection101({
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
    <SqlInjection101Client labId={labId} completedStages={completedStages} />
  );
}
