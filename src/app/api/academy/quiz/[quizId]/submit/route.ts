import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  answers: z.array(z.object({ questionId: z.string(), answer: z.unknown() })),
});

export async function POST(req: Request, { params }: { params: Promise<{ quizId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { quizId } = await params;
  const body = await req.json() as unknown;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const quiz = await db.academyQuiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  if (!quiz) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let correct = 0;
  const answerMap = new Map(parsed.data.answers.map(a => [a.questionId, a.answer]));

  for (const q of quiz.questions) {
    const given = answerMap.get(q.id);
    if (given === undefined) continue;

    const ca = q.correctAnswer;
    let isCorrect = false;

    if (q.type === "MULTIPLE_CHOICE" || q.type === "FILL_BLANK" || q.type === "TRUE_FALSE") {
      isCorrect = String(given).toLowerCase() === String(ca).toLowerCase();
    } else if (q.type === "MULTIPLE_SELECT") {
      const givenArr = (Array.isArray(given) ? given : [given]).map(String).sort();
      const caArr = (Array.isArray(ca) ? ca : [ca]).map(String).sort();
      isCorrect = JSON.stringify(givenArr) === JSON.stringify(caArr);
    } else if (q.type === "MATCH_PAIRS") {
      isCorrect = JSON.stringify(given) === JSON.stringify(ca);
    }

    if (isCorrect) correct++;
  }

  const total = quiz.questions.length || 1;
  const score = Math.round((correct / total) * 100);
  const passed = score >= quiz.passMark;

  const attempt = await db.academyQuizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      score,
      passed,
      answers: {
        create: parsed.data.answers.map(a => ({
          questionId: a.questionId,
          answer: a.answer as never,
        })),
      },
    },
  });

  // Pass rewards XP; fail deducts, but never drops the total below zero.
  const xpDelta = passed ? 50 : -15;
  const newXp = Math.max(0, user.xp + xpDelta);
  await db.user.update({ where: { id: user.id }, data: { xp: newXp } });
  const xpEarned = newXp - user.xp;

  return NextResponse.json({ attemptId: attempt.id, score, passed, correct, total, xpEarned });
}
