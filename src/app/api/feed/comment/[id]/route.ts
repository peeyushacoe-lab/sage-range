import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getOrCreateAppUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await db.feedComment.deleteMany({ where: { id, userId: me.id } });

  return NextResponse.json({ ok: true });
}
