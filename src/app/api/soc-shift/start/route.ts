import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ shiftId: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const shift = await db.socShift.findUnique({ where: { id: parsed.data.shiftId } });
  if (!shift || !shift.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await db.socShiftAttempt.findFirst({
    where: { userId: user.id, shiftId: shift.id, completedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (existing) {
    return NextResponse.json({ attemptId: existing.id, startedAt: existing.startedAt, timeLimitSec: shift.timeLimitSec });
  }

  const attempt = await db.socShiftAttempt.create({
    data: { userId: user.id, shiftId: shift.id },
  });

  return NextResponse.json({ attemptId: attempt.id, startedAt: attempt.startedAt, timeLimitSec: shift.timeLimitSec });
}
