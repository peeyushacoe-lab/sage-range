"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = ["TRIAL", "BASIC", "PRO", "ENTERPRISE"] as const;
const DEFAULT_SEATS: Record<string, number> = { TRIAL: 30, BASIC: 100, PRO: 500, ENTERPRISE: 9999 };

export function NewInstitutionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [plan, setPlan] = useState<typeof PLANS[number]>("TRIAL");
  const [seats, setSeats] = useState(30);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, contactEmail, plan, seats, expiresAt: expiresAt || undefined, notes: notes || undefined }),
      });
      const data = await res.json() as { error?: string; joinCode?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setOpen(false);
      setName(""); setContactEmail(""); setPlan("TRIAL"); setSeats(30); setExpiresAt(""); setNotes("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-700 hover:text-white transition"
      >
        + New Institution
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-zinc-950 w-full max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">New Institution</p>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white text-xs">✕ Cancel</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Institution name"
          className="col-span-2 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/60" />
        <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required type="email" placeholder="Contact email"
          className="col-span-2 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/60" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Plan</label>
          <select value={plan} onChange={(e) => { const p = e.target.value as typeof PLANS[number]; setPlan(p); setSeats(DEFAULT_SEATS[p]); }}
            className="rounded-lg bg-zinc-900 border border-white/10 px-2 py-2 text-sm text-white focus:outline-none">
            {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Seats</label>
          <input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))}
            className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none" />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-zinc-500">Expires (optional)</label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-sage-500/60" />
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes (optional)" rows={2}
          className="col-span-2 rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/60 resize-none" />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading || !name.trim() || !contactEmail.trim()}
        className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white disabled:opacity-40 transition">
        {loading ? "Creating…" : "Create Institution"}
      </button>
    </form>
  );
}
