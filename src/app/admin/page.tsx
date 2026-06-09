import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [
    totalUsers,
    totalSessions,
    activeSessions,
    totalClassrooms,
    publishedLabs,
    totalCompetitions,
    totalInstitutions,
    roleBreakdown,
  ] = await Promise.all([
    db.user.count(),
    db.simulationSession.count(),
    db.simulationSession.count({ where: { status: "ACTIVE" } }),
    db.classroom.count(),
    db.lab.count({ where: { published: true } }),
    db.competition.count(),
    db.institution.count(),
    db.user.groupBy({ by: ["role"], _count: true }),
  ]);

  const roleCounts = Object.fromEntries(roleBreakdown.map((r) => [r.role, r._count]));

  const sections = [
    {
      href: "/admin/users",
      title: "Users",
      description: `${totalUsers} registered accounts`,
      detail: `${roleCounts.STUDENT ?? 0} students · ${roleCounts.INSTRUCTOR ?? 0} instructors · ${roleCounts.RECRUITER ?? 0} recruiters`,
      color: "border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/3",
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      href: "/admin/sessions",
      title: "Sessions",
      description: `${totalSessions} total · ${activeSessions} live`,
      detail: "Incident response simulation runs",
      color: activeSessions > 0 ? "border-red-500/20 hover:border-red-500/40 bg-red-500/3" : "border-white/8 hover:border-white/15 bg-white/2",
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      href: "/admin/labs",
      title: "Labs",
      description: `${publishedLabs} published`,
      detail: "CTF · Blue Team · Red Team",
      color: "border-blue-500/20 hover:border-blue-500/40 bg-blue-500/3",
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1" />
        </svg>
      ),
    },
    {
      href: "/admin/competitions",
      title: "Competitions",
      description: `${totalCompetitions} total`,
      detail: "CTF competitions and events",
      color: "border-amber-500/20 hover:border-amber-500/40 bg-amber-500/3",
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ),
    },
    {
      href: "/admin/institutions",
      title: "Institutions",
      description: `${totalInstitutions} registered`,
      detail: "Universities and enterprise clients",
      color: "border-purple-500/20 hover:border-purple-500/40 bg-purple-500/3",
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      href: "/admin/users",
      title: "Classrooms",
      description: `${totalClassrooms} active`,
      detail: "Instructor-led classrooms",
      color: "border-white/8 hover:border-white/15 bg-white/2",
      icon: (
        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-zinc-500 text-sm mt-1">Platform at a glance</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: "Total Users", value: totalUsers, color: "text-emerald-400" },
          { label: "Live Sessions", value: activeSessions, color: activeSessions > 0 ? "text-red-400" : "text-zinc-400" },
          { label: "Total Sessions", value: totalSessions, color: "text-zinc-300" },
          { label: "Classrooms", value: totalClassrooms, color: "text-zinc-300" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono mb-2">{s.label}</p>
            <p className={`text-3xl font-black tabular-nums ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <Link
            key={s.href + s.title}
            href={s.href}
            className={`rounded-xl border p-5 transition-all group ${s.color}`}
          >
            <div className="flex items-center justify-between mb-3">
              {s.icon}
              <svg className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="font-semibold text-zinc-200 mb-1">{s.title}</p>
            <p className="text-sm text-zinc-400 mb-1">{s.description}</p>
            <p className="text-xs text-zinc-600">{s.detail}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
