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
          ? "border-warn-edge text-warn bg-warn-wash hover:bg-warn-wash"
          : "border-edge text-ink-3 hover:border-warn-edge hover:text-warn"
      }`}
    >
      {loading ? "…" : isRequired ? "Required" : "Optional"}
    </button>
  );
}
