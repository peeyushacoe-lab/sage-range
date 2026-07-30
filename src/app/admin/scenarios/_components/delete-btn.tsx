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
        className="text-xs text-ink-3 hover:text-danger transition-colors"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-xs text-ink-3">Sure?</span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-xs text-danger hover:text-danger disabled:opacity-60"
      >
        {pending ? "…" : "Yes"}
      </button>
      <button onClick={() => setConfirm(false)} className="text-xs text-ink-3 hover:text-ink-2">
        No
      </button>
    </span>
  );
}
