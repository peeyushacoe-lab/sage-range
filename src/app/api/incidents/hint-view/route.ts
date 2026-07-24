import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

// Analytics-only: records that a student revealed a Boss Fight hint. No point
// cost, no gating — the hint text is already sent to the client up front (see
// incident-player-client.tsx HintList). This just gives instructor analytics
// a "hint usage" signal for incident sims, matching what UsedHint already
// gives for Lab hints.
const Body = z.object({ hintId: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const hint = await db.incidentSimHint.findUnique({ where: { id: parsed.data.hintId }, select: { id: true } });
  if (!hint) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.incidentHintView.upsert({
    where: { userId_hintId: { userId: user.id, hintId: hint.id } },
    update: {},
    create: { userId: user.id, hintId: hint.id },
  });

  return NextResponse.json({ ok: true });
}
