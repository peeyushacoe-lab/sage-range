import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { active?: boolean };

  const voucher = await db.voucher.update({
    where: { id },
    data: { ...(typeof body.active === "boolean" ? { active: body.active } : {}) },
  });

  return NextResponse.json(voucher);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.voucher.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
