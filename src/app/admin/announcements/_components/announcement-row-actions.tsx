"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AnnouncementRowActions({ id, published }: { id: string; published: boolean }) {
  const [active, setActive] = useState(published);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      const next = !active;
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, published: next }),
      });
      if (res.ok) setActive(next);
    });
  }

  function del() {
    startTransition(async () => {
      await fetch(`/api/admin/announcements?announcementId=${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={toggle}
        disabled={pending}
        className={`text-xs font-semibold uppercase tracking-widest border rounded px-2.5 py-1 transition-colors disabled:opacity-60 ${
          active
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400"
        }`}
      >
        {active ? "Published" : "Hidden"}
      </button>
      {!confirm ? (
        <button onClick={() => setConfirm(true)} className="text-xs text-zinc-600 hover:text-red-400 transition-colors">
          Delete
        </button>
      ) : (
        <span className="flex items-center gap-2">
          <button onClick={del} disabled={pending} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60">
            {pending ? "…" : "Confirm"}
          </button>
          <button onClick={() => setConfirm(false)} className="text-xs text-zinc-600 hover:text-zinc-300">
            Cancel
          </button>
        </span>
      )}
    </div>
  );
}
