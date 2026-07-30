import Link from "next/link";
import Image from "next/image";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { NotificationBell } from "@/components/notification-bell";
import { SearchTrigger } from "@/components/search-modal";
import { cn } from "@/lib/utils";

// Role is identity, not status — it never borrows the status/severity ramps.
// Every role is a neutral mono pill except ADMIN, which gets danger: elevated
// privilege is worth a visual warning, and it keeps the Admin Panel link and
// its badge consistent with each other.
const ROLE_BADGE: Record<string, string> = {
  RECRUITER:  "border-edge-strong bg-surface-2 text-ink-2",
  INSTRUCTOR: "border-edge-strong bg-surface-2 text-ink-2",
  ADMIN:      "border-danger-edge bg-danger-wash text-danger",
  STUDENT:    "border-edge-strong bg-surface-2 text-ink-2",
};

export async function Navbar({ backHref, backLabel }: { backHref?: string; backLabel?: string } = {}) {
  const user = await getOrCreateAppUser();
  const role = user?.role ?? "STUDENT";

  const unreadCount = user
    ? await db.notification.count({ where: { userId: user.id, read: false } })
    : 0;

  return (
    <nav className="sticky top-0 z-sticky border-b border-edge bg-surface-1/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-6">
          <Link href={role === "ADMIN" ? "/admin" : "/dashboard"} className="flex shrink-0 items-center gap-2">
            <Image src="/logo.png" alt="Sage Vault" width={28} height={28} className="rounded-md" unoptimized />
            <span className="font-mono text-xs font-medium tracking-[0.12em] text-ink">SAGE VAULT</span>
          </Link>
          {backHref && backLabel && (
            <Link href={backHref} className="text-xs text-ink-3 transition-colors duration-fast hover:text-ink-2">
              ← {backLabel}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-5 text-sm text-ink-2">
          {role === "ADMIN" ? (
            <Link
              href="/admin"
              className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-danger transition-colors duration-fast hover:text-danger/80"
            >
              Admin panel
            </Link>
          ) : (
            <NavLinks role={role} profileHref={user ? `/profile/${user.id}` : null} />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <SearchTrigger />
          {user && <NotificationBell initialUnread={unreadCount} />}
          <span
            className={cn(
              "ml-1 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
              ROLE_BADGE[role] ?? ROLE_BADGE.STUDENT
            )}
          >
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
              className="cursor-pointer rounded-md px-2 py-1 text-xs text-ink-3 transition-colors duration-fast hover:bg-surface-2 hover:text-ink-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
