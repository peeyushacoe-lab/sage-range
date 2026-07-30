"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StartHuntButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/daily-hunt/start", { method: "POST" });
      const data = (await res.json()) as { labSlug?: string; error?: string };
      if (!res.ok || !data.labSlug) {
        setError("Couldn't start today's hunt. Try again shortly.");
        setLoading(false);
        return;
      }
      router.push(`/labs/${data.labSlug}`);
    } catch {
      setError("Couldn't start today's hunt. Try again shortly.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void start()}
        className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
      >
        {loading ? "Starting…" : "Start Hunt"}
      </button>
      {error && <p className="text-xs text-red-400 font-mono mt-2">{error}</p>}
    </div>
  );
}
