"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BumpVersionForm({ slug, currentVersion }: { slug: string; currentVersion: number }) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/labs/${slug}/bump-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      if (!res.ok) {
        setError("Failed to bump version.");
        return;
      }
      setSummary("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-xs text-danger">{error}</p>}
      <div>
        <label className="text-xs text-ink-3 block mb-1">What changed in this version?</label>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full bg-surface-0 border border-edge rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
          placeholder="e.g. Updated flag format, added new task stage for pivoting"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !summary.trim()}
        className="text-xs px-4 py-2 rounded-lg bg-accent-fill text-white font-semibold hover:bg-accent-hover disabled:opacity-50 transition"
      >
        {loading ? "Publishing…" : `Publish v${currentVersion + 1}`}
      </button>
    </form>
  );
}
