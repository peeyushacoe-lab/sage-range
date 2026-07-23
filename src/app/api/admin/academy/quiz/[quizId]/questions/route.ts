import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const QuestionBody = z.object({
  type:          z.enum(["MULTIPLE_CHOICE","MULTIPLE_SELECT","FILL_BLANK","TRUE_FALSE","MATCH_PAIRS"]),
  question:      z.string().min(1),
  options:       z.unknown().optional(),
  correctAnswer: z.unknown(),
  explanation:   z.string().max(1000).optional(),
  order:         z.number().int().min(0),
});

export async function GET(_req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { quizId } = await params;
  const questions = await db.academyQuestion.findMany({
    where: { quizId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(questions);
}

export async function POST(req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { quizId } = await params;
  const body = await req.json() as unknown;
  const parsed = QuestionBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const q = await db.academyQuestion.create({
    data: {
      quizId,
      type:          parsed.data.type,
      question:      parsed.data.question,
      options:       (parsed.data.options ?? null) as never,
      correctAnswer: parsed.data.correctAnswer as never,
      explanation:   parsed.data.explanation,
      order:         parsed.data.order,
    },
  });
  return NextResponse.json({ id: q.id }, { status: 201 });
}
