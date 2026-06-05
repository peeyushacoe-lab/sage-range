"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinInstitutionClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/institution/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Invalid code"); return; }
      router.push("/institution");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter institution code (e.g. A1B2C3D4)"
        maxLength={8}
        className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/60 uppercase tracking-widest"
      />
      <button
        type="submit"
        disabled={loading || code.length < 4}
        className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white disabled:opacity-40 transition"
      >
        {loading ? "Joining…" : "Join Institution"}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
