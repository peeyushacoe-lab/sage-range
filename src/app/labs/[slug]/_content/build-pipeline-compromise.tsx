import { db } from "@/lib/db";
import { BuildPipelineCompromiseClient } from "../_components/build-pipeline-compromise-client";

export async function BuildPipelineCompromise({
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
  return <BuildPipelineCompromiseClient labId={labId} completedStages={completedStages} />;
}
