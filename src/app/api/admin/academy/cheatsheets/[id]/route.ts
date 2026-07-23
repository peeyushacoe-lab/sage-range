import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional().nullable(),
  content:     z.string().min(1).optional(),
  order:       z.number().int().min(0).optional(),
  published:   z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as unknown;
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const sheet = await db.academyCheatSheet.update({ where: { id }, data: parsed.data });
  return NextResponse.json(sheet);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  await db.academyCheatSheet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
