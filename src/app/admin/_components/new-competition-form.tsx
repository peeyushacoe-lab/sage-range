"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Lab = { id: string; slug: string; title: string };

export function NewCompetitionForm({ labs }: { labs: Lab[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [freezeAt, setFreezeAt] = useState("");
  const [prizeDesc, setPrizeDesc] = useState("");
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
          freezeAt: freezeAt ? new Date(freezeAt).toISOString() : undefined,
          prizeDesc: prizeDesc || undefined,
          labSlugs: selectedSlugs,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create competition.");
        return;
      }
      setName(""); setDescription(""); setStartDate(""); setEndDate(""); setFreezeAt(""); setPrizeDesc(""); setSelectedSlugs([]);
      setOpen(false);
      router.refresh();
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
        className="text-xs px-3 py-1.5 rounded-lg bg-ok-wash text-ok hover:bg-ok-wash font-semibold transition"
      >
        + New Competition
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-edge p-5 space-y-4 mt-4">
      <h3 className="text-sm font-semibold text-ink-2">New Competition</h3>
      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-ink-3 mb-1">Name</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            className="w-full rounded bg-surface-1 border border-edge px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
            placeholder="Spring CTF 2025"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1">Description</label>
          <input
            value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded bg-surface-1 border border-edge px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
            placeholder="Open to all students…"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1">Start Date</label>
          <input
            type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded bg-surface-1 border border-edge px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1">End Date</label>
          <input
            type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded bg-surface-1 border border-edge px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1">Freeze Scoreboard At <span className="text-ink-3">(optional)</span></label>
          <input
            type="datetime-local" value={freezeAt} onChange={(e) => setFreezeAt(e.target.value)}
            className="w-full rounded bg-surface-1 border border-edge px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-3 mb-1">Prize Description <span className="text-ink-3">(optional)</span></label>
          <input
            value={prizeDesc} onChange={(e) => setPrizeDesc(e.target.value)}
            className="w-full rounded bg-surface-1 border border-edge px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
            placeholder="Top 3 receive Sage Vault merchandise"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-ink-3 mb-2">Labs included</label>
        <div className="grid sm:grid-cols-2 gap-2">
          {labs.map((lab) => (
            <label key={lab.slug} className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSlugs.includes(lab.slug)}
                onChange={() => toggleSlug(lab.slug)}
                className="accent-sage-500"
              />
              <span>{lab.title}</span>
              <span className="text-xs text-ink-3 font-mono">{lab.slug}</span>
            </label>
          ))}
        </div>
        {labs.length === 0 && <p className="text-xs text-ink-3">No published labs available.</p>}
      </div>

      <div className="flex gap-2">
        <button
          type="submit" disabled={loading}
          className="text-xs px-4 py-2 rounded-lg bg-accent-fill text-white font-semibold hover:bg-ok-wash hover:text-white transition disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Competition"}
        </button>
        <button
          type="button" onClick={() => setOpen(false)}
          className="text-xs px-4 py-2 rounded-lg border border-edge text-ink-2 hover:text-white hover:border-edge-strong transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
