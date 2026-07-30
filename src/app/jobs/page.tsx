import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { listJobs, listMyApplications } from "@/lib/jobs";
import { Navbar } from "@/components/navbar";
import { PageHeader, EmptyState, Card, Badge, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import type { ApplicationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<ApplicationStatus, "emerald" | "blue" | "amber" | "red" | "zinc"> = {
  SUBMITTED: "zinc",
  SCREENING: "blue",
  INTERVIEW: "amber",
  OFFER: "emerald",
  HIRED: "emerald",
  REJECTED: "red",
  WITHDRAWN: "zinc",
};

function salaryRange(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (!min && !max) return null;
  const c = currency ?? "GBP";
  const fmt = (n: number) => `${c} ${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

export default async function JobsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [jobs, applications] = await Promise.all([
    listJobs({ limit: 40 }),
    listMyApplications(user.id),
  ]);

  const appliedJobIds = new Set(applications.map((a) => a.job.id));
  const live = applications.filter(
    (a) => !["REJECTED", "WITHDRAWN", "HIRED"].includes(a.status),
  );

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Job Board"
          subtitle="Roles from recruiters on the platform. Your portfolio is attached automatically when you apply."
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Open roles" value={jobs.length} />
          <StatCard label="Applied" value={applications.length} sub="all time" />
          <StatCard label="In progress" value={live.length} sub="awaiting decision" />
          <StatCard
            label="Offers"
            value={applications.filter((a) => a.status === "OFFER" || a.status === "HIRED").length}
          />
        </div>

        {applications.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-ink-3">
              Your applications
            </h2>
            <Card>
              <div className="divide-y divide-edge-subtle">
                {applications.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.job.title}</p>
                      <p className="truncate text-xs text-ink-3">{a.job.company}</p>
                    </div>
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {jobs.length === 0 ? (
          <EmptyState
            icon="org"
            title="No roles posted yet"
            description="Recruiters post openings here. Build out your portfolio in the meantime."
            action={{ label: "View your portfolio", href: "/profile" }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobs.map((job) => {
              const applied = appliedJobIds.has(job.id);
              const pay = salaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
              return (
                <Card key={job.id} className="flex flex-col gap-3 p-5" interactive>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/jobs/${job.id}`}
                        className="text-base font-semibold hover:text-ok"
                      >
                        {job.title}
                      </Link>
                      <p className="text-sm text-ink-2">{job.company}</p>
                    </div>
                    {applied ? (
                      <Badge tone="emerald">Applied</Badge>
                    ) : (
                      <Badge tone="zinc">{job.seniority}</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-ink-3">
                    {job.location && (
                      <span className="flex items-center gap-1.5">
                        <Icon name="map" size={14} />
                        {job.location}
                        {job.remote && " · Remote"}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Icon name="clipboard" size={14} />
                      {job.employmentType.replace("_", " ").toLowerCase()}
                    </span>
                    {pay && (
                      <span className="flex items-center gap-1.5">
                        <Icon name="coin" size={14} />
                        {pay}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto text-xs text-ink-3">
                    {job._count.applications} applicant
                    {job._count.applications === 1 ? "" : "s"}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
