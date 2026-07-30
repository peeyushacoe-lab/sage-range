"use client";

import { useState, useTransition } from "react";

export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const [active, setActive] = useState(published);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !active;
      const res = await fetch(`/api/scenarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: next }),
      });
      if (res.ok) setActive(next);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`text-xs font-semibold uppercase tracking-widest border rounded px-2.5 py-1 transition-colors disabled:opacity-60 ${
        active
          ? "border-ok-edge bg-ok-wash text-ok hover:bg-ok-wash"
          : "border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2"
      }`}
    >
      {active ? "Published" : "Draft"}
    </button>
  );
}
