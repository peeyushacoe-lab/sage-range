import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { lessonId } = await params;
  const cards = await db.academyFlashcard.findMany({
    where: { lessonId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(cards);
}
