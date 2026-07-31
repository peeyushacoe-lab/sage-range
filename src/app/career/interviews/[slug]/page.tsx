import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard } from "@/components/ui";
import { InterviewRunner } from "./_components/interview-runner";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const kit = await db.interviewKit.findUnique({ where: { slug } });
  return { title: kit ? `${kit.title} · Interview · Sage Vault` : "Interview · Sage Vault" };
}

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const kit = await db.interviewKit.findUnique({ where: { slug } });
  if (!kit || !kit.published) notFound();

  const sessions = await db.interviewSession.findMany({
    where: { userId: user.id, kitId: kit.id },
    orderBy: { startedAt: "desc" },
    take: 5,
    include: { answers: { select: { id: true } } },
  });

  const scored = sessions.filter((s) => s.status === "SCORED" && s.score !== null);
  const best = scored.reduce<number | null>(
    (max, s) => (max === null || (s.score ?? 0) > max ? s.score : max),
    null,
  );

  const questionCount = Array.isArray(kit.questions) ? kit.questions.length : 0;

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
          title={kit.title}
          subtitle={kit.description}
          actions={<Badge tone="zinc">{kit.seniority}</Badge>}
        />

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Time limit"
            value={`${Math.round(kit.timeLimitSec / 60)}m`}
            sub="per session"
          />
          <StatCard label="Questions" value={questionCount} sub={kit.difficulty} />
          <StatCard label="Sessions" value={sessions.length} sub="attempted" />
          <StatCard
            label="Best score"
            value={best === null ? "—" : `${best}%`}
            sub={scored.length ? "reviewed" : "awaiting review"}
          />
        </div>

        {/* Past sessions, so a candidate can see what is still with a reviewer. */}
        {sessions.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Your sessions
            </h2>
            <Card className="divide-y divide-white/5 p-0">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="text-sm text-zinc-300">
                      {s.startedAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-zinc-600">
                      {s.answers.length} answer{s.answers.length === 1 ? "" : "s"} recorded
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      tone={
                        s.status === "SCORED"
                          ? "emerald"
                          : s.status === "SUBMITTED"
                            ? "amber"
                            : "zinc"
                      }
                    >
                      {s.status.replace("_", " ")}
                    </Badge>
                    {s.score !== null && (
                      <p className="mt-1 font-mono text-sm font-bold tabular-nums text-emerald-400">
                        {s.score}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </Card>

            {sessions.some((s) => s.status === "SCORED" && s.feedback) && (
              <Card className="mt-4 p-5">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
                  Latest reviewer feedback
                </p>
                <p className="whitespace-pre-wrap text-sm text-zinc-300">
                  {sessions.find((s) => s.status === "SCORED" && s.feedback)?.feedback}
                </p>
              </Card>
            )}
          </section>
        )}

        <InterviewRunner slug={kit.slug} timeLimitSec={kit.timeLimitSec} />
      </div>
    </main>
  );
}
