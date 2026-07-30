import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

/** Open roles. Public — the job board is browsable without an account. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const offset = Number(url.searchParams.get("offset") ?? 0);

  const jobs = await listJobs({
    limit: Number.isFinite(limit) ? limit : 20,
    offset: Number.isFinite(offset) ? offset : 0,
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.remote,
      employmentType: j.employmentType,
      seniority: j.seniority,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      salaryCurrency: j.salaryCurrency,
      closesAt: j.closesAt,
      applicationCount: j._count.applications,
      createdAt: j.createdAt,
    })),
  });
}
