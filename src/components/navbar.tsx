import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getOrCreateAppUser } from "@/lib/current-user";

const ROLE_BADGE: Record<string, string> = {
  RECRUITER:  "border-amber-500/40 bg-amber-500/8 text-amber-400",
  INSTRUCTOR: "border-blue-500/40 bg-blue-500/8 text-blue-400",
  ADMIN:      "border-red-500/40 bg-red-500/8 text-red-400",
  STUDENT:    "border-emerald-500/40 bg-emerald-500/8 text-emerald-400",
};

export async function Navbar({ backHref, backLabel }: { backHref?: string; backLabel?: string } = {}) {
  const user = await getOrCreateAppUser();
  const role = user?.role ?? "STUDENT";

  return (
    <nav className="border-b border-white/8 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xs font-bold tracking-widest text-emerald-500 shrink-0">
            SAGE FORGE
          </Link>
          {backHref && backLabel && (
            <Link href={backHref} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← {backLabel}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-5 text-sm text-zinc-400">
          {(role === "STUDENT") && (
            <>
              <Link href="/classroom"      className="hover:text-zinc-100 transition-colors">Classroom</Link>
              <Link href="/labs"           className="hover:text-zinc-100 transition-colors">Labs</Link>
              <Link href="/paths"          className="hover:text-zinc-100 transition-colors">Paths</Link>
              <Link href="/simulation/new" className="hover:text-zinc-100 transition-colors">Simulations</Link>
              <Link href="/competitions"   className="hover:text-zinc-100 transition-colors">Competitions</Link>
              <Link href="/leaderboard"    className="hover:text-zinc-100 transition-colors">Leaderboard</Link>
            </>
          )}
          {(role === "INSTRUCTOR") && (
            <>
              <Link href="/classroom"            className="hover:text-zinc-100 transition-colors">Classrooms</Link>
              <Link href="/simulation/new"        className="hover:text-zinc-100 transition-colors">Simulations</Link>
              <Link href="/labs"                  className="hover:text-zinc-100 transition-colors">Labs</Link>
              <Link href="/leaderboard"           className="hover:text-zinc-100 transition-colors">Leaderboard</Link>
              <Link href="/analytics/instructor"  className="hover:text-zinc-100 transition-colors">Analytics</Link>
              <Link href="/billing"               className="hover:text-white transition-colors text-zinc-300">Billing</Link>
            </>
          )}
          {(role === "RECRUITER") && (
            <>
              <Link href="/recruiter"            className="text-amber-400 hover:text-amber-300 transition-colors">Marketplace</Link>
              <Link href="/analytics/recruiter"  className="hover:text-zinc-100 transition-colors">Analytics</Link>
              <Link href="/leaderboard"          className="hover:text-zinc-100 transition-colors">Leaderboard</Link>
            </>
          )}
          {role === "ADMIN" && (
            <>
              <Link href="/labs"           className="hover:text-zinc-100 transition-colors">Labs</Link>
              <Link href="/classroom"      className="hover:text-zinc-100 transition-colors">Classroom</Link>
              <Link href="/recruiter"      className="hover:text-zinc-100 transition-colors">Recruiter</Link>
              <Link href="/admin"          className="hover:text-zinc-100 transition-colors">Admin</Link>
            </>
          )}
          {user && (
            <Link href={`/profile/${user.id}`} className="hover:text-zinc-100 transition-colors">Profile</Link>
          )}
          <Link href="/pricing" className="hover:text-zinc-100 transition-colors text-zinc-600">Pricing</Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${ROLE_BADGE[role] ?? ROLE_BADGE.STUDENT}`}>
            {role}
          </span>
          <UserButton />
        </div>
      </div>
    </nav>
  );
}
