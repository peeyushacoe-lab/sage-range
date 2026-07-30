"use client";

import { useState } from "react";

export function TemplateToggle({ id, published }: { id: string; published: boolean }) {
  const [active, setActive] = useState(published);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/template/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !active }),
      });
      if (res.ok) setActive((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`text-xs px-3 py-1 rounded-full font-semibold transition disabled:opacity-50 ${
        active
          ? "bg-sage-500/20 text-sage-500 hover:bg-sage-500/30"
          : "bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30"
      }`}
    >
      {loading ? "…" : active ? "Published" : "Unpublished"}
    </button>
  );
}
