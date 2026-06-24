import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const VALID_STATUSES = new Set(["APPROVED", "REJECTED", "CHANGES_REQUESTED"]);
const VALID_GRADES = new Set(["A", "B", "C", "D", "F", ""]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reviewer = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!reviewer || (reviewer.role !== "INSTRUCTOR" && reviewer.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { submissionId } = await params;
  const body = await req.json();
  const { status, grade, comment, rubricScores } = body as {
    status: string;
    grade: string | null;
    comment: string | null;
    rubricScores?: { criterionId: string; score: number }[];
  };

  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (grade !== null && grade !== undefined && !VALID_GRADES.has(grade)) {
    return NextResponse.json({ error: "Invalid grade" }, { status: 400 });
  }

  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assessment: {
        include: { module: { select: { title: true } } },
      },
    },
  });
  if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const review = await db.mentorReview.upsert({
    where: { submissionId },
    update: {
      status: status as "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
      grade: grade || null,
      comment: comment || null,
      reviewerId: session.user.id,
      updatedAt: new Date(),
    },
    create: {
      submissionId,
      reviewerId: session.user.id,
      status: status as "APPROVED" | "REJECTED" | "CHANGES_REQUESTED",
      grade: grade || null,
      comment: comment || null,
    },
  });

  // Save rubric scores (upsert each criterion score)
  if (Array.isArray(rubricScores) && rubricScores.length > 0) {
    await Promise.all(
      rubricScores.map(({ criterionId, score }) =>
        db.rubricScore.upsert({
          where: { criterionId_reviewId: { criterionId, reviewId: review.id } },
          update: { score },
          create: { criterionId, reviewId: review.id, score },
        })
      )
    );
  }

  // Auto-create portfolio item when approved
  if (status === "APPROVED") {
    await db.portfolioItem.upsert({
      where: { submissionId },
      update: {
        grade: grade || null,
        feedback: comment || null,
      },
      create: {
        userId: submission.userId,
        submissionId,
        title: submission.assessment.title,
        description: `Completed assessment for module: ${submission.assessment.module.title}`,
        grade: grade || null,
        feedback: comment || null,
      },
    });
  }

  // If previously approved but now rejected/changes_requested, remove portfolio item
  if (status !== "APPROVED") {
    await db.portfolioItem.deleteMany({ where: { submissionId } });
  }

  return NextResponse.json({ ok: true, review });
}
