"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = { href: string; label: string };

function useActiveClass(href: string, pathname: string) {
  const isActive =
    href === "/simulation/new"
      ? pathname.startsWith("/simulation")
      : pathname === href || pathname.startsWith(href + "/");

  if (!isActive) return "text-zinc-500 hover:text-zinc-100 transition-colors";
  if (href === "/daily") return "text-emerald-400 font-semibold";
  return "text-zinc-100 font-semibold";
}

const STUDENT_LINKS: NavLink[] = [
  { href: "/daily",          label: "Daily"   },
  { href: "/feed",           label: "Feed"    },
  { href: "/labs",           label: "Labs"    },
  { href: "/simulation/new", label: "Sims"    },
  { href: "/paths",          label: "Paths"   },
  { href: "/competitions",   label: "Compete" },
  { href: "/scoreboard",     label: "Ranks"   },
  { href: "/stats",          label: "Stats"   },
  { href: "/skills",         label: "Radar"   },
  { href: "/achievements",   label: "Awards"  },
  { href: "/mitre",          label: "ATT&CK"  },
  { href: "/workspace",      label: "IR Lab"  },
  { href: "/organization",   label: "Team"    },
  { href: "/resume",         label: "Resume"  },
];

const INSTRUCTOR_LINKS: NavLink[] = [
  { href: "/classroom",           label: "Classrooms"   },
  { href: "/simulation/new",      label: "Simulations"  },
  { href: "/scenarios/builder",   label: "Build"        },
  { href: "/labs",                label: "Labs"         },
  { href: "/leaderboard",         label: "Leaderboard"  },
  { href: "/analytics/instructor",label: "Analytics"    },
];

const RECRUITER_LINKS: NavLink[] = [
  { href: "/recruiter",           label: "Marketplace" },
  { href: "/analytics/recruiter", label: "Analytics"   },
  { href: "/leaderboard",         label: "Leaderboard" },
];

export function NavLinks({
  role,
  profileHref,
}: {
  role: string;
  profileHref: string | null;
}) {
  const pathname = usePathname();

  const links =
    role === "STUDENT"    ? STUDENT_LINKS    :
    role === "INSTRUCTOR" ? INSTRUCTOR_LINKS :
    role === "RECRUITER"  ? RECRUITER_LINKS  : [];

  return (
    <div className="flex items-center gap-3 text-xs">
      {links.map(l => (
        <Link key={l.href} href={l.href} className={useActiveClass(l.href, pathname)}>
          {l.label}
        </Link>
      ))}
      {profileHref && (
        <Link
          href={profileHref}
          className={useActiveClass(profileHref, pathname)}
        >
          Profile
        </Link>
      )}
    </div>
  );
}
