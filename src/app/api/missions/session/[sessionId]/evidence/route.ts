import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { examineEvidence } from "@/lib/missions";

const Body = z.object({ key: z.string().min(1) });

/**
 * Resolve one evidence object on interaction (the player pressed E on it).
 *
 * This is the one place the label/description text ever leaves the server —
 * deliberately per-object rather than handed over in bulk with the session
 * state, so opening the page source can't substitute for actually
 * investigating.
 */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = await params;
  const result = await examineEvidence(user.id, sessionId, parsed.data.key);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
