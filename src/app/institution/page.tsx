import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { JoinInstitutionClient } from "./_components/join-institution-client";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function InstitutionPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const membership = await db.institutionMember.findFirst({
    where: { userId: user.id },
    include: {
      institution: {
        include: { _count: { select: { members: true } } },
      },
    },
  });

  if (!membership) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <div className="p-8 max-w-xl mx-auto">
          <h1 className="text-2xl font-bold mt-4 mb-2">Institution Access</h1>
          <p className="text-zinc-500 text-sm mb-6">
            Enter the join code provided by your institution to unlock licensed access.
          </p>
          <JoinInstitutionClient />
        </div>
      </main>
    );
  }

  const inst = membership.institution;
  const isAdmin = membership.isAdmin;

  const members = isAdmin
    ? await db.institutionMember.findMany({
        where: { institutionId: inst.id },
        include: { user: { select: { id: true, displayName: true, email: true, skillScore: true, role: true } } },
        orderBy: { joinedAt: "asc" },
      })
    : [];

  const expired = inst.expiresAt && inst.expiresAt < new Date();
  const planColor =
    inst.plan === "ENTERPRISE" ? "text-purple-400"
    : inst.plan === "PRO" ? "text-amber-400"
    : inst.plan === "BASIC" ? "text-sage-400"
    : "text-zinc-400";

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mt-4 mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{inst.name}</h1>
          <p className={`text-sm font-semibold mt-0.5 ${planColor}`}>{inst.plan} Plan</p>
          {expired && <p className="text-xs text-red-400 mt-0.5">License expired</p>}
        </div>
        <div className="text-right text-sm text-zinc-400">
          <p><span className="text-white font-semibold">{inst._count.members}</span> / {inst.seats} seats used</p>
          {inst.expiresAt && (
            <p className="text-xs text-zinc-600 mt-0.5">
              Expires {inst.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Join code for institution admins */}
      {isAdmin && (
        <section className="mb-8 p-4 rounded-xl border border-white/10 bg-zinc-950">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Student Join Code</p>
          <div className="flex items-center gap-3">
            <code className="text-2xl font-bold font-mono tracking-widest text-white">{inst.joinCode}</code>
            <p className="text-xs text-zinc-600">Share this with your students to give them access.</p>
          </div>
        </section>
      )}

      {/* Members table (admin only) */}
      {isAdmin && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Members ({members.length})</h2>
          <div className="rounded-lg border border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-500 text-xs uppercase tracking-wider">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                  <th className="text-right p-3">Score</th>
                  <th className="text-right p-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/3">
                    <td className="p-3">
                      <Link href={`/profile/${m.user.id}`} className="font-medium hover:text-sage-400 transition-colors">
                        {m.user.displayName ?? "—"}
                      </Link>
                      {m.isAdmin && <span className="ml-2 text-xs text-amber-400">Admin</span>}
                    </td>
                    <td className="p-3 text-zinc-400 text-xs font-mono">{m.user.email}</td>
                    <td className="p-3 text-xs text-zinc-500">{m.user.role}</td>
                    <td className="p-3 text-right text-zinc-300">{m.user.skillScore}</td>
                    <td className="p-3 text-right text-xs text-zinc-500">{m.joinedAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Student view */}
      {!isAdmin && (
        <div className="p-6 rounded-xl border border-white/10 text-center">
          <p className="text-zinc-400 text-sm">
            You have licensed access through <strong className="text-white">{inst.name}</strong>.
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
