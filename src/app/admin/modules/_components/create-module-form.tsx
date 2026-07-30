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
        className="text-xs text-ink-3 hover:text-ok border border-dashed border-edge hover:border-ok-edge rounded-lg px-4 py-2.5 transition w-full text-left"
      >
        + Add module
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-white/2 p-5 space-y-4">
      <p className="text-sm font-semibold text-white">New Module (order {nextOrder + 1})</p>

      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Introduction to SIEM"
          className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
        />
      </div>

      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Overview</label>
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          rows={3}
          placeholder="Brief summary of what this module covers..."
          className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Reading Material</label>
        <textarea
          value={readingMaterial}
          onChange={(e) => setReadingMaterial(e.target.value)}
          rows={6}
          placeholder="Main reading content (supports plain text or markdown)..."
          className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge resize-none font-mono"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={loading}
          className="rounded-lg bg-ok-wash border border-ok-edge px-4 py-2 text-xs font-semibold text-ok hover:bg-ok-wash disabled:opacity-50 transition"
        >
          {loading ? "Creating…" : "Create Module"}
        </button>
        <button
          onClick={() => { setOpen(false); setError(null); }}
          className="rounded-lg border border-edge px-4 py-2 text-xs text-ink-3 hover:text-ink-2 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
