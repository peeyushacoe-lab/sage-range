import { db } from "@/lib/db";
import { DockerSecurityClient } from "../_components/docker-security-client";

export async function DockerSecurity({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <DockerSecurityClient labId={labId} completedStages={completedStages} />;
}
