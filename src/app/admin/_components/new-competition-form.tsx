"use client";

import { useState } from "react";

type Lab = { id: string; slug: string; title: string };

export function NewCompetitionForm({ labs, onCreated }: { labs: Lab[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  function toggleSlug(slug: string) {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !description || !startDate || !endDate || selectedSlugs.length === 0) {
      setError("All fields are required and at least one lab must be selected.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          labSlugs: selectedSlugs,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create competition.");
        return;
      }
      setName(""); setDescription(""); setStartDate(""); setEndDate(""); setSelectedSlugs([]);
      setOpen(false);
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-sage-500/20 text-sage-500 hover:bg-sage-500/30 font-semibold transition"
      >
        + New Competition
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-white/10 p-5 space-y-4 mt-4">
      <h3 className="text-sm font-semibold text-zinc-300">New Competition</h3>
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
            placeholder="Spring CTF 2025"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Description</label>
          <input
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
            placeholder="Open to all students…"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Start Date</label>
          <input
            type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">End Date</label>
          <input
            type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-2">Labs included</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {labs.map((lab) => (
            <label key={lab.slug} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSlugs.includes(lab.slug)}
                onChange={() => toggleSlug(lab.slug)}
                className="accent-sage-500"
              />
              <span>{lab.title}</span>
              <span className="text-xs text-zinc-600 font-mono">{lab.slug}</span>
            </label>
          ))}
        </div>
        {labs.length === 0 && <p className="text-xs text-zinc-600">No published labs available.</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="submit" disabled={loading}
          className="text-xs px-4 py-2 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Competition"}
        </button>
        <button
          type="button" onClick={() => setOpen(false)}
          className="text-xs px-4 py-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
