"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OrganizationActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/organization/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !on }),
      });
      if (res.ok) { setOn((v) => !v); router.refresh(); }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={toggle} disabled={loading}
      className={`text-xs px-3 py-1 rounded-full font-semibold transition disabled:opacity-50 ${
        on ? "bg-sage-500/20 text-sage-500 hover:bg-red-500/10 hover:text-red-400"
           : "bg-zinc-500/20 text-zinc-400 hover:bg-sage-500/20 hover:text-sage-400"
      }`}>
      {loading ? "…" : on ? "Active" : "Inactive"}
    </button>
  );
}
