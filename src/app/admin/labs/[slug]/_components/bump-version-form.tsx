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
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div>
        <label className="text-xs text-zinc-500 block mb-1">What changed in this version?</label>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sage-500/50"
          placeholder="e.g. Updated flag format, added new task stage for pivoting"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !summary.trim()}
        className="text-xs px-4 py-2 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-400 disabled:opacity-50 transition"
      >
        {loading ? "Publishing…" : `Publish v${currentVersion + 1}`}
      </button>
    </form>
  );
}
