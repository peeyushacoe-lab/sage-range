import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinOrganizationClient } from "./_components/join-organization-client";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function OrganizationPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    include: {
      organization: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mt-4 mb-2">Organization Access</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Enter the join code provided by your organization to unlock licensed access.
            If your email domain is already registered to an organization, you were joined automatically at signup.
          </p>
          <JoinOrganizationClient />
        </div>
      </main>
    );
  }

  const org = membership.organization;
  const isLead = membership.isLead;

  const members = isLead
    ? await db.organizationMember.findMany({
        where: { organizationId: org.id },
        include: { user: { select: { id: true, displayName: true, email: true, skillScore: true, role: true } } },
        orderBy: { joinedAt: "asc" },
      })
    : [];

  // Aggregate team progress — only computed for leads.
  const teamProgress = isLead
    ? await Promise.all(
        members.map(async (m) => {
          const [labsSolved, pathsCompleted, simsCompleted] = await Promise.all([
            db.attempt.count({ where: { userId: m.user.id, status: "SOLVED" } }),
            db.userPathProgress.count({ where: { userId: m.user.id, completedAt: { not: null } } }),
            db.simulationSession.count({ where: { userId: m.user.id, endedAt: { not: null } } }),
          ]);
          return { userId: m.user.id, labsSolved, pathsCompleted, simsCompleted };
        })
      )
    : [];
  const progressByUser = new Map(teamProgress.map((p) => [p.userId, p]));

  const expired = org.expiresAt && org.expiresAt < new Date();
  const planColor =
    org.plan === "ENTERPRISE" ? "text-purple-400"
    : org.plan === "PRO" ? "text-amber-400"
    : org.plan === "BASIC" ? "text-sage-400"
    : "text-zinc-400";

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className={`text-sm font-semibold mt-0.5 ${planColor}`}>{org.plan} Plan</p>
          {expired && <p className="text-xs text-red-400 mt-0.5">License expired</p>}
        </div>
        <div className="text-right text-sm text-zinc-400">
          <p><span className="text-white font-semibold">{org._count.members}</span> / {org.seats} seats used</p>
          {org.expiresAt && (
            <p className="text-xs text-zinc-600 mt-0.5">
              Expires {org.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Join code for org leads */}
      {isLead && (
        <section className="mb-8 p-4 rounded-xl border border-white/10 bg-zinc-950">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Join Code</p>
          <div className="flex items-center gap-3">
            <code className="text-2xl font-bold font-mono tracking-widest text-white">{org.joinCode}</code>
            <p className="text-xs text-zinc-600">Share this with your team to give them access.</p>
          </div>
        </section>
      )}

      {/* Team progress + roster (lead only) */}
      {isLead && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Team ({members.length})</h2>
            <a
              href="/api/organization/export"
              className="text-xs px-3 py-1.5 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-700 hover:text-white transition"
            >
              Download CSV
            </a>
          </div>
          <div className="rounded-lg border border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-right p-3">Score</th>
                  <th className="text-right p-3">Labs Solved</th>
                  <th className="text-right p-3">Paths Done</th>
                  <th className="text-right p-3">Sims Done</th>
                  <th className="text-right p-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => {
                  const p = progressByUser.get(m.user.id);
                  return (
                    <tr key={m.id} className="hover:bg-white/3">
                      <td className="p-3">
                        <Link href={`/profile/${m.user.id}`} className="font-medium hover:text-sage-400 transition-colors">
                          {m.user.displayName ?? "—"}
                        </Link>
                        {m.isLead && <span className="ml-2 text-xs text-amber-400">Lead</span>}
                      </td>
                      <td className="p-3 text-zinc-400 text-xs font-mono">{m.user.email}</td>
                      <td className="p-3 text-xs text-zinc-500">{m.user.role}</td>
                      <td className="p-3 text-right text-zinc-300">{m.user.skillScore}</td>
                      <td className="p-3 text-right text-zinc-300">{p?.labsSolved ?? 0}</td>
                      <td className="p-3 text-right text-zinc-300">{p?.pathsCompleted ?? 0}</td>
                      <td className="p-3 text-right text-zinc-300">{p?.simsCompleted ?? 0}</td>
                      <td className="p-3 text-right text-xs text-zinc-500">{m.joinedAt.toISOString().slice(0, 10)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Regular member view */}
      {!isLead && (
        <div className="p-6 rounded-xl border border-white/10 text-center">
          <p className="text-zinc-400 text-sm">
            You have licensed access through <strong className="text-white">{org.name}</strong>.
          </p>
          <Link href="/classroom" className="inline-block mt-4 text-sm text-sage-400 hover:text-sage-300">
            Go to your classroom →
          </Link>
        </div>
      )}
      </div>
    </main>
  );
}
