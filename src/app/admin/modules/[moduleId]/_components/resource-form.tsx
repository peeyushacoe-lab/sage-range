"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ResourceType = "PDF" | "ARTICLE" | "DOCUMENTATION" | "GITHUB" | "EXTERNAL_LINK" | "TOOL_DOWNLOAD";

interface Props {
  moduleId: string;
  nextOrder: number;
}

const TYPES: ResourceType[] = ["PDF", "ARTICLE", "DOCUMENTATION", "GITHUB", "EXTERNAL_LINK", "TOOL_DOWNLOAD"];

export function ResourceForm({ moduleId, nextOrder }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ResourceType>("ARTICLE");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim() || !url.trim()) { setError("Title and URL are required"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), url: url.trim(), order: nextOrder }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setTitle(""); setUrl(""); setOpen(false);
      router.refresh();
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-zinc-500 hover:text-emerald-400 border border-dashed border-white/10 hover:border-emerald-500/30 rounded-lg px-4 py-2.5 transition w-full text-left">
        + Add resource
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/2 p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`rounded px-2.5 py-1 text-xs font-medium transition ${type === t ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "border border-white/10 text-zinc-500 hover:text-zinc-300"}`}>
            {t}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading} className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition">
          {loading ? "Adding…" : "Add Resource"}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}
