import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  order:       z.number().int().min(0).optional(),
  published:   z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json() as unknown;
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const mod = await db.academyModule.update({ where: { id: moduleId }, data: parsed.data });
  return NextResponse.json(mod);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { moduleId } = await params;
  await db.academyModule.delete({ where: { id: moduleId } });
  return NextResponse.json({ ok: true });
}
