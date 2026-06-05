import { db } from "@/lib/db";
import { WelcomeCtfClient } from "../_components/welcome-ctf-client";

export async function WelcomeCtf({
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
  return <WelcomeCtfClient labId={labId} completedStages={completedStages} />;
}
