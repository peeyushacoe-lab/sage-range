import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listMyApplications, withdrawApplication } from "@/lib/jobs";

const DeleteBody = z.object({ applicationId: z.string().min(1) });

/** The caller's own applications. */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await listMyApplications(user.id);

  return NextResponse.json({
    applications: applications.map((a) => ({
      id: a.id,
      status: a.status,
      appliedAt: a.appliedAt,
      decidedAt: a.decidedAt,
      job: a.job,
    })),
  });
}

/** Withdraw an application. */
export async function DELETE(req: Request) {
  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await withdrawApplication({
    applicationId: parsed.data.applicationId,
    applicantId: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json({ withdrawn: true });
}
