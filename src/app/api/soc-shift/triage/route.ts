import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  attemptId: z.string().min(1),
  alertId: z.string().min(1),
  action: z.enum(["ESCALATE", "CLOSE", "MONITOR"]),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const attempt = await db.socShiftAttempt.findUnique({ where: { id: parsed.data.attemptId } });
  if (!attempt || attempt.userId !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (attempt.completedAt) return NextResponse.json({ error: "shift_already_completed" }, { status: 409 });

  const alert = await db.shiftAlert.findUnique({ where: { id: parsed.data.alertId } });
  if (!alert || alert.shiftId !== attempt.shiftId) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const correct = parsed.data.action === alert.correctAction;

  const triage = await db.shiftAlertTriage.upsert({
    where: { attemptId_alertId: { attemptId: attempt.id, alertId: alert.id } },
    update: { action: parsed.data.action, correct },
    create: { attemptId: attempt.id, alertId: alert.id, action: parsed.data.action, correct },
  });

  return NextResponse.json({ correct, explanation: alert.explanation, triageId: triage.id });
}
