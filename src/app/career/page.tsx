import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import {
  listRoleProfiles,
  listSkillAssessments,
  listInterviewKits,
} from "@/lib/career";
import { readinessLabel } from "@/lib/skill-gap";
import { Navbar } from "@/components/navbar";
import { PageHeader, Card, Badge, StatCard, EmptyState } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const [roles, assessments, kits, snapshots, credentials] = await Promise.all([
    listRoleProfiles(),
    listSkillAssessments(),
    listInterviewKits(),
    db.skillGapSnapshot.findMany({
      where: { userId: user.id },
      include: { roleProfile: { select: { slug: true, title: true } } },
      orderBy: { readiness: "desc" },
    }),
    db.verifiedCredential.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { assessment: { select: { title: true, domain: true } } },
      orderBy: { issuedAt: "desc" },
    }),
  ]);

  const best = snapshots[0] ?? null;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Career"
          subtitle="Measure yourself against real roles, earn verifiable credentials, and rehearse the interview."
        />

        <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Best role fit"
            value={best ? `${best.readiness}%` : "—"}
            sub={best ? best.roleProfile.title : "run an analysis"}
          />
          <StatCard label="Credentials" value={credentials.length} sub="verified" />
          <StatCard label="Assessments" value={assessments.length} sub="available" />
          <StatCard label="Interview kits" value={kits.length} sub="available" />
        </div>

        {/* ── Role fit ── */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Role readiness
          </h2>

          {roles.length === 0 ? (
            <EmptyState
              icon="compass"
              title="No role profiles published"
              description="Role profiles define the tactics a job expects, then measure your coverage against them."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => {
                const snap = snapshots.find((s) => s.roleProfileId === role.id);
                return (
                  <Card key={role.id} className="flex flex-col gap-3 p-5" interactive>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/career/roles/${role.slug}`}
                        className="text-base font-semibold hover:text-emerald-400"
                      >
                        {role.title}
                      </Link>
                      <Badge tone="zinc">{role.seniority}</Badge>
                    </div>

                    <p className="line-clamp-2 text-sm text-zinc-400">{role.description}</p>

                    {snap ? (
                      <div className="mt-auto">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-zinc-500">{readinessLabel(snap.readiness)}</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {snap.readiness}%
                          </span>
                        </div>
                        <ProgressBar value={snap.readiness} />
                        {snap.gaps.length > 0 && (
                          <p className="mt-2 text-xs text-zinc-600">
                            Weakest: {snap.gaps.slice(0, 2).join(", ")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-auto text-xs text-zinc-600">Not analysed yet</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Credentials ── */}
        {credentials.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
              Your verified credentials
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {credentials.map((c) => (
                <Card key={c.id} className="p-5">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon name="verified" size={20} />
                    <span className="text-sm font-semibold">{c.assessment.title}</span>
                  </div>
                  <p className="font-mono text-xs text-emerald-400">{c.code}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Scored {c.score}% ·{" "}
                    {c.expiresAt
                      ? `expires ${c.expiresAt.toLocaleDateString("en-GB")}`
                      : "no expiry"}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Assessments ── */}
        <section className="mb-10">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Verified assessments
          </h2>
          {assessments.length === 0 ? (
            <EmptyState
              icon="certificates"
              title="No assessments published"
              description="Verified assessments produce a credential a recruiter can check independently."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assessments.map((a) => (
                <Card key={a.id} className="flex flex-col gap-2 p-5" interactive>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold">{a.title}</span>
                    <Badge tone="zinc">{a.domain}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-400">{a.description}</p>
                  <p className="mt-auto text-xs text-zinc-600">
                    {Math.round(a.timeLimitSec / 60)} min · pass at {a.passingScore}%
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── Interview prep ── */}
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
            Interview practice
          </h2>
          {kits.length === 0 ? (
            <EmptyState
              icon="soc"
              title="No interview kits published"
              description="Timed scenario interviews with structured feedback."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {kits.map((k) => (
                <Card key={k.id} className="flex flex-col gap-2 p-5" interactive>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-base font-semibold">{k.title}</span>
                    <Badge tone="zinc">{k.seniority}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-zinc-400">{k.description}</p>
                  <p className="mt-auto text-xs text-zinc-600">
                    {Math.round(k.timeLimitSec / 60)} min · {k.difficulty}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
