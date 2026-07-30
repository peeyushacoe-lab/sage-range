"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoucherToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, {
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
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-full font-semibold transition disabled:opacity-50 ${
        on
          ? "bg-ok-wash text-ok hover:bg-danger-wash hover:text-danger"
          : "bg-surface-3 text-ink-2 hover:bg-ok-wash hover:text-ok"
      }`}
    >
      {loading ? "…" : on ? "Active" : "Inactive"}
    </button>
  );
}
