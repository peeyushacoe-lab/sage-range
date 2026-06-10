import { db } from "@/lib/db";
import { WelcomeCtfClient } from "../_components/welcome-ctf-client";

export async function WelcomeCtf({
  labId,
  userId,
}: {
  labId: string;
  userId: string;
}) {
  const [existing, attempt] = await Promise.all([
    db.labResponse.findMany({ where: { userId, labId }, select: { stage: true } }),
    db.attempt.findUnique({ where: { userId_labId: { userId, labId } } }),
  ]);
  const completedStages = existing.map((r) => r.stage);
  const alreadySolved = attempt?.status === "SOLVED";
  return <WelcomeCtfClient labId={labId} completedStages={completedStages} alreadySolved={alreadySolved} />;
}
