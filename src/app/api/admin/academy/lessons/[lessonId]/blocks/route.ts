import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const BlockBody = z.object({
  type:    z.enum(["TEXT","CODE","IMAGE","CALLOUT"]),
  order:   z.number().int().min(0),
  content: z.record(z.unknown()),
});

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const body = await req.json() as unknown;
  const parsed = BlockBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const block = await db.academyLessonBlock.create({
    data: { lessonId, type: parsed.data.type, order: parsed.data.order, content: parsed.data.content as Prisma.InputJsonValue },
  });
  return NextResponse.json({ id: block.id }, { status: 201 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const body = await req.json() as unknown;
  const parsed = z.array(z.object({
    id:      z.string(),
    type:    z.enum(["TEXT","CODE","IMAGE","CALLOUT"]),
    order:   z.number().int().min(0),
    content: z.record(z.unknown()),
  })).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await db.$transaction([
    db.academyLessonBlock.deleteMany({ where: { lessonId } }),
    ...parsed.data.map(b =>
      db.academyLessonBlock.create({ data: { lessonId, type: b.type, order: b.order, content: b.content as Prisma.InputJsonValue } })
    ),
  ]);
  return NextResponse.json({ ok: true });
}
