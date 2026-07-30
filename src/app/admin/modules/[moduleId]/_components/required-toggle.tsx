"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { moduleId: string; isRequired: boolean; }

export function RequiredToggle({ moduleId, isRequired }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    await fetch(`/api/admin/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRequired: !isRequired }),
    });
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg border px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
        isRequired
          ? "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/15"
          : "border-white/10 text-zinc-500 hover:border-amber-500/30 hover:text-amber-400"
      }`}
    >
      {loading ? "…" : isRequired ? "Required" : "Optional"}
    </button>
  );
}
