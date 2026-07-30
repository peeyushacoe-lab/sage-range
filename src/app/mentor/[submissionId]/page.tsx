import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { ReviewForm } from "./_components/review-form";

export const dynamic = "force-dynamic";

export default async function ReviewSubmission({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") redirect("/dashboard");

  const submission = await db.assessmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assessment: {
        include: {
          module: {
            include: { path: { select: { title: true, slug: true } } },
          },
          rubric: {
            include: { criteria: { orderBy: { order: "asc" } } },
          },
        },
      },
      user: { select: { displayName: true, email: true, avatarUrl: true } },
      review: {
        select: {
          status: true,
          grade: true,
          comment: true,
          reviewedAt: true,
          rubricScores: { select: { criterionId: true, score: true } },
        },
      },
    },
  });
  if (!submission) notFound();

  const existingReview = submission.review
    ? {
        status: submission.review.status as string,
        grade: submission.review.grade,
        comment: submission.review.comment,
        rubricScores: submission.review.rubricScores as { criterionId: string; score: number }[],
      }
    : null;

  const rubricCriteria = submission.assessment.rubric?.criteria.map((c) => ({
    id: c.id,
    label: c.label,
    maxScore: c.maxScore,
  })) ?? [];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/mentor" backLabel="Review Queue" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">
            {submission.assessment.module.path.title} → {submission.assessment.module.title}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{submission.assessment.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="h-7 w-7 rounded-full bg-sage-500/15 border border-sage-500/30 flex items-center justify-center text-xs font-bold text-sage-400 shrink-0">
              {(submission.user.displayName ?? submission.user.email)[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-zinc-300">{submission.user.displayName ?? submission.user.email}</p>
              <p className="text-xs text-zinc-500">
                Submitted {new Date(submission.submittedAt).toLocaleDateString()} · {submission.type}
              </p>
            </div>
          </div>
        </header>

        {/* Instructions */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Assessment Instructions</h2>
          <div className="rounded-xl border border-white/8 bg-white/2 p-5">
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {submission.assessment.instructions}
            </p>
          </div>
        </section>

        {/* Submission */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Student Submission</h2>
          <div className="rounded-xl border border-white/8 p-5">
            {submission.type === "TEXT" ? (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{submission.content}</p>
            ) : (
              <a
                href={submission.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sage-400 hover:underline break-all flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {submission.content}
              </a>
            )}
          </div>
        </section>

        {/* Review form */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Your Review</h2>
          <ReviewForm
            submissionId={submissionId}
            existingReview={existingReview}
            rubricCriteria={rubricCriteria}
          />
        </section>
      </div>
    </main>
  );
}
