import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const { isPublic } = await req.json();

  if (typeof isPublic !== "boolean") {
    return NextResponse.json({ error: "isPublic must be boolean" }, { status: 400 });
  }

  const item = await db.portfolioItem.findUnique({
    where: { id: itemId },
    select: { userId: true },
  });

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await db.portfolioItem.update({
    where: { id: itemId },
    data: { isPublic },
    select: { id: true, isPublic: true },
  });

  return NextResponse.json(updated);
}
