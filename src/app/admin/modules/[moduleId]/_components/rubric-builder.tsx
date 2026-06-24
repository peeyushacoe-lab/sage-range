"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Criterion {
  id: string;
  label: string;
  maxScore: number;
  order: number;
}

interface Props {
  assessmentId: string;
  rubricId: string | null;
  criteria: Criterion[];
}

export function RubricBuilder({ assessmentId, rubricId, criteria: initial }: Props) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criterion[]>(initial);
  const [newLabel, setNewLabel] = useState("");
  const [newMax, setNewMax] = useState(10);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addCriterion() {
    const label = newLabel.trim();
    if (!label) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assessment/${assessmentId}/rubric`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, maxScore: newMax }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to add criterion");
        return;
      }
      const d = await res.json();
      setCriteria((prev) => [...prev, { id: d.criterionId, label, maxScore: newMax, order: prev.length }]);
      setNewLabel("");
      setNewMax(10);
      router.refresh();
    } catch {
      setError("Failed to add criterion");
    } finally {
      setAdding(false);
    }
  }

  async function removeCriterion(criterionId: string) {
    setRemovingId(criterionId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assessment/${assessmentId}/rubric?criterionId=${criterionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to remove criterion");
        return;
      }
      setCriteria((prev) => prev.filter((c) => c.id !== criterionId));
      router.refresh();
    } catch {
      setError("Failed to remove criterion");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {rubricId && criteria.length > 0 && (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 bg-white/2">
                <th className="text-left px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider">Criterion</th>
                <th className="text-center px-4 py-2 text-xs text-zinc-500 uppercase tracking-wider">Max Score</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/4">
              {criteria.map((c) => (
                <tr key={c.id} className="hover:bg-white/2 transition">
                  <td className="px-4 py-3 text-zinc-200">{c.label}</td>
                  <td className="px-4 py-3 text-center text-zinc-400">{c.maxScore}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeCriterion(c.id)}
                      disabled={removingId === c.id}
                      className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition"
                    >
                      {removingId === c.id ? "Removing…" : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-zinc-500 block mb-1">New Criterion</label>
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCriterion()}
            placeholder="e.g. Technical Accuracy"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="w-24">
          <label className="text-xs text-zinc-500 block mb-1">Max Score</label>
          <input
            type="number"
            value={newMax}
            min={1}
            max={100}
            onChange={(e) => setNewMax(Math.max(1, parseInt(e.target.value) || 10))}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <button
          onClick={addCriterion}
          disabled={adding || !newLabel.trim()}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
        >
          {adding ? "Adding…" : "+ Add"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">{error}</p>
      )}

      {criteria.length === 0 && !rubricId && (
        <p className="text-xs text-zinc-600">Add at least one criterion to create the rubric.</p>
      )}
    </div>
  );
}
