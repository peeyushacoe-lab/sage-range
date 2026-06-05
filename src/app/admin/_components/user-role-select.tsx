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

  const color =
    role === "ADMIN" ? "text-red-400" :
    role === "INSTRUCTOR" ? "text-sage-400" :
    role === "RECRUITER" ? "text-amber-400" :
    "text-zinc-400";

  return (
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
  );
}
