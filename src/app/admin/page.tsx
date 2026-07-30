import Link from "next/link";
import { db } from "@/lib/db";
import {
  Users, History, FlaskConical, Award, Building2, BookOpen, Ticket, DollarSign,
  ChevronRight, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const [
    totalUsers,
    totalSessions,
    activeSessions,
    totalClassrooms,
    publishedLabs,
    totalCompetitions,
    totalOrganizations,
    roleBreakdown,
    totalVouchers,
    activeVouchers,
  ] = await Promise.all([
    db.user.count(),
    db.simulationSession.count(),
    db.simulationSession.count({ where: { status: "ACTIVE" } }),
    db.classroom.count(),
    db.lab.count({ where: { published: true } }),
    db.competition.count(),
    db.organization.count(),
    db.user.groupBy({ by: ["role"], _count: true }),
    db.voucher.count(),
    db.voucher.count({ where: { active: true } }),
  ]);

  const roleCounts = Object.fromEntries(roleBreakdown.map((r) => [r.role, r._count]));

  // Navigational tiles, not status — one icon colour, one border colour,
  // across every card. "Sessions" is the sole exception: it's the only card
  // reporting something genuinely live, so it borrows accent for that reason
  // alone, not because red/blue/purple looked nice.
  const sections: { href: string; title: string; description: string; detail: string; icon: LucideIcon; live?: boolean }[] = [
    {
      href: "/admin/users",
      title: "Users",
      description: `${totalUsers} registered accounts`,
      detail: `${roleCounts.STUDENT ?? 0} students · ${roleCounts.INSTRUCTOR ?? 0} instructors · ${roleCounts.RECRUITER ?? 0} recruiters`,
      icon: Users,
    },
    {
      href: "/admin/sessions",
      title: "Sessions",
      description: `${totalSessions} total · ${activeSessions} live`,
      detail: "Incident response simulation runs",
      icon: History,
      live: activeSessions > 0,
    },
    {
      href: "/admin/labs",
      title: "Labs",
      description: `${publishedLabs} published`,
      detail: "CTF · Blue Team · Red Team",
      icon: FlaskConical,
    },
    {
      href: "/admin/competitions",
      title: "Competitions",
      description: `${totalCompetitions} total`,
      detail: "CTF competitions and events",
      icon: Award,
    },
    {
      href: "/admin/organizations",
      title: "Organizations",
      description: `${totalOrganizations} registered`,
      detail: "Universities and enterprise clients",
      icon: Building2,
    },
    {
      href: "/admin/users",
      title: "Classrooms",
      description: `${totalClassrooms} active`,
      detail: "Instructor-led classrooms",
      icon: BookOpen,
    },
    {
      href: "/admin/vouchers",
      title: "Vouchers",
      description: `${totalVouchers} total · ${activeVouchers} active`,
      detail: "Discount codes for sign-up plans",
      icon: Ticket,
    },
    {
      href: "/admin/pricing",
      title: "Pricing",
      description: "Student · Instructor · Recruiter",
      detail: "Set monthly prices per plan",
      icon: DollarSign,
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-3">Platform at a glance</p>
      </div>

      {/* Stats row */}
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers} />
        <StatCard
          label="Live Sessions"
          value={activeSessions}
          sub={activeSessions > 0 ? "in progress now" : undefined}
        />
        <StatCard label="Total Sessions" value={totalSessions} />
        <StatCard label="Classrooms" value={totalClassrooms} />
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href + s.title}
              href={s.href}
              className={cn(
                "group rounded-lg border p-5 transition-colors duration-fast",
                s.live
                  ? "border-accent-edge bg-accent-wash hover:border-accent"
                  : "border-edge bg-surface-1 hover:border-edge-strong hover:bg-surface-2"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <Icon aria-hidden="true" className={cn("h-5 w-5", s.live ? "text-accent" : "text-ink-3")} />
                <ChevronRight aria-hidden="true" className="h-4 w-4 text-ink-3 transition-colors duration-fast group-hover:text-ink-2" />
              </div>
              <p className="mb-1 font-medium text-ink">{s.title}</p>
              <p className="mb-1 text-sm text-ink-2">{s.description}</p>
              <p className="text-xs text-ink-3">{s.detail}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
