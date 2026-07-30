import { db } from "@/lib/db";
import type { ApplicationStatus } from "@prisma/client";

export type JobResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): JobResult<never> => ({
  success: false,
  error,
  statusCode,
});

/**
 * Legal stage transitions. Applications move forward, or terminate — they do
 * not go back to SUBMITTED once screening has begun, so an accidental
 * re-trigger cannot resurrect a rejected candidate.
 */
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["SCREENING", "REJECTED", "WITHDRAWN"],
  SCREENING: ["INTERVIEW", "REJECTED", "WITHDRAWN"],
  INTERVIEW: ["OFFER", "REJECTED", "WITHDRAWN"],
  OFFER: ["HIRED", "REJECTED", "WITHDRAWN"],
  HIRED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

/** Open roles, newest first. */
export async function listJobs(params: { limit?: number; offset?: number } = {}) {
  const now = new Date();
  return db.jobPosting.findMany({
    where: {
      active: true,
      OR: [{ closesAt: null }, { closesAt: { gt: now } }],
    },
    include: { _count: { select: { applications: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(params.limit ?? 20, 100),
    skip: params.offset ?? 0,
  });
}

export async function getJob(jobId: string) {
  return db.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      recruiter: { select: { id: true, displayName: true, email: true } },
      _count: { select: { applications: true } },
    },
  });
}

/**
 * Apply for a role.
 *
 * The applicant's portfolio slug is snapshotted so a later rename does not
 * break the recruiter's link back to what they reviewed.
 */
export async function applyToJob(params: {
  jobId: string;
  applicantId: string;
  coverNote?: string;
}): Promise<JobResult<{ applicationId: string }>> {
  const job = await db.jobPosting.findUnique({
    where: { id: params.jobId },
    select: { id: true, active: true, closesAt: true, recruiterId: true },
  });

  if (!job || !job.active) return fail("This role is not accepting applications", 404);
  if (job.closesAt && job.closesAt <= new Date()) {
    return fail("Applications have closed for this role", 409);
  }
  if (job.recruiterId === params.applicantId) {
    return fail("You cannot apply to your own posting", 403);
  }

  const existing = await db.jobApplication.findUnique({
    where: { jobId_applicantId: { jobId: params.jobId, applicantId: params.applicantId } },
  });
  if (existing) return fail("You have already applied to this role", 409);

  const portfolio = await db.careerPortfolio.findUnique({
    where: { userId: params.applicantId },
    select: { slug: true },
  });

  const application = await db.$transaction(async (tx) => {
    const created = await tx.jobApplication.create({
      data: {
        jobId: params.jobId,
        applicantId: params.applicantId,
        coverNote: params.coverNote?.trim() || null,
        portfolioSlug: portfolio?.slug ?? null,
      },
    });
    await tx.jobApplicationEvent.create({
      data: {
        applicationId: created.id,
        toStatus: "SUBMITTED",
        actorId: params.applicantId,
      },
    });
    return created;
  });

  return { success: true, data: { applicationId: application.id } };
}

/**
 * Move an application to a new stage. Only the posting's recruiter may do so,
 * and only along a legal transition.
 */
export async function advanceApplication(params: {
  applicationId: string;
  actorId: string;
  toStatus: ApplicationStatus;
  note?: string;
}): Promise<JobResult<{ status: ApplicationStatus }>> {
  const application = await db.jobApplication.findUnique({
    where: { id: params.applicationId },
    include: { job: { select: { recruiterId: true } } },
  });

  if (!application) return fail("Application not found", 404);
  if (application.job.recruiterId !== params.actorId) {
    return fail("Only the hiring recruiter can move this application", 403);
  }

  const allowed = ALLOWED_TRANSITIONS[application.status];
  if (!allowed.includes(params.toStatus)) {
    return fail(
      `Cannot move an application from ${application.status} to ${params.toStatus}`,
      409,
    );
  }

  const terminal = ["HIRED", "REJECTED", "WITHDRAWN"].includes(params.toStatus);

  await db.$transaction([
    db.jobApplication.update({
      where: { id: params.applicationId },
      data: {
        status: params.toStatus,
        decidedAt: terminal ? new Date() : null,
      },
    }),
    db.jobApplicationEvent.create({
      data: {
        applicationId: params.applicationId,
        fromStatus: application.status,
        toStatus: params.toStatus,
        note: params.note?.trim() || null,
        actorId: params.actorId,
      },
    }),
  ]);

  return { success: true, data: { status: params.toStatus } };
}

/** Candidate withdraws their own application. */
export async function withdrawApplication(params: {
  applicationId: string;
  applicantId: string;
}): Promise<JobResult<null>> {
  const application = await db.jobApplication.findUnique({
    where: { id: params.applicationId },
  });

  if (!application || application.applicantId !== params.applicantId) {
    return fail("Application not found", 404);
  }
  if (!ALLOWED_TRANSITIONS[application.status].includes("WITHDRAWN")) {
    return fail("This application can no longer be withdrawn", 409);
  }

  await db.$transaction([
    db.jobApplication.update({
      where: { id: params.applicationId },
      data: { status: "WITHDRAWN", decidedAt: new Date() },
    }),
    db.jobApplicationEvent.create({
      data: {
        applicationId: params.applicationId,
        fromStatus: application.status,
        toStatus: "WITHDRAWN",
        actorId: params.applicantId,
      },
    }),
  ]);

  return { success: true, data: null };
}

/** A candidate's own applications. */
export async function listMyApplications(applicantId: string) {
  return db.jobApplication.findMany({
    where: { applicantId },
    include: {
      job: { select: { id: true, title: true, company: true, location: true, remote: true } },
    },
    orderBy: { appliedAt: "desc" },
  });
}

/** The applicant pipeline for a posting, recruiter-facing. */
export async function listApplicationsForJob(jobId: string, recruiterId: string) {
  const job = await db.jobPosting.findUnique({
    where: { id: jobId },
    select: { recruiterId: true },
  });
  if (!job || job.recruiterId !== recruiterId) return null;

  return db.jobApplication.findMany({
    where: { jobId },
    include: {
      applicant: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      events: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { appliedAt: "asc" },
  });
}
