import Link from "next/link";
import Image from "next/image";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { NotificationBell } from "@/components/notification-bell";
import { SearchTrigger } from "@/components/search-modal";

const ROLE_BADGE: Record<string, string> = {
  RECRUITER:  "border-amber-500/40 bg-amber-500/8 text-amber-400",
  INSTRUCTOR: "border-blue-500/40 bg-blue-500/8 text-blue-400",
  ADMIN:      "border-red-500/40 bg-red-500/8 text-red-400",
  STUDENT:    "border-emerald-500/40 bg-emerald-500/8 text-emerald-400",
};

export async function Navbar({ backHref, backLabel }: { backHref?: string; backLabel?: string } = {}) {
  const user = await getOrCreateAppUser();
  const role = user?.role ?? "STUDENT";

  const unreadCount = user
    ? await db.notification.count({ where: { userId: user.id, read: false } })
    : 0;

  return (
    <nav className="border-b border-white/8 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href={role === "ADMIN" ? "/admin" : "/dashboard"} className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Sage Vault" width={38} height={38} className="rounded-md" unoptimized />
            <span className="text-xs font-bold tracking-widest text-emerald-500">SAGE VAULT</span>
          </Link>
          {backHref && backLabel && (
            <Link href={backHref} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              ← {backLabel}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-5 text-sm text-zinc-400">
          {role === "ADMIN" ? (
            <Link href="/admin" className="text-red-400 hover:text-red-300 transition-colors font-medium text-xs uppercase tracking-widest">
              Admin Panel
            </Link>
          ) : (
            <NavLinks role={role} profileHref={user ? `/profile/${user.id}` : null} />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <SearchTrigger />
          {user && <NotificationBell initialUnread={unreadCount} />}
          <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ml-1 ${ROLE_BADGE[role] ?? ROLE_BADGE.STUDENT}`}>
            {role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
