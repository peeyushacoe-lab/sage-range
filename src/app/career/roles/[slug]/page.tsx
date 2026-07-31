import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { readinessLabel } from "@/lib/skill-gap";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, ProgressBar } from "@/components/ui";
import { AnalyseGapButton } from "./_components/analyse-gap-button";

export const dynamic = "force-dynamic";

type Coverage = Record<string, { have: number; need: number }>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const role = await db.roleProfile.findUnique({ where: { slug } });
  return { title: role ? `${role.title} · Career · Sage Vault` : "Role · Sage Vault" };
}

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const role = await db.roleProfile.findUnique({ where: { slug } });
  // An unpublished role is treated as absent rather than shown read-only, so
  // draft role definitions cannot be enumerated by guessing slugs.
  if (!role || !role.published) notFound();

  const snapshot = await db.skillGapSnapshot.findUnique({
    where: { userId_roleProfileId: { userId: user.id, roleProfileId: role.id } },
  });

  const required = (role.requiredTactics ?? {}) as Record<string, number>;
  const coverage = (snapshot?.coverage ?? {}) as Coverage;

  // Show every required tactic, not just the analysed ones: a tactic missing
  // from the snapshot means zero coverage, which is exactly what a candidate
  // most needs to see.
  const tactics = Object.entries(required)
    .map(([tactic, need]) => {
      const have = coverage[tactic]?.have ?? 0;
      const pct = need > 0 ? Math.min(100, Math.round((have / need) * 100)) : 100;
      return { tactic, need, have, pct };
    })
    .sort((a, b) => a.pct - b.pct);

  const paths = role.recommendedPathSlugs.length
    ? await db.learningPath.findMany({
        where: { slug: { in: role.recommendedPathSlugs } },
        select: { slug: true, title: true, description: true },
      })
    : [];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href="/career"
          className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
        >
          ← Back to Career
        </Link>

        <PageHeader
          className="mb-6 mt-3"
          title={role.title}
          subtitle={role.description}
          actions={<Badge tone="zinc">{role.seniority}</Badge>}
        />

        {/* ── Readiness ── */}
        <Card className="mb-8 p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">
                Your readiness
              </p>
              {snapshot ? (
                <>
                  <p className="mt-1 font-mono text-4xl font-black tabular-nums text-emerald-400">
                    {snapshot.readiness}%
                  </p>
                  <p className="text-xs text-zinc-500">
                    {readinessLabel(snapshot.readiness)} · updated{" "}
                    {snapshot.generatedAt.toLocaleDateString("en-GB")}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-zinc-400">
                  Not analysed yet — run an analysis to see where you stand.
                </p>
              )}
            </div>
            <AnalyseGapButton slug={role.slug} hasSnapshot={snapshot != null} />
          </div>

          {snapshot && <ProgressBar value={snapshot.readiness} />}
        </Card>

        {/* ── Tactic breakdown ── */}
        <section className="mb-8">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Required tactics
          </h2>

          {tactics.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-zinc-500">
                This role has no tactic requirements defined yet.
              </p>
            </Card>
          ) : (
            <Card className="divide-y divide-white/5 p-0">
              {tactics.map((t) => (
                <div key={t.tactic} className="flex items-center gap-4 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">{t.tactic}</p>
                    <div className="mt-1.5">
                      <ProgressBar
                        value={t.pct}
                        tone={t.pct >= 100 ? "emerald" : t.pct >= 50 ? "amber" : "red"}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
                    {t.have}/{t.need}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </section>

        {/* ── Recommended paths ── */}
        {paths.length > 0 && (
          <section>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Recommended to close the gap
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {paths.map((p) => (
                <Card key={p.slug} className="p-5" interactive>
                  <Link href={`/paths/${p.slug}`} className="block">
                    <p className="text-base font-semibold hover:text-emerald-400">{p.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{p.description}</p>
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
