import Image from "next/image";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { getOrCreateAppUser } from "@/lib/current-user";
import { signOut } from "@/auth";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-surface-0 text-ink">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-edge bg-surface-1">
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-edge px-5">
          <Image src="/logo.png" alt="Sage Vault" width={28} height={28} className="rounded-md" unoptimized />
          <div>
            <p className="font-mono text-xs font-medium tracking-[0.12em] text-ink">SAGE VAULT</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <AdminNav />

        {/* User + sign out */}
        <div className="shrink-0 border-t border-edge p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-danger-edge bg-danger-wash text-xs font-medium text-danger">
              {(me.displayName ?? me.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-2">{me.displayName ?? "Admin"}</p>
              <p className="truncate text-[10px] text-ink-3">{me.email}</p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center gap-1.5 text-left text-xs text-ink-3 transition-colors duration-fast hover:text-ink-2"
            >
              <LogOut aria-hidden="true" className="h-3 w-3" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
