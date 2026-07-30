"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AnnouncementForm() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!title.trim() || !body.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, href: href.trim() || undefined }),
      });
      if (res.ok) {
        setTitle("");
        setBody("");
        setHref("");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-edge bg-surface-1 p-5 space-y-3">
      <p className="text-xs text-ink-3 uppercase tracking-widest">New announcement</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — e.g. New Blue Team Simulation Added"
        maxLength={160}
        className="w-full rounded-lg border border-edge bg-surface-0 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body"
        maxLength={2000}
        rows={3}
        className="w-full rounded-lg border border-edge bg-surface-0 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge resize-none"
      />
      <input
        value={href}
        onChange={(e) => setHref(e.target.value)}
        placeholder="Link (optional) — e.g. /competitions"
        maxLength={500}
        className="w-full rounded-lg border border-edge bg-surface-0 px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
      />
      <button
        onClick={submit}
        disabled={pending || !title.trim() || !body.trim()}
        className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition"
      >
        {pending ? "Posting…" : "Post announcement"}
      </button>
    </div>
  );
}
