import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listApplicationsForJob, advanceApplication } from "@/lib/jobs";

const PatchBody = z.object({
  applicationId: z.string().min(1),
  toStatus: z.enum([
    "SCREENING",
    "INTERVIEW",
    "OFFER",
    "HIRED",
    "REJECTED",
  ]),
  note: z.string().max(2000).optional(),
});

/** Applicant pipeline for a posting. Hiring recruiter only. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  const applications = await listApplicationsForJob(jobId, user.id);

  // Null means the caller does not own this posting.
  if (applications === null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      appliedAt: a.appliedAt,
      coverNote: a.coverNote,
      portfolioSlug: a.portfolioSlug,
      applicant: {
        id: a.applicant.id,
        displayName: a.applicant.displayName || a.applicant.email,
        avatarUrl: a.applicant.avatarUrl,
      },
      lastEvent: a.events[0] ?? null,
    })),
  });
}

/** Move an application to the next stage. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await params; // route param is validated via the application's own job link

  const result = await advanceApplication({
    applicationId: parsed.data.applicationId,
    actorId: user.id,
    toStatus: parsed.data.toStatus,
    note: parsed.data.note,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
