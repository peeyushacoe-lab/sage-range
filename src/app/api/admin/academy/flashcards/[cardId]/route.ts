import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function DELETE(_req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { cardId } = await params;
  await db.academyFlashcard.delete({ where: { id: cardId } });
  return NextResponse.json({ ok: true });
}
