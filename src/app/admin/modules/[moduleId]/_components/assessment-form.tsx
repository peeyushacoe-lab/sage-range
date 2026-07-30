"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
interface Props {
  moduleId: string;
  existing: { id: string; title: string; instructions: string } | null;
}

export function AssessmentForm({ moduleId, existing }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(existing?.title ?? "");
  const [instructions, setInstructions] = useState(existing?.instructions ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = async () => {
    if (!title.trim() || !instructions.trim()) { setError("Title and instructions required"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/modules/${moduleId}/assessment`, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), instructions: instructions.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-edge p-5 space-y-4">
      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assessment title" className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
      </div>
      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Instructions</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} placeholder="Detailed instructions for the student..." className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge resize-none" />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <button onClick={submit} disabled={loading} className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${saved ? "bg-ok-wash border border-ok-edge text-ok" : "bg-ok-wash border border-ok-edge text-ok hover:bg-ok-wash"}`}>
        {loading ? "Saving…" : saved ? <><Icon name="check" size={12} /> Saved</> : existing ? "Update Assessment" : "Create Assessment"}
      </button>
    </div>
  );
}
