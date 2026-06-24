import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user.id : null;
}

interface QuestionInput {
  type: string;
  question: string;
  options: string[] | null;
  correctAnswer: unknown;
  explanation: string | null;
  order: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json();
  const { title, description, passMark, questions } = body as {
    title: string;
    description: string | null;
    passMark: number;
    questions: QuestionInput[];
  };

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });

  const existing = await db.quiz.findUnique({ where: { moduleId } });
  if (existing) {
    return NextResponse.json({ error: "Quiz already exists. Use PATCH to update." }, { status: 409 });
  }

  const quiz = await db.quiz.create({
    data: {
      moduleId,
      title: title.trim(),
      description: description ?? null,
      passMark: passMark ?? 70,
      questions: {
        create: (questions ?? []).map((q, i) => ({
          type: q.type as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER",
          question: q.question,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer ?? "",
          explanation: q.explanation ?? null,
          order: q.order ?? i,
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(quiz, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json();
  const { title, description, passMark, questions } = body as {
    title: string;
    description: string | null;
    passMark: number;
    questions: QuestionInput[];
  };

  const existing = await db.quiz.findUnique({ where: { moduleId } });
  if (!existing) return NextResponse.json({ error: "Quiz not found. Use POST to create." }, { status: 404 });

  // Replace all questions
  await db.quizQuestion.deleteMany({ where: { quizId: existing.id } });

  const quiz = await db.quiz.update({
    where: { moduleId },
    data: {
      title: title?.trim() ?? existing.title,
      description: description ?? existing.description,
      passMark: passMark ?? existing.passMark,
      questions: {
        create: (questions ?? []).map((q, i) => ({
          type: q.type as "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER",
          question: q.question,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer ?? "",
          explanation: q.explanation ?? null,
          order: q.order ?? i,
        })),
      },
    },
    include: { questions: true },
  });

  return NextResponse.json(quiz);
}
