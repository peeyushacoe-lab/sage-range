"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

function isActive(href: string, pathname: string) {
  if (href === "/simulation/new") return pathname.startsWith("/simulation");
  return pathname === href || pathname.startsWith(href + "/");
}

// Active state reads by weight + colour together, never colour alone — a
// colourblind or greyscale view still shows which link is current.
function linkCls(href: string, pathname: string) {
  return isActive(href, pathname) ? "text-ink font-medium" : "text-ink-3 hover:text-ink-2";
}

const STUDENT_PRIMARY: NavLink[] = [
  { href: "/daily",          label: "Daily"     },
  { href: "/academy",        label: "Academy"   },
  { href: "/labs",           label: "Labs"      },
  { href: "/incidents",      label: "Incidents" },
  { href: "/simulation/new", label: "Sims"      },
  { href: "/paths",          label: "Paths"     },
  { href: "/feed",           label: "Feed"      },
];

type NavGroup = { label: string; links: NavLink[] };

const STUDENT_MORE: NavGroup[] = [
  {
    label: "Compete",
    links: [
      { href: "/seasons",                 label: "Ranked Season"  },
      { href: "/tournaments",             label: "Tournaments"    },
      { href: "/competitions",            label: "Competitions"   },
      { href: "/labs/incidents/weekly",   label: "Weekly Case"    },
      { href: "/daily-hunt",              label: "Daily Hunt"     },
      { href: "/soc-shift",               label: "SOC Shift"      },
      { href: "/labs/tickets",            label: "Ticket Queue"   },
      { href: "/soc-league",              label: "SOC League"     },
      { href: "/scoreboard",              label: "Leaderboard"    },
    ],
  },
  {
    label: "Blue team tools",
    links: [
      { href: "/threat-bulletin",  label: "Threat Bulletin"},
      { href: "/labs/hunts",       label: "Threat Hunt"    },
      { href: "/detection-lab",    label: "Detection Lab"  },
      { href: "/labs/rules/builder",   label: "Rule Builder"   },
      { href: "/labs/rules/community", label: "Community Rules"},
      { href: "/purple-team",      label: "Purple Team"    },
      { href: "/workspace",        label: "IR Workspace"   },
    ],
  },
  {
    label: "Career",
    links: [
      { href: "/career",           label: "Role Readiness" },
      { href: "/jobs",             label: "Job Board"      },
      { href: "/resume",           label: "Resume"         },
    ],
  },
  {
    label: "Progress",
    links: [
      { href: "/achievements",     label: "Achievements"   },
      { href: "/mitre",            label: "ATT&CK Map"     },
      { href: "/skills",           label: "Skills Radar"   },
      { href: "/stats",            label: "Stats"          },
      { href: "/transcript",       label: "Transcript"     },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/squads",             label: "Squads"         },
      { href: "/organization",       label: "Team"           },
      { href: "/profile",            label: "Portfolio"      },
      { href: "/labs/mentor/quality",label: "Hint Quality"   },
    ],
  },
];

const INSTRUCTOR_LINKS: NavLink[] = [
  { href: "/classroom",            label: "Classrooms" },
  { href: "/simulation/new",       label: "Sims"       },
  { href: "/scenarios/builder",    label: "Build"      },
  { href: "/labs",                 label: "Labs"       },
  { href: "/analytics/instructor", label: "Analytics"  },
];

const RECRUITER_LINKS: NavLink[] = [
  { href: "/recruiter",            label: "Marketplace" },
  { href: "/analytics/recruiter",  label: "Analytics"   },
  { href: "/leaderboard",          label: "Leaderboard" },
];

function MoreMenu({ groups, pathname }: { groups: NavGroup[]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const anyActive = groups.some((g) => g.links.some((l) => isActive(l.href, pathname)));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex cursor-pointer items-center gap-1 transition-colors duration-fast",
          anyActive ? "font-medium text-ink" : "text-ink-3 hover:text-ink-2"
        )}
      >
        More
        <ChevronDown aria-hidden="true" className={cn("h-3 w-3 transition-transform duration-fast", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-overlay mt-2 max-h-[80vh] w-56 overflow-y-auto rounded-lg border border-edge bg-surface-2 py-2 shadow-lg">
          {groups.map((g, gi) => (
            <div key={g.label} className={gi > 0 ? "mt-1.5 border-t border-edge-subtle pt-1.5" : ""}>
              <p className="px-4 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">{g.label}</p>
              {g.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block px-4 py-2 text-xs transition-colors duration-fast",
                    isActive(l.href, pathname)
                      ? "bg-surface-3 font-medium text-ink"
                      : "text-ink-2 hover:bg-surface-3 hover:text-ink"
                  )}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavLinks({
  role,
  profileHref,
}: {
  role: string;
  profileHref: string | null;
}) {
  const pathname = usePathname();

  if (role === "INSTRUCTOR") {
    return (
      <div className="flex items-center gap-4 text-xs">
        {INSTRUCTOR_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkCls(l.href, pathname)}>{l.label}</Link>
        ))}
        {profileHref && (
          <Link href={profileHref} className={linkCls(profileHref, pathname)}>Profile</Link>
        )}
      </div>
    );
  }

  if (role === "RECRUITER") {
    return (
      <div className="flex items-center gap-4 text-xs">
        {RECRUITER_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkCls(l.href, pathname)}>{l.label}</Link>
        ))}
        {profileHref && (
          <Link href={profileHref} className={linkCls(profileHref, pathname)}>Profile</Link>
        )}
      </div>
    );
  }

  // STUDENT
  return (
    <div className="flex items-center gap-4 text-xs">
      {STUDENT_PRIMARY.map((l) => (
        <Link key={l.href} href={l.href} className={linkCls(l.href, pathname)}>{l.label}</Link>
      ))}
      <MoreMenu groups={STUDENT_MORE} pathname={pathname} />
      {profileHref && (
        <Link href={profileHref} className={linkCls(profileHref, pathname)}>Profile</Link>
      )}
    </div>
  );
}
