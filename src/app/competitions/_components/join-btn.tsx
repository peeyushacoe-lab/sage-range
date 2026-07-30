"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinCompetitionBtn({ slug, label = "Join Competition" }: { slug: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function join() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/competitions/${slug}/join`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error === "competition_not_active" ? "Competition is not active." : "Could not join. Try again.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={join}
        disabled={loading}
        className="rounded-lg bg-sage-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
      >
        {loading ? "Joining…" : label}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
