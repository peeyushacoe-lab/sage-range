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
      <button onClick={() => setOpen(true)} className="text-xs text-ink-3 hover:text-ok border border-dashed border-edge hover:border-ok-edge rounded-lg px-4 py-2.5 transition w-full text-left">
        + Add resource
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-white/2 p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setType(t)} className={`rounded px-2.5 py-1 text-xs font-medium transition ${type === t ? "bg-ok-wash border border-ok-edge text-ok" : "border border-edge text-ink-3 hover:text-ink-2"}`}>
            {t}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource title" className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading} className="rounded-lg bg-ok-wash border border-ok-edge px-3 py-1.5 text-xs font-semibold text-ok hover:bg-ok-wash disabled:opacity-50 transition">
          {loading ? "Adding…" : "Add Resource"}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }} className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-3 hover:text-ink-2 transition">
          Cancel
        </button>
      </div>
    </div>
  );
}
