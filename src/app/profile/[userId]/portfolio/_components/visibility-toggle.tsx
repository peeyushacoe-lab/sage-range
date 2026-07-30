"use client";

import { useState } from "react";

interface Props {
  itemId: string;
  isPublic: boolean;
}

export function VisibilityToggle({ itemId, isPublic: initialPublic }: Props) {
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio/${itemId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) setIsPublic((v) => !v);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isPublic ? "Visible to recruiters — click to make private" : "Private — click to make public"}
      className={`text-xs font-medium rounded-full border px-2.5 py-1 transition ${
        loading
          ? "opacity-50 cursor-not-allowed border-edge text-ink-3"
          : isPublic
          ? "border-ok-edge text-ok hover:bg-ok-wash"
          : "border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2"
      }`}
    >
      {loading ? "…" : isPublic ? "Public" : "Private"}
    </button>
  );
}
