import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { UserRoleSelect } from "../_components/user-role-select";

export const dynamic = "force-dynamic";

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      "bg-red-500/10 text-red-400 border-red-500/30",
  INSTRUCTOR: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  RECRUITER:  "bg-amber-500/10 text-amber-400 border-amber-500/30",
  STUDENT:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

export default async function UsersPage() {
  const me = await getOrCreateAppUser();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, displayName: true, role: true, skillScore: true, xp: true, createdAt: true },
  });

  const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
    acc[u.role] = (acc[u.role] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-zinc-500 text-sm mt-1">{users.length} registered accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {(["STUDENT", "INSTRUCTOR", "RECRUITER", "ADMIN"] as const).map((r) => (
            <span key={r} className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-1 ${ROLE_COLORS[r]}`}>
              {roleCounts[r] ?? 0} {r.toLowerCase()}s
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">User</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Email</th>
              <th className="text-left px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Role</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Score</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">XP</th>
              <th className="text-right px-4 py-3 text-xs text-zinc-500 uppercase tracking-wider font-mono">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLORS[u.role]}`}>
                      {(u.displayName ?? u.email)[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-zinc-200">{u.displayName ?? <span className="text-zinc-600 italic">No name</span>}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs font-mono">{u.email}</td>
                <td className="px-4 py-3">
                  <UserRoleSelect userId={u.id} currentRole={u.role} isSelf={u.id === me?.id} />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-zinc-300 tabular-nums">{u.skillScore}</td>
                <td className="px-4 py-3 text-right text-zinc-500 text-xs tabular-nums">{u.xp}</td>
                <td className="px-4 py-3 text-right text-xs text-zinc-600 font-mono">{u.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">No users yet.</div>
        )}
      </div>
    </div>
  );
}
