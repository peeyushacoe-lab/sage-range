import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const CreateBody = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  passMark:    z.number().int().min(1).max(100).default(70),
});

export async function POST(req: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json() as unknown;
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const quiz = await db.academyQuiz.create({ data: { moduleId, ...parsed.data } });
  return NextResponse.json({ id: quiz.id }, { status: 201 });
}
