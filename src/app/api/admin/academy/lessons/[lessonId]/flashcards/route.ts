import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const CreateBody = z.object({
  front: z.string().min(1).max(500),
  back:  z.string().min(1).max(2000),
  order: z.number().int().min(0).default(0),
});

export async function POST(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { lessonId } = await params;
  const body = await req.json() as unknown;
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const card = await db.academyFlashcard.create({ data: { lessonId, ...parsed.data } });
  return NextResponse.json({ id: card.id }, { status: 201 });
}
