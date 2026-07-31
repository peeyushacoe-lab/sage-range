import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

/**
 * Follow a creator.
 *
 * Uses the existing Follow graph rather than a creator-specific one, so
 * following an author here means the same thing as following them anywhere
 * else on the platform.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  if (creatorId === user.id) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }

  const creator = await db.user.findUnique({
    where: { id: creatorId },
    select: { id: true },
  });
  if (!creator) return NextResponse.json({ error: "Creator not found" }, { status: 404 });

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: creatorId } },
    create: { followerId: user.id, followingId: creatorId },
    update: {},
    select: { id: true },
  });

  return NextResponse.json({ following: true }, { status: 201 });
}

/** Unfollow. deleteMany so a repeated call is a no-op rather than a 404. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { creatorId } = await params;
  await db.follow.deleteMany({
    where: { followerId: user.id, followingId: creatorId },
  });

  return NextResponse.json({ following: false });
}
