import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const CreateBody = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  order:       z.number().int().min(0),
});

export async function GET(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { courseId } = await params;
  const modules = await db.academyModule.findMany({
    where: { courseId },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { lessons: true } },
      quiz: { select: { id: true } },
    },
  });
  return NextResponse.json(modules);
}

export async function POST(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { courseId } = await params;
  const body = await req.json() as unknown;
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const mod = await db.academyModule.create({ data: { courseId, ...parsed.data } });
  return NextResponse.json({ id: mod.id }, { status: 201 });
}
