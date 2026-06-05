import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { db } from "@/lib/db";
import { TemplateToggle } from "./_components/template-toggle";
import { CompetitionToggle } from "./_components/competition-toggle";
import { NewCompetitionForm } from "./_components/new-competition-form";
import { UserRoleSelect } from "./_components/user-role-select";
import { LabToggle } from "./_components/lab-toggle";
import { NewInstitutionForm } from "./_components/new-institution-form";
import { InstitutionActiveToggle } from "./_components/institution-active-toggle";
import { CopyCodeBtn } from "./_components/copy-code-btn";

export const dynamic = "force-dynamic";

export default async function AdminPanel() {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  const [
    [totalUsers, totalSessions, activeSessions, containedSessions, totalClassrooms, publishedLabCount],
    recentSessions,
    templates,
    competitions,
    allLabs,
    users,
    publishedLabs,
    institutions,
  ] = await Promise.all([
    Promise.all([
      db.user.count(),
      db.simulationSession.count(),
      db.simulationSession.count({ where: { status: "ACTIVE" } }),
      db.simulationSession.count({ where: { status: "CONTAINED" } }),
      db.classroom.count(),
      db.lab.count({ where: { published: true } }),
    ]),
    db.simulationSession.findMany({
      include: { template: true, user: { select: { displayName: true, email: true } } },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    db.scenarioTemplate.findMany({ orderBy: { createdAt: "asc" } }),
    db.competition.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { entries: true } } },
    }),
    db.lab.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { attempts: true } } },
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, email: true, displayName: true, role: true, skillScore: true, createdAt: true },
    }),
    db.lab.findMany({ where: { published: true }, select: { id: true, slug: true, title: true }, orderBy: { createdAt: "asc" } }),
    db.institution.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { members: true } } },
    }),
  ]);

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Logged in as {me.email}</p>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-10">
        <Stat label="Total users" value={totalUsers} />
        <Stat label="Active sessions" value={activeSessions} highlight />
        <Stat label="Total sessions" value={totalSessions} />
        <Stat label="Contained" value={containedSessions} />
        <Stat label="Classrooms" value={totalClassrooms} />
        <Stat label="Labs published" value={publishedLabCount} />
      </section>

      {/* Institutions */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Institutions ({institutions.length})</h2>
          <NewInstitutionForm />
        </div>
        {institutions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No institutions yet. Create one to start selling access.</p>
        ) : (
          <div className="rounded-lg border border-white/10 divide-y divide-white/10">
            {institutions.map((inst) => {
              const expired = inst.expiresAt && inst.expiresAt < new Date();
              const planColor =
                inst.plan === "ENTERPRISE" ? "text-purple-400 bg-purple-500/10 border-purple-500/30"
                : inst.plan === "PRO" ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                : inst.plan === "BASIC" ? "text-sage-400 bg-sage-500/10 border-sage-500/30"
                : "text-zinc-400 bg-zinc-800 border-zinc-700";
              return (
                <div key={inst.id} className="flex items-center justify-between p-4 gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{inst.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${planColor}`}>{inst.plan}</span>
                      {expired && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">Expired</span>}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{inst.contactEmail}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {inst._count.members}/{inst.seats} seats used
                      {inst.expiresAt && ` · expires ${inst.expiresAt.toISOString().slice(0, 10)}`}
                      {" · "}<span className="font-mono text-zinc-500">{inst.joinCode}</span>
                    </p>
                    {inst.notes && <p className="text-xs text-zinc-600 mt-0.5 italic">{inst.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <CopyCodeBtn code={inst.joinCode} />
                    <InstitutionActiveToggle id={inst.id} active={inst.active} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* User Management */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Users ({totalUsers})</h2>
        <div className="rounded-lg border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-right p-3">Score</th>
                <th className="text-right p-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/3">
                  <td className="p-3 font-medium">{u.displayName ?? "—"}</td>
                  <td className="p-3 text-zinc-400 text-xs font-mono">{u.email}</td>
                  <td className="p-3">
                    <UserRoleSelect userId={u.id} currentRole={u.role} isSelf={u.id === me.id} />
                  </td>
                  <td className="p-3 text-right text-zinc-300">{u.skillScore}</td>
                  <td className="p-3 text-right text-xs text-zinc-500">{u.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          To promote via CLI: <code className="bg-zinc-900 px-1 rounded">npx tsx scripts/make-admin.ts &lt;email&gt;</code>
        </p>
      </section>

      {/* Labs */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Labs ({allLabs.length})</h2>
        <div className="rounded-lg border border-white/10 divide-y divide-white/10">
          {allLabs.map((lab) => (
            <div key={lab.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{lab.title}</p>
                <p className="text-xs text-zinc-500 font-mono">
                  {lab.slug} · {lab.difficulty} · {lab._count.attempts} attempt{lab._count.attempts !== 1 ? "s" : ""}
                </p>
              </div>
              <LabToggle id={lab.id} published={lab.published} />
            </div>
          ))}
        </div>
      </section>

      {/* Scenario Templates */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Scenario templates</h2>
        <div className="rounded-lg border border-white/10 divide-y divide-white/10">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-zinc-500">{t.industry} · {t.difficulty} · <span className="font-mono">{t.slug}</span></p>
              </div>
              <TemplateToggle id={t.id} published={t.published} />
            </div>
          ))}
        </div>
      </section>

      {/* Competitions */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Competitions</h2>
          <NewCompetitionForm labs={publishedLabs} onCreated={() => {}} />
        </div>
        {competitions.length === 0 ? (
          <p className="text-zinc-500 text-sm">No competitions yet.</p>
        ) : (
          <div className="rounded-lg border border-white/10 divide-y divide-white/10">
            {competitions.map((c) => {
              const now = new Date();
              const status = now < c.startDate ? "Upcoming" : now > c.endDate ? "Ended" : "Active";
              return (
                <div key={c.id} className="flex items-center justify-between p-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-zinc-500 font-mono">{c.slug}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {c.startDate.toISOString().slice(0, 10)} → {c.endDate.toISOString().slice(0, 10)}
                      {" · "}
                      <span className={status === "Active" ? "text-sage-500" : status === "Upcoming" ? "text-amber-400" : "text-zinc-500"}>{status}</span>
                      {" · "}{c._count.entries} entrant{c._count.entries !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <CompetitionToggle id={c.id} published={c.published} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent sessions */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent sessions</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Template</th>
                <th className="text-left p-3">Stage</th>
                <th className="text-right p-3">Score</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentSessions.map((s) => (
                <tr key={s.id} className="hover:bg-white/3">
                  <td className="p-3">
                    <p className="font-medium">{s.user.displayName ?? s.user.email.split("@")[0]}</p>
                    <p className="text-xs text-zinc-600">{s.user.email}</p>
                  </td>
                  <td className="p-3 text-zinc-300">{s.template.name}</td>
                  <td className="p-3 text-xs text-zinc-400 font-mono">{s.currentStage}</td>
                  <td className="p-3 text-right font-semibold">{s.score}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      s.status === "ACTIVE" ? "bg-sage-500/20 text-sage-500"
                      : s.status === "CONTAINED" ? "bg-sage-500/20 text-sage-500"
                      : s.status === "BREACHED" ? "bg-red-500/20 text-red-400"
                      : "bg-zinc-500/20 text-zinc-400"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 text-right text-xs text-zinc-500">{s.startedAt.toISOString().slice(0, 10)}</td>
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

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-sage-500/40 bg-sage-500/5" : "border-white/10"}`}>
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-sage-500" : ""}`}>{value}</p>
    </div>
  );
}
