import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const VALID_REACTIONS = new Set(["useful", "congrats", "impressive", "smart"]);
const VALID_ENTRY_TYPES = new Set(["lab_solved", "sim_completed"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { entryId, entryType, reaction } = body ?? {};

  if (
    typeof entryId !== "string" ||
    !VALID_ENTRY_TYPES.has(entryType) ||
    !VALID_REACTIONS.has(reaction)
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const userId = session.user.id;

  const existing = await db.feedReaction.findFirst({
    where: { userId, entryId, entryType, reaction },
  });

  if (existing) {
    await db.feedReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed" });
  }

  await db.feedReaction.create({ data: { userId, entryId, entryType, reaction } });
  return NextResponse.json({ action: "added" });
}
