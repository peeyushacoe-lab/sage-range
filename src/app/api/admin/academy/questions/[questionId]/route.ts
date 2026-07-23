import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  question:      z.string().min(1).optional(),
  options:       z.unknown().optional(),
  correctAnswer: z.unknown().optional(),
  explanation:   z.string().max(1000).optional().nullable(),
  order:         z.number().int().min(0).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { questionId } = await params;
  const body = await req.json() as unknown;
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const q = await db.academyQuestion.update({
    where: { id: questionId },
    data: {
      ...(parsed.data.question      !== undefined && { question: parsed.data.question }),
      ...(parsed.data.options       !== undefined && { options: parsed.data.options as never }),
      ...(parsed.data.correctAnswer !== undefined && { correctAnswer: parsed.data.correctAnswer as never }),
      ...(parsed.data.explanation   !== undefined && { explanation: parsed.data.explanation }),
      ...(parsed.data.order         !== undefined && { order: parsed.data.order }),
    },
  });
  return NextResponse.json(q);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ questionId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { questionId } = await params;
  await db.academyQuestion.delete({ where: { id: questionId } });
  return NextResponse.json({ ok: true });
}
