import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getLeaderboard } from "@/lib/ozh";

export const dynamic = "force-dynamic";

/**
 * The board.
 *
 * Ranked by score, then accuracy, then time — so finishing twenty minutes
 * faster with more mistakes does not win. Fetching it also sweeps runs that
 * have passed their deadline, which is what makes an abandoned run appear
 * rather than sitting IN_PROGRESS indefinitely.
 */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const board = await getLeaderboard();
  return NextResponse.json({
    entries: board,
    you: board.find((e) => e.userId === user.id) ?? null,
  });
}
