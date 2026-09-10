import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getSessionState } from "@/lib/missions";

/**
 * Everything the 3D client needs to render the room: object keys and kinds
 * to place, plus which keys this player has already found. Never labels or
 * descriptions — those only resolve one at a time, through /evidence, at the
 * moment of interaction.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const state = await getSessionState(user.id, sessionId);
  if (!state) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(state);
}
