import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { published } = await req.json() as { published?: boolean };
  if (typeof published !== "boolean") return NextResponse.json({ error: "published required" }, { status: 400 });

  await db.lab.update({ where: { id }, data: { published } });
  return NextResponse.json({ ok: true });
}
