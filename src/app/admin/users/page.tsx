import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { UserRoleSelect } from "../_components/user-role-select";

export const dynamic = "force-dynamic";

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      "bg-danger-wash text-danger border-danger-edge",
  INSTRUCTOR: "bg-info-wash text-info border-info-edge",
  RECRUITER:  "bg-warn-wash text-warn border-warn-edge",
  STUDENT:    "bg-ok-wash text-ok border-ok-edge",
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
          <p className="text-ink-3 text-sm mt-1">{users.length} registered accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {(["STUDENT", "INSTRUCTOR", "RECRUITER", "ADMIN"] as const).map((r) => (
            <span key={r} className={`text-[10px] font-bold uppercase tracking-wider border rounded px-2 py-1 ${ROLE_COLORS[r]}`}>
              {roleCounts[r] ?? 0} {r.toLowerCase()}s
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-white/2">
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">User</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Email</th>
              <th className="text-left px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Role</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Score</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">XP</th>
              <th className="text-right px-4 py-3 text-xs text-ink-3 uppercase tracking-wider font-mono">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge-subtle">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLORS[u.role]}`}>
                      {(u.displayName ?? u.email)[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{u.displayName ?? <span className="text-ink-3 italic">No name</span>}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink-3 text-xs font-mono">{u.email}</td>
                <td className="px-4 py-3">
                  <UserRoleSelect userId={u.id} currentRole={u.role} isSelf={u.id === me?.id} />
                </td>
                <td className="px-4 py-3 text-right font-semibold text-ink-2 tabular-nums">{u.skillScore}</td>
                <td className="px-4 py-3 text-right text-ink-3 text-xs tabular-nums">{u.xp}</td>
                <td className="px-4 py-3 text-right text-xs text-ink-3 font-mono">{u.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-ink-3 text-sm">No users yet.</div>
        )}
      </div>
    </div>
  );
}
