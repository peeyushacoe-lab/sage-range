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
          ? "border-ok-edge text-ok hover:bg-danger-wash hover:border-danger-edge hover:text-danger"
          : "border-edge text-ink-3 hover:border-ok-edge hover:text-ok"
      }`}
    >
      {loading ? "…" : published ? "Published" : "Publish"}
    </button>
  );
}
