import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  title:       z.string().min(1).max(200).optional(),
  summary:     z.string().max(500).optional().nullable(),
  order:       z.number().int().min(0).optional(),
  published:   z.boolean().optional(),
  durationMin: z.number().int().min(1).max(300).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const lesson = await db.academyLesson.findUnique({
    where: { id: lessonId },
    include: {
      blocks:     { orderBy: { order: "asc" } },
      flashcards: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(lesson);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const body = await req.json() as unknown;
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const lesson = await db.academyLesson.update({ where: { id: lessonId }, data: parsed.data });
  return NextResponse.json(lesson);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { lessonId } = await params;
  await db.academyLesson.delete({ where: { id: lessonId } });
  return NextResponse.json({ ok: true });
}
