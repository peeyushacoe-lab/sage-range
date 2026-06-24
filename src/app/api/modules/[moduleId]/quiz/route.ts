import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { maybeCompletePathFromModule } from "@/lib/module-progress";

function normaliseAnswer(val: unknown): string | string[] {
  if (Array.isArray(val)) return (val as string[]).map((s) => String(s).trim().toLowerCase()).sort();
  return String(val ?? "").trim().toLowerCase();
}

function answersEqual(correct: unknown, given: unknown): boolean {
  const c = normaliseAnswer(correct);
  const g = normaliseAnswer(given);
  if (Array.isArray(c) && Array.isArray(g)) {
    return c.length === g.length && c.every((v, i) => v === g[i]);
  }
  return c === g;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId } = await params;
  const body = await req.json();
  const { quizId, answers } = body as { quizId: string; answers: Record<string, unknown> };

  if (!quizId || typeof answers !== "object") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const quiz = await db.quiz.findFirst({
    where: { id: quizId, moduleId },
    include: { questions: true },
  });
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  // Score non-SA questions
  const gradeable = quiz.questions.filter((q) => q.type !== "SHORT_ANSWER");
  const correct = gradeable.filter((q) => answersEqual(q.correctAnswer, answers[q.id])).length;
  const score = gradeable.length > 0 ? Math.round((correct / gradeable.length) * 100) : 100;
  const passed = score >= quiz.passMark;

  // Store attempt
  const attempt = await db.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: session.user.id,
      score,
      passed,
      answers: {
        create: quiz.questions.map((q) => ({
          question: { connect: { id: q.id } },
          answer: answers[q.id] ?? {},
        })),
      },
    },
  });

  // Update module progress
  await db.userModuleProgress.upsert({
    where: { userId_moduleId: { userId: session.user.id, moduleId } },
    update: {
      quizPassed: passed || undefined,
    },
    create: {
      userId: session.user.id,
      moduleId,
      quizPassed: passed,
    },
  });

  // Mark module complete if quiz passed and (no assessment or assessment already done)
  if (passed) {
    const prog = await db.userModuleProgress.findUnique({
      where: { userId_moduleId: { userId: session.user.id, moduleId } },
    });
    const mod = await db.module.findUnique({
      where: { id: moduleId },
      include: { assessment: { select: { id: true } } },
    });
    const needsAssessment = !!mod?.assessment;
    const assessmentDone = prog?.assessmentDone ?? false;
    if (!needsAssessment || assessmentDone) {
      await db.userModuleProgress.update({
        where: { userId_moduleId: { userId: session.user.id, moduleId } },
        data: { completedAt: new Date() },
      });
      await maybeCompletePathFromModule(session.user.id, moduleId);
    }
  }

  // Build per-question feedback
  const answerFeedback: Record<string, { correct: boolean; explanation: string | null }> = {};
  for (const q of quiz.questions) {
    if (q.type === "SHORT_ANSWER") {
      answerFeedback[q.id] = { correct: true, explanation: q.explanation };
    } else {
      answerFeedback[q.id] = {
        correct: answersEqual(q.correctAnswer, answers[q.id]),
        explanation: q.explanation,
      };
    }
  }

  return NextResponse.json({
    score,
    passed,
    total: gradeable.length,
    correct,
    answers: answerFeedback,
  });
}
