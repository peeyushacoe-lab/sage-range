import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-warn border-warn-edge bg-warn-wash",
  APPROVED: "text-ok border-ok-edge bg-ok-wash",
  REJECTED: "text-danger border-danger-edge bg-danger-wash",
  CHANGES_REQUESTED: "text-sev-high border-sev-high-edge bg-sev-high-wash",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes Requested",
};

export default async function MentorQueue() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "INSTRUCTOR" && user.role !== "ADMIN") redirect("/dashboard");

  const submissions = await db.assessmentSubmission.findMany({
    include: {
      assessment: {
        include: {
          module: {
            include: {
              path: { select: { title: true, slug: true } },
            },
          },
        },
      },
      user: { select: { displayName: true, email: true } },
      review: { select: { status: true, grade: true, reviewedAt: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const pending = submissions.filter((s) => !s.review);
  const reviewed = submissions.filter((s) => !!s.review);

  const Section = ({
    title,
    items,
  }: {
    title: string;
    items: typeof submissions;
  }) => (
    <section className="mb-10">
      <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-4">{title} — {items.length}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-ink-3">None.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((s) => {
            const status = s.review?.status ?? "PENDING";
            const statusColor = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
            const statusLabel = STATUS_LABELS[status] ?? status;

            return (
              <Link
                key={s.id}
                href={`/mentor/${s.id}`}
                className="rounded-xl border border-edge p-4 hover:border-ok-edge hover:bg-ok-wash transition flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.assessment.title}</p>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {s.assessment.module.path.title} → {s.assessment.module.title}
                  </p>
                  <p className="text-xs text-ink-3 mt-1">
                    {s.user.displayName ?? s.user.email} · {s.type} ·{" "}
                    {new Date(s.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-semibold rounded-full border px-2.5 py-1 ${statusColor}`}>
                  {statusLabel}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar backHref="/dashboard" backLabel="Dashboard" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assessment Review Queue</h1>
            <p className="text-ink-2 text-sm mt-1">
              {pending.length} pending · {reviewed.length} reviewed
            </p>
          </div>
          <Link
            href="/mentor/analytics"
            className="shrink-0 rounded-lg border border-edge px-4 py-2 text-xs font-semibold text-ink-2 hover:border-ok-edge hover:text-ok transition"
          >
            Analytics →
          </Link>
        </header>

        <Section title="Awaiting Review" items={pending} />
        <Section title="Reviewed" items={reviewed} />
      </div>
    </main>
  );
}
