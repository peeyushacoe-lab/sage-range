import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  content: z.record(z.unknown()).optional(),
  order:   z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { blockId } = await params;
  const body = await req.json() as unknown;
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const block = await db.academyLessonBlock.update({
    where: { id: blockId },
    data: {
      ...(parsed.data.order   !== undefined && { order: parsed.data.order }),
      ...(parsed.data.content !== undefined && { content: parsed.data.content as Prisma.InputJsonValue }),
    },
  });
  return NextResponse.json(block);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { blockId } = await params;
  await db.academyLessonBlock.delete({ where: { id: blockId } });
  return NextResponse.json({ ok: true });
}
