"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VoucherDeleteBtn({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function doDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/vouchers/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={doDelete}
          disabled={loading}
          className="text-xs px-2 py-1 rounded bg-danger-wash text-danger hover:bg-danger-wash transition disabled:opacity-50"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs px-2 py-1 rounded text-ink-3 hover:text-white transition"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title={`Delete ${code}`}
      className="text-xs px-2 py-1 rounded text-ink-3 hover:text-danger transition"
    >
      Delete
    </button>
  );
}
