"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  pathId: string;
  nextOrder: number;
}

export function CreateModuleForm({ pathId, nextOrder }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [overview, setOverview] = useState("");
  const [readingMaterial, setReadingMaterial] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathId, title: title.trim(), overview: overview.trim(), readingMaterial: readingMaterial.trim(), order: nextOrder }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to create module");
        return;
      }
      setTitle(""); setOverview(""); setReadingMaterial("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to create module");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-500 hover:text-emerald-400 border border-dashed border-white/10 hover:border-emerald-500/30 rounded-lg px-4 py-2.5 transition w-full text-left"
      >
        + Add module
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/2 p-5 space-y-4">
      <p className="text-sm font-semibold text-white">New Module (order {nextOrder + 1})</p>

      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Introduction to SIEM"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Overview</label>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          rows={3}
          placeholder="Brief summary of what this module covers..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Reading Material</label>
        <textarea
          value={readingMaterial}
          onChange={(e) => setReadingMaterial(e.target.value)}
          rows={6}
          placeholder="Main reading content (supports plain text or markdown)..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-none font-mono"
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition"
        >
          {loading ? "Creating…" : "Create Module"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
