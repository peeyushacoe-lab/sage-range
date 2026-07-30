"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { moduleId: string; published: boolean; }

export function ModulePublishToggle({ moduleId, published }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    await fetch(`/api/admin/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !published }),
    });
    router.refresh();
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`rounded-lg border px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
        published
          ? "border-emerald-500/30 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
          : "border-white/10 text-zinc-500 hover:border-emerald-500/30 hover:text-emerald-400"
      }`}
    >
      {loading ? "…" : published ? "Published" : "Publish"}
    </button>
  );
}
