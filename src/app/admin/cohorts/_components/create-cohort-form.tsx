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
      <button onClick={() => setOpen(true)} className="text-xs text-zinc-500 hover:text-emerald-400 border border-dashed border-white/10 hover:border-emerald-500/30 rounded-lg px-4 py-2.5 transition w-full text-left">
        + Create cohort
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/2 p-5 space-y-4 max-w-lg">
      <p className="text-sm font-semibold text-white">New Cohort</p>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. September 2026 Internship" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
      </div>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Join Code (auto-generated)</label>
        <p className="font-mono text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded px-3 py-2">{joinCode}</p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading} className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 disabled:opacity-50 transition">
          {loading ? "Creating…" : "Create Cohort"}
        </button>
        <button onClick={() => { setOpen(false); setError(null); }} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition">Cancel</button>
      </div>
    </div>
  );
}
