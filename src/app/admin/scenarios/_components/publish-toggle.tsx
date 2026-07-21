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
          ? "border-sage-500/40 bg-sage-500/10 text-sage-400 hover:bg-sage-500/5"
          : "border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400"
      }`}
    >
      {active ? "Published" : "Draft"}
    </button>
  );
}
