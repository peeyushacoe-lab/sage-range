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
    <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5 space-y-3">
      <p className="text-xs text-zinc-500 uppercase tracking-widest">New announcement</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — e.g. New Blue Team Simulation Added"
        maxLength={160}
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Body"
        maxLength={2000}
        rows={3}
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40 resize-none"
      />
      <input
        value={href}
        onChange={(e) => setHref(e.target.value)}
        placeholder="Link (optional) — e.g. /competitions"
        maxLength={500}
        className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/40"
      />
      <button
        onClick={submit}
        disabled={pending || !title.trim() || !body.trim()}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 transition"
      >
        {pending ? "Posting…" : "Post announcement"}
      </button>
    </div>
  );
}
