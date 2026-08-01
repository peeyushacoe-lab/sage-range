import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  labId: z.string().min(1),
  stage: z.string().min(1).max(64),
});

/**
 * Record a wrong submission against a lab.
 *
 * Lab answers are validated in the browser, so without this the server never
 * learns that anything was guessed and every solve looks clean. The count
 * feeds awardAfterPenalty(), which is what stops brute-forcing a lab scoring
 * the same as reasoning through it.
 *
 * Deliberately cheap and forgiving: it never fails the learner's flow, and an
 * already-solved lab stops accruing penalties so replaying costs nothing.
 */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // A ceiling stops a scripted client inflating its own penalty, or anyone
  // else's, into a denial-of-service on the attempts table.
  const rl = await rateLimit(`lab-wrong:${user.id}`, { max: 300, windowSec: 3600 });
  if (!rl.allowed) return NextResponse.json({ ok: true, throttled: true });

  const lab = await db.lab.findUnique({
    where: { id: parsed.data.labId },
    select: { id: true },
  });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await db.attempt.findUnique({
    where: { userId_labId: { userId: user.id, labId: lab.id } },
    select: { status: true },
  });

  // Once solved, further wrong answers are practice and must not be punished.
  if (existing?.status === "SOLVED") {
    return NextResponse.json({ ok: true, counted: false });
  }

  await db.attempt.upsert({
    where: { userId_labId: { userId: user.id, labId: lab.id } },
    create: { userId: user.id, labId: lab.id, status: "IN_PROGRESS", wrongAttempts: 1 },
    update: { wrongAttempts: { increment: 1 } },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, counted: true });
}
