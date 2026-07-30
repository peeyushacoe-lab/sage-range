"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function CreateCohortForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [joinCode] = useState(() => randomCode());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          startDate: startDate || null,
          endDate: endDate || null,
          joinCode,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setOpen(false);
      router.refresh();
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-ink-3 hover:text-ok border border-dashed border-edge hover:border-ok-edge rounded-lg px-4 py-2.5 transition w-full text-left">
        + Create cohort
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-white/2 p-5 space-y-4 max-w-lg">
      <p className="text-sm font-semibold text-white">New Cohort</p>
      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. September 2026 Internship" className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
      </div>
      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..." className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
        </div>
        <div>
          <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-edge bg-surface-2 px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge" />
        </div>
      </div>
      <div>
        <label className="text-xs text-ink-3 uppercase tracking-wider block mb-1">Join Code (auto-generated)</label>
        <p className="font-mono text-ok text-sm bg-ok-wash border border-ok-edge rounded px-3 py-2">{joinCode}</p>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading} className="rounded-lg bg-ok-wash border border-ok-edge px-4 py-2 text-xs font-semibold text-ok hover:bg-ok-wash disabled:opacity-50 transition">
          {loading ? "Creating…" : "Create Cohort"}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }} className="rounded-lg border border-edge px-4 py-2 text-xs text-ink-3 hover:text-ink-2 transition">Cancel</button>
      </div>
    </div>
  );
}
