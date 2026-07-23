import Image from "next/image";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { signOut } from "@/auth";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/8 flex flex-col sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/8 shrink-0">
          <Image src="/logo.png" alt="Sage Vault" width={36} height={36} className="rounded-md" unoptimized />
          <div>
            <p className="text-xs font-black tracking-widest text-emerald-400">SAGE VAULT</p>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <AdminNav />

        {/* User + sign out */}
        <div className="p-4 border-t border-white/8 shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-xs font-bold text-red-400">
              {(me.displayName ?? me.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-300 truncate">{me.displayName ?? "Admin"}</p>
              <p className="text-[10px] text-zinc-600 truncate">{me.email}</p>
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
              className="w-full text-left text-xs text-zinc-600 hover:text-zinc-300 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
