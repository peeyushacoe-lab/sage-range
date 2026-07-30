"use client";

import { useState } from "react";

type Member = {
  id: string;
  userId: string;
  isLead: boolean;
  joinedAt: string;
  user: { displayName: string | null; email: string; role: string };
};

export function OrganizationMembersPanel({ orgId }: { orgId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");

  async function toggleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (members) return; // already loaded
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/organization/${orgId}/members`);
      const data = await res.json() as { members?: Member[]; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to load members"); return; }
      setMembers(data.members ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function setLead(userId: string, isLead: boolean) {
    const res = await fetch(`/api/admin/organization/${orgId}/member/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLead }),
    });
    if (res.ok) {
      setMembers((prev) => prev?.map((m) => (m.userId === userId ? { ...m, isLead } : m)) ?? null);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={toggleOpen}
        className="text-xs text-zinc-500 hover:text-white transition-colors"
      >
        {open ? "Hide members ▲" : "Manage members / lead ▼"}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-white/10 overflow-hidden">
          {loading && <p className="text-xs text-zinc-500 p-3">Loading…</p>}
          {error && <p className="text-xs text-red-400 p-3">{error}</p>}
          {members && members.length === 0 && <p className="text-xs text-zinc-600 p-3">No members yet.</p>}
          {members && members.length > 0 && (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-white/5">
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="p-2.5">
                      <p className="text-zinc-200">{m.user.displayName ?? "—"}</p>
                      <p className="text-zinc-600 font-mono">{m.user.email}</p>
                    </td>
                    <td className="p-2.5 text-zinc-500">{m.user.role}</td>
                    <td className="p-2.5 text-right">
                      <button
                        onClick={() => setLead(m.userId, !m.isLead)}
                        className={`px-2.5 py-1 rounded-full font-semibold transition ${
                          m.isLead
                            ? "bg-amber-500/20 text-amber-400 hover:bg-red-500/10 hover:text-red-400"
                            : "bg-zinc-500/20 text-zinc-400 hover:bg-amber-500/20 hover:text-amber-400"
                        }`}
                      >
                        {m.isLead ? "Lead — remove" : "Make lead"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
