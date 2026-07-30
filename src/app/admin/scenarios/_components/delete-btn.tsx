"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteBtn({ id }: { id: string }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      await fetch(`/api/scenarios/${id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  if (!confirm) {
    return (
      <button
        onClick={() => setConfirm(true)}
        className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Sure?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
      >
        {pending ? "…" : "Yes"}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-zinc-600 hover:text-zinc-300">
        No
      </button>
    </span>
  );
}
