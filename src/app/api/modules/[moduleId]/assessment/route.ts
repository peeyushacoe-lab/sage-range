import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { maybeCompletePathFromModule } from "@/lib/module-progress";

const VALID_TYPES = new Set(["TEXT", "PDF", "IMAGE", "ZIP", "GITHUB_LINK"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId } = await params;
  const body = await req.json();
  const { assessmentId, type, content } = body as { assessmentId: string; type: string; content: string };

  if (!assessmentId || !VALID_TYPES.has(type) || !content?.trim()) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, moduleId },
  });
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const submission = await db.assessmentSubmission.upsert({
    where: { assessmentId_userId: { assessmentId, userId: session.user.id } },
    update: { type: type as "TEXT" | "PDF" | "IMAGE" | "ZIP" | "GITHUB_LINK", content: content.trim(), updatedAt: new Date() },
    create: {
      assessmentId,
      userId: session.user.id,
      type: type as "TEXT" | "PDF" | "IMAGE" | "ZIP" | "GITHUB_LINK",
      content: content.trim(),
    },
    include: { review: { select: { status: true, grade: true, comment: true } } },
  });

  // Update module progress
  await db.userModuleProgress.upsert({
    where: { userId_moduleId: { userId: session.user.id, moduleId } },
    update: { assessmentDone: true },
    create: { userId: session.user.id, moduleId, assessmentDone: true },
  });

  // Mark module complete if no quiz or quiz already passed
  const prog = await db.userModuleProgress.findUnique({
    where: { userId_moduleId: { userId: session.user.id, moduleId } },
  });
  const mod = await db.module.findUnique({
    where: { id: moduleId },
    include: { quiz: { select: { id: true } } },
  });
  const needsQuiz = !!mod?.quiz;
  const quizPassed = prog?.quizPassed ?? false;
  if (!needsQuiz || quizPassed) {
    await db.userModuleProgress.update({
      where: { userId_moduleId: { userId: session.user.id, moduleId } },
      data: { completedAt: new Date() },
    });
    await maybeCompletePathFromModule(session.user.id, moduleId);
  }

  return NextResponse.json({
    id: submission.id,
    type: submission.type,
    content: submission.content,
    submittedAt: submission.submittedAt.toISOString(),
    review: submission.review
      ? { status: submission.review.status, grade: submission.review.grade, comment: submission.review.comment }
      : null,
  });
}
