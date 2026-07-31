import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { AssessmentRunner } from "./_components/assessment-runner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = await db.skillAssessment.findUnique({ where: { slug } });
  return { title: a ? `${a.title} · Assessment · Sage Vault` : "Assessment · Sage Vault" };
}

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const assessment = await db.skillAssessment.findUnique({ where: { slug } });
  if (!assessment || !assessment.published) notFound();

  const [attempts, credential] = await Promise.all([
    db.skillAssessmentAttempt.findMany({
      where: { userId: user.id, assessmentId: assessment.id },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    db.verifiedCredential.findUnique({
      where: { userId_assessmentId: { userId: user.id, assessmentId: assessment.id } },
    }),
  ]);

  const graded = attempts.filter((a) => a.submittedAt !== null && a.score !== null);
  const best = graded.reduce<number | null>(
    (max, a) => (max === null || (a.score ?? 0) > max ? a.score : max),
    null,
  );

  // The question count is safe to show; the questions themselves are only
  // served by the start endpoint, with answers stripped.
  const questionCount = Array.isArray(assessment.questions)
    ? assessment.questions.length
    : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/career"
          className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          ← Back to Career
        </Link>

        <PageHeader
          className="mb-6 mt-3"
          title={assessment.title}
          subtitle={assessment.description}
          actions={<Badge tone="zinc">{assessment.domain}</Badge>}
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Time limit"
            value={`${Math.round(assessment.timeLimitSec / 60)}m`}
            sub="per attempt"
          />
          <StatCard label="Questions" value={questionCount} sub={assessment.difficulty} />
          <StatCard label="Pass mark" value={`${assessment.passingScore}%`} sub="to credential" />
          <StatCard
            label="Your best"
            value={best === null ? "—" : `${best}%`}
            sub={graded.length ? `${graded.length} attempt${graded.length === 1 ? "" : "s"}` : "not attempted"}
          />
        </div>

        {credential && credential.status === "ACTIVE" && (
          <Card className="mb-8 border-emerald-500/30 bg-emerald-500/5 p-5">
            <p className="text-sm font-semibold text-emerald-300">
              You already hold this credential
            </p>
            <p className="mt-1 font-mono text-xs text-emerald-400">{credential.code}</p>
            <p className="mt-2 text-xs text-zinc-400">
              Scored {credential.score}%. Re-passing refreshes this credential rather than
              issuing a second one.{" "}
              <Link
                href={`/career/credentials/${credential.code}`}
                className="text-emerald-400 hover:underline"
              >
                View public page →
              </Link>
            </p>
          </Card>
        )}

        <AssessmentRunner
          slug={assessment.slug}
          timeLimitSec={assessment.timeLimitSec}
          passingScore={assessment.passingScore}
        />
      </div>
    </main>
  );
}
