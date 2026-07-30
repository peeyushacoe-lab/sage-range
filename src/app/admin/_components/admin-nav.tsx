"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, Megaphone, CircleCheck, Users, Award, Building2, GraduationCap,
  FlaskConical, TriangleAlert, ChartColumnBig, FileText, History, BookOpen,
  UsersRound, Ticket, PenLine, DollarSign, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin",               label: "Overview",       icon: LayoutGrid },
  { href: "/admin/announcements", label: "Announcements",  icon: Megaphone },
  { href: "/admin/certificates",  label: "Certificates",   icon: CircleCheck },
  { href: "/admin/users",         label: "Users",          icon: Users },
  { href: "/admin/competitions",  label: "Competitions",   icon: Award },
  { href: "/admin/organizations", label: "Organizations",  icon: Building2 },
  { href: "/admin/academy",       label: "Academy",        icon: GraduationCap },
  { href: "/admin/labs",          label: "Labs",           icon: FlaskConical },
  { href: "/admin/incidents",     label: "Boss Fights",    icon: TriangleAlert },
  { href: "/admin/analytics",     label: "Analytics",      icon: ChartColumnBig },
  { href: "/admin/scenarios",     label: "Scenarios",      icon: FileText },
  { href: "/admin/sessions",      label: "Sessions",       icon: History },
  { href: "/admin/modules",       label: "Modules",        icon: BookOpen },
  { href: "/admin/cohorts",       label: "Cohorts",        icon: UsersRound },
  { href: "/admin/vouchers",      label: "Vouchers",       icon: Ticket },
  { href: "/admin/writeups",      label: "Writeups",       icon: PenLine },
  { href: "/admin/pricing",       label: "Pricing",        icon: DollarSign },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-3">
      {NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors duration-fast",
              active
                ? "border-accent-edge bg-accent-wash text-accent"
                : "border-transparent text-ink-3 hover:bg-surface-2 hover:text-ink-2"
            )}
          >
            <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", active ? "text-accent" : "text-ink-3")} />
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
