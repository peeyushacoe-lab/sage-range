import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const CreateBody = z.object({
  title:       z.string().min(1).max(200),
  summary:     z.string().max(500).optional(),
  order:       z.number().int().min(0),
  durationMin: z.number().int().min(1).max(300).default(5),
});

export async function GET(_req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const lessons = await db.academyLesson.findMany({
    where: { moduleId },
    orderBy: { order: "asc" },
    include: { _count: { select: { blocks: true, flashcards: true } } },
  });
  return NextResponse.json(lessons);
}

export async function POST(req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json() as unknown;
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const lesson = await db.academyLesson.create({ data: { moduleId, ...parsed.data } });
  return NextResponse.json({ id: lesson.id }, { status: 201 });
}
