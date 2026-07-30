import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  APPROVED: "text-sage-400 border-sage-500/30 bg-sage-500/10",
  REJECTED: "text-red-400 border-red-500/30 bg-red-500/10",
  CHANGES_REQUESTED: "text-orange-400 border-orange-500/30 bg-orange-500/10",
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
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">{title} — {items.length}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-zinc-600">None.</p>
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
                className="rounded-xl border border-white/8 p-4 hover:border-sage-500/30 hover:bg-sage-500/5 transition flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.assessment.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {s.assessment.module.path.title} → {s.assessment.module.title}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref="/dashboard" backLabel="Dashboard" />

      <div className="max-w-3xl mx-auto px-6 py-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assessment Review Queue</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {pending.length} pending · {reviewed.length} reviewed
            </p>
          </div>
          <Link
            href="/mentor/analytics"
            className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-zinc-400 hover:border-sage-500/40 hover:text-sage-400 transition"
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
