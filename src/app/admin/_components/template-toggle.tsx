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
          ? "bg-ok-wash text-ok hover:bg-ok-wash"
          : "bg-surface-3 text-ink-2 hover:bg-surface-3"
      }`}
    >
      {loading ? "…" : active ? "Published" : "Unpublished"}
    </button>
  );
}
