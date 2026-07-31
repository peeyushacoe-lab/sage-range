"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Lab = { id: string; slug: string; title: string };
type Named = { id: string; name: string };

type Visibility = "PUBLIC" | "ORGANIZATION" | "COHORT" | "INVITE_ONLY";

const VISIBILITY_HELP: Record<Visibility, string> = {
  PUBLIC: "Anyone signed in can see and enter.",
  ORGANIZATION: "Only members of the chosen organization.",
  COHORT: "Only members of the chosen classroom.",
  INVITE_ONLY: "Hidden from listings. An invite code is generated on create.",
};

export function NewCompetitionForm({
  labs,
  organizations = [],
  cohorts = [],
}: {
  labs: Lab[];
  organizations?: Named[];
  cohorts?: Named[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [freezeAt, setFreezeAt] = useState("");
  const [prizeDesc, setPrizeDesc] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [organizationId, setOrganizationId] = useState("");
  const [cohortId, setCohortId] = useState("");

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
    // Caught server-side too, but a restricted event with no audience would be
    // invisible to everyone, so it is worth stopping before the round trip.
    if (visibility === "ORGANIZATION" && !organizationId) {
      setError("Choose an organization, or set visibility back to Open.");
      return;
    }
    if (visibility === "COHORT" && !cohortId) {
      setError("Choose a classroom, or set visibility back to Open.");
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
          visibility,
          organizationId: visibility === "ORGANIZATION" ? organizationId : undefined,
          cohortId: visibility === "COHORT" ? cohortId : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create competition.");
        return;
      }
      const created = await res.json().catch(() => null);
      setName(""); setDescription(""); setStartDate(""); setEndDate(""); setFreezeAt(""); setPrizeDesc(""); setSelectedSlugs([]);
      setOrganizationId(""); setCohortId("");

      // Keep the panel open when a code was generated: it is shown once here,
      // and closing would lose the only convenient copy.
      if (created?.inviteCode) {
        setInviteCode(created.inviteCode as string);
      } else {
        setVisibility("PUBLIC");
        setOpen(false);
      }
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
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Freeze Scoreboard At <span className="text-zinc-700">(optional)</span></label>
          <input
            type="datetime-local" value={freezeAt} onChange={(e) => setFreezeAt(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Prize Description <span className="text-zinc-700">(optional)</span></label>
          <input
            value={prizeDesc} onChange={(e) => setPrizeDesc(e.target.value)}
            className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
            placeholder="Top 3 receive Sage Vault merchandise"
          />
        </div>
      </div>

      <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-4">
        <label className="block text-xs text-zinc-500 mb-1">Who can enter</label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
            >
              <option value="PUBLIC">Open — anyone</option>
              <option value="ORGANIZATION">Organization only</option>
              <option value="COHORT">Classroom only</option>
              <option value="INVITE_ONLY">Invite code only</option>
            </select>
            <p className="mt-1 text-xs text-zinc-600">{VISIBILITY_HELP[visibility]}</p>
          </div>

          {visibility === "ORGANIZATION" && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Organization</label>
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
              >
                <option value="">Select an organization…</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {organizations.length === 0 && (
                <p className="mt-1 text-xs text-amber-400">No organizations exist yet.</p>
              )}
            </div>
          )}

          {visibility === "COHORT" && (
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Classroom</label>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="w-full rounded bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
              >
                <option value="">Select a classroom…</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {cohorts.length === 0 && (
                <p className="mt-1 text-xs text-amber-400">No classrooms exist yet.</p>
              )}
            </div>
          )}
        </div>

        {inviteCode && (
          <div className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
            <p className="text-xs text-zinc-400">
              Invite code — shown once. Share it with the people you want to enter.
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400">{inviteCode}</p>
            <button
              type="button"
              onClick={() => { setInviteCode(null); setVisibility("PUBLIC"); setOpen(false); }}
              className="mt-2 text-xs text-zinc-400 underline hover:text-white"
            >
              Done
            </button>
          </div>
        )}
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
