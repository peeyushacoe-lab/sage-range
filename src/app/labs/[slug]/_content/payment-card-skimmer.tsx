import { db } from "@/lib/db";
import { PaymentCardSkimmerClient } from "../_components/payment-card-skimmer-client";

export async function PaymentCardSkimmer({ labId, userId }: { labId: string; userId: string }) {
  const existing = await db.labResponse.findMany({
    where: { userId, labId },
    select: { stage: true },
  });
  const completedStages = existing.map((r) => r.stage);
  return <PaymentCardSkimmerClient labId={labId} completedStages={completedStages} />;
}
