import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CohortDetail({
  params,
}: {
  params: Promise<{ cohortId: string }>;
}) {
  const { cohortId } = await params;

  const cohort = await db.cohort.findUnique({
    where: { id: cohortId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      paths: {
        include: {
          path: {
            include: {
              modules: {
                where: { published: true },
                select: { id: true, title: true, order: true },
                orderBy: { order: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!cohort) notFound();

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const isInstructor = user.role === "INSTRUCTOR" || user.role === "ADMIN";
  const isMember = cohort.members.some((m) => m.userId === user.id);
  if (!isMember && !isInstructor) redirect("/dashboard");

  // Build progress map: userId → moduleId → completedAt
  const allModuleIds = cohort.paths.flatMap((cp) => cp.path.modules.map((m) => m.id));
  const memberIds = cohort.members.map((m) => m.userId);

  const progressRecords = await db.userModuleProgress.findMany({
    where: {
      userId: { in: memberIds },
      moduleId: { in: allModuleIds },
    },
    select: { userId: true, moduleId: true, completedAt: true, quizPassed: true },
  });

  const progressMap = new Map<string, Map<string, { completedAt: Date | null; quizPassed: boolean }>>();
  for (const p of progressRecords) {
    if (!progressMap.has(p.userId)) progressMap.set(p.userId, new Map());
    progressMap.get(p.userId)!.set(p.moduleId, { completedAt: p.completedAt, quizPassed: p.quizPassed });
  }

  const totalModules = allModuleIds.length;

  const memberRows = cohort.members.map((m) => {
    const userProg = progressMap.get(m.userId) ?? new Map();
    const completed = allModuleIds.filter((id) => userProg.get(id)?.completedAt).length;
    const lastSeen = progressRecords
      .filter((p) => p.userId === m.userId)
      .reduce((best, p) => (p.completedAt && (!best || p.completedAt > best) ? p.completedAt : best), null as Date | null);
    const daysInactive = lastSeen
      ? Math.floor((Date.now() - lastSeen.getTime()) / 86400000)
      : null;
    const atRisk = daysInactive === null || daysInactive >= 7;

    return {
      member: m,
      completed,
      pct: totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0,
      daysInactive,
      atRisk,
    };
  });

  const atRiskCount = memberRows.filter((r) => r.atRisk).length;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar backHref={isInstructor ? "/admin/cohorts" : "/dashboard"} backLabel={isInstructor ? "Cohorts" : "Dashboard"} />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{cohort.name}</h1>
          {cohort.description && <p className="text-zinc-400 text-sm mt-1">{cohort.description}</p>}
          <div className="flex items-center gap-4 mt-3 text-xs text-zinc-500">
            {cohort.startDate && <span>Starts {new Date(cohort.startDate).toLocaleDateString()}</span>}
            {cohort.endDate && <span>Ends {new Date(cohort.endDate).toLocaleDateString()}</span>}
            <span>{cohort.members.length} member{cohort.members.length !== 1 ? "s" : ""}</span>
            {atRiskCount > 0 && (
              <span className="text-amber-400 font-semibold">{atRiskCount} at risk</span>
            )}
          </div>
        </header>

        {/* Paths overview */}
        {cohort.paths.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Learning Paths</h2>
            <div className="flex flex-wrap gap-2">
              {cohort.paths.map((cp) => (
                <Link
                  key={cp.id}
                  href={`/paths/${cp.path.slug}`}
                  className="rounded-lg border border-white/8 px-4 py-2 text-sm text-zinc-300 hover:border-sage-500/40 hover:text-sage-400 transition"
                >
                  {cp.path.title} · {cp.path.modules.length} modules
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Member progress table */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Member Progress</h2>
          <div className="rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 bg-white/2">
                  <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Intern</th>
                  <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Progress</th>
                  <th className="text-center px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Modules</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Last Active</th>
                  <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {memberRows.map(({ member, completed, pct, daysInactive, atRisk }) => (
                  <tr key={member.id} className="hover:bg-white/2 transition">
                    <td className="px-4 py-3">
                      <Link href={`/profile/${member.userId}`} className="font-medium text-zinc-200 hover:text-sage-400 transition">
                        {member.user.displayName ?? member.user.email.split("@")[0]}
                      </Link>
                      <p className="text-xs text-zinc-600">{member.user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? "bg-sage-500" : atRisk ? "bg-amber-500" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-9 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-zinc-400">
                      {completed}/{totalModules}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-zinc-500">
                      {daysInactive !== null ? `${daysInactive}d ago` : "Never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {pct === 100 ? (
                        <span className="text-xs font-semibold text-sage-400">Complete</span>
                      ) : atRisk ? (
                        <span className="text-xs font-semibold text-amber-400">At Risk</span>
                      ) : (
                        <span className="text-xs text-zinc-500">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
