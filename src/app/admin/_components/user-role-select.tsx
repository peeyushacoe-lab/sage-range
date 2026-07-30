"use client";

import { useState } from "react";

const ROLES = ["STUDENT", "INSTRUCTOR", "RECRUITER", "ADMIN"] as const;

export function UserRoleSelect({ userId, currentRole, isSelf }: {
  userId: string;
  currentRole: string;
  isSelf: boolean;
}) {
  const [role, setRole] = useState(currentRole);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (res.ok) setRole(next);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this user and all their data? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/user/${userId}`, { method: "DELETE" });
      if (res.ok) setDeleted(true);
    } finally {
      setDeleting(false);
    }
  }

  if (deleted) return <span className="text-xs text-zinc-600 italic">deleted</span>;

  const color =
    role === "ADMIN" ? "text-red-400" :
    role === "INSTRUCTOR" ? "text-sage-400" :
    role === "RECRUITER" ? "text-amber-400" :
    "text-zinc-400";

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={handleChange}
        disabled={saving || isSelf}
        className={`bg-zinc-900 border border-white/10 rounded px-2 py-0.5 text-xs font-semibold focus:outline-none disabled:opacity-40 ${color}`}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {!isSelf && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-500 hover:text-red-400 disabled:opacity-40 transition-colors"
        >
          {deleting ? "…" : "Delete"}
        </button>
      )}
    </div>
  );
}
